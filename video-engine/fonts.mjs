// 내 글꼴 찾기: video-engine/fonts 폴더와 내 컴퓨터의 다운로드 폴더에서 글꼴 파일을 찾는다.
// .ttf .otf .woff .woff2 파일과, 글꼴을 zip으로 받은 경우 zip 안의 글꼴까지 읽는다.
// 다른 폴더를 쓰려면 .env 에 FONTS_DIR=경로1;경로2 (맥·리눅스는 :로 구분)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const FONT_RE = /\.(ttf|otf|woff2?)$/i;
const MIME = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const MAX_FONT = 60 * 1024 * 1024;

export function fontDirs(root) {
  const dirs = [path.join(root, 'fonts')];
  if (process.env.FONTS_DIR) dirs.push(...process.env.FONTS_DIR.split(path.delimiter).map((d) => d.trim()).filter(Boolean));
  else dirs.push(path.join(os.homedir(), 'Downloads'));
  return Array.from(new Set(dirs.map((d) => path.resolve(d))));
}

// ── zip 읽기 (압축 안 함·deflate만, 암호·zip64 제외) ──
const zipCache = new Map();
function zipEntries(file) {
  const st = fs.statSync(file);
  const c = zipCache.get(file);
  if (c && c.mtime === st.mtimeMs) return c.entries;
  const fd = fs.openSync(file, 'r');
  try {
    const tailLen = Math.min(st.size, 65557);
    const tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, st.size - tailLen);
    let eocd = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return [];
    const count = tail.readUInt16LE(eocd + 10), cdSize = tail.readUInt32LE(eocd + 12), cdOff = tail.readUInt32LE(eocd + 16);
    if (cdOff + cdSize > st.size) return [];
    const cd = Buffer.alloc(cdSize);
    fs.readSync(fd, cd, 0, cdSize, cdOff);
    const out = [];
    let p = 0;
    for (let n = 0; n < count && p + 46 <= cd.length; n++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) break;
      const flags = cd.readUInt16LE(p + 8), method = cd.readUInt16LE(p + 10);
      const csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24);
      const nlen = cd.readUInt16LE(p + 28), elen = cd.readUInt16LE(p + 30), clen = cd.readUInt16LE(p + 32);
      const local = cd.readUInt32LE(p + 42);
      const raw = cd.subarray(p + 46, p + 46 + nlen);
      // 한국어 윈도우에서 만든 zip은 파일 이름이 CP949(EUC-KR)인 경우가 많다
      let name;
      try { name = new TextDecoder(flags & 0x800 ? 'utf-8' : 'euc-kr', { fatal: true }).decode(raw); }
      catch { name = new TextDecoder('utf-8').decode(raw); }
      if (FONT_RE.test(name) && !(flags & 1) && (method === 0 || method === 8) && usize < MAX_FONT && !name.includes('__MACOSX')) {
        out.push({ name, method, csize, usize, local });
      }
      p += 46 + nlen + elen + clen;
    }
    zipCache.set(file, { mtime: st.mtimeMs, entries: out });
    return out;
  } finally { fs.closeSync(fd); }
}

function readZipEntry(file, e) {
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(30);
    fs.readSync(fd, head, 0, 30, e.local);
    if (head.readUInt32LE(0) !== 0x04034b50) throw new Error('zip 형식 오류');
    const start = e.local + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
    const data = Buffer.alloc(e.csize);
    fs.readSync(fd, data, 0, e.csize, start);
    return e.method === 0 ? data : zlib.inflateRawSync(data);
  } finally { fs.closeSync(fd); }
}

// ── 글꼴 파일 해석: 이름(name 표)과 한글 지원 여부(cmap 표) ──
const infoCache = new Map();
function readAt(fd, pos, len) { const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, pos); return b; }

export function fontInfo(file) {
  let st; try { st = fs.statSync(file); } catch { return null; }
  const c = infoCache.get(file);
  if (c && c.mtime === st.mtimeMs) return c.info;
  let info = null;
  const fd = fs.openSync(file, 'r');
  try {
    let base = 0;
    const head = readAt(fd, 0, 12);
    const tag = head.toString('latin1', 0, 4);
    if (tag === 'ttcf') base = readAt(fd, 12, 4).readUInt32BE(0); // 글꼴 모음은 첫 글꼴만 본다
    else if (tag === 'wOFF' || tag === 'wOF2') throw new Error('압축 글꼴');
    const dir = readAt(fd, base, 12);
    const n = dir.readUInt16BE(4);
    const recs = readAt(fd, base + 12, n * 16);
    const tables = {};
    for (let i = 0; i < n; i++) tables[recs.toString('latin1', i * 16, i * 16 + 4)] = { off: recs.readUInt32BE(i * 16 + 8), len: recs.readUInt32BE(i * 16 + 12) };
    const names = {};
    if (tables.name && tables.name.len < 2_000_000) {
      const t = readAt(fd, tables.name.off, tables.name.len);
      const count = t.readUInt16BE(2), strOff = t.readUInt16BE(4);
      for (let i = 0; i < count; i++) {
        const r = 6 + i * 12;
        const pid = t.readUInt16BE(r), lang = t.readUInt16BE(r + 4), nid = t.readUInt16BE(r + 6), len = t.readUInt16BE(r + 8), off = t.readUInt16BE(r + 10);
        if (![1, 2, 4, 16].includes(nid) || pid !== 3) continue;
        const raw = t.subarray(strOff + off, strOff + off + len);
        const str = Buffer.from(raw).swap16().toString('utf16le');
        const key = `${nid}:${lang === 0x0412 ? 'ko' : lang === 0x0409 ? 'en' : 'x'}`;
        if (!names[key]) names[key] = str;
      }
    }
    let hangul = false;
    if (tables.cmap && tables.cmap.len < 20_000_000) {
      const t = readAt(fd, tables.cmap.off, tables.cmap.len);
      const num = t.readUInt16BE(2);
      const CP = 0xac00; // '가'
      for (let i = 0; i < num && !hangul; i++) {
        const pid = t.readUInt16BE(4 + i * 8), eid = t.readUInt16BE(6 + i * 8), off = t.readUInt32BE(8 + i * 8);
        if (!(pid === 0 || (pid === 3 && (eid === 1 || eid === 10)))) continue;
        const fmt = t.readUInt16BE(off);
        if (fmt === 4) {
          const segX2 = t.readUInt16BE(off + 6), ends = off + 14, starts = ends + segX2 + 2;
          for (let k = 0; k < segX2 / 2; k++) if (t.readUInt16BE(ends + k * 2) >= CP) { hangul = t.readUInt16BE(starts + k * 2) <= CP; break; }
        } else if (fmt === 12) {
          const groups = t.readUInt32BE(off + 12);
          for (let k = 0; k < groups; k++) { const g = off + 16 + k * 12; if (t.readUInt32BE(g) <= CP && t.readUInt32BE(g + 4) >= CP) { hangul = true; break; } }
        }
      }
    }
    const family = names['16:en'] || names['1:en'] || names['16:x'] || names['1:x'] || '';
    const display = names['4:ko'] || names['16:ko'] || names['1:ko'] || names['4:en'] || family;
    const style = names['2:en'] || '';
    info = { family, display, style, hangul };
  } catch { info = null; } finally { fs.closeSync(fd); }
  infoCache.set(file, { mtime: st.mtimeMs, info });
  return info;
}

// 운영체제에 설치된 글꼴 폴더
function systemFontDirs() {
  if (process.env.SYSTEM_FONTS === '0') return [];
  const h = os.homedir();
  if (process.platform === 'win32') return [path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts'), path.join(process.env.LOCALAPPDATA || path.join(h, 'AppData', 'Local'), 'Microsoft', 'Windows', 'Fonts')];
  if (process.platform === 'darwin') return ['/Library/Fonts', path.join(h, 'Library', 'Fonts'), '/System/Library/Fonts', '/System/Library/Fonts/Supplemental'];
  return ['/usr/share/fonts', '/usr/local/share/fonts', path.join(h, '.local', 'share', 'fonts'), path.join(h, '.fonts')];
}

// 설치된 글꼴은 운영체제가 이미 알고 있으므로 파일을 보내지 않고 글꼴 이름으로 바로 쓴다 (브라우저·헤드리스 렌더 모두)
export function scanSystemFonts() {
  const out = new Map();
  const visit = (dir, depth) => {
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isDirectory() && depth < 3) visit(full, depth + 1);
      else if (it.isFile() && /\.(ttf|otf|ttc)$/i.test(it.name)) {
        const info = fontInfo(full);
        if (!info || !info.family || out.has(info.family)) continue;
        out.set(info.family, { family: info.family, display: info.display || info.family, hangul: info.hangul, source: '설치된 글꼴', system: true });
      }
    }
  };
  systemFontDirs().forEach((d) => visit(d, 0));
  return [...out.values()].sort((a, b) => (b.hangul - a.hangul) || a.display.localeCompare(b.display, 'ko'));
}

// ── 글꼴 목록 ──
const INDEX = new Map(); // id → { file, entry, ext }

function familyName(fileName) {
  return path.basename(fileName).replace(FONT_RE, '').replace(/[^\p{L}\p{N} _-]+/gu, ' ').trim() || 'MyFont';
}

export function scanFonts(root) {
  const fonts = [];
  const seen = new Set();
  const add = (file, entry, label, size) => {
    const id = crypto.createHash('sha1').update(file + '|' + (entry ? entry.name : '')).digest('hex').slice(0, 12);
    let family = familyName(entry ? entry.name : file);
    while (seen.has(family)) family += ' 2';
    seen.add(family);
    const ext = path.extname(entry ? entry.name : file).toLowerCase();
    INDEX.set(id, { file, entry, ext });
    const info = entry ? null : fontInfo(file);
    fonts.push({ id, family, display: (info && info.display) || family, hangul: info ? info.hangul : null, url: `/userfonts/${id}${ext}`, source: label, size });
  };
  const visit = (dir, label, depth) => {
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const it of items) {
      if (it.name.startsWith('.')) continue;
      const full = path.join(dir, it.name);
      try {
        if (it.isDirectory() && depth < 2) visit(full, label, depth + 1); // 압축 푼 글꼴 폴더까지
        else if (it.isFile() && FONT_RE.test(it.name)) { const sz = fs.statSync(full).size; if (sz < MAX_FONT) add(full, null, label, sz); }
        else if (it.isFile() && /\.zip$/i.test(it.name)) zipEntries(full).forEach((e) => add(full, e, `${label} · ${it.name}`, e.usize));
      } catch { /* 읽을 수 없는 파일은 건너뛴다 */ }
    }
  };
  for (const dir of fontDirs(root)) {
    const label = dir === path.join(root, 'fonts') ? 'fonts 폴더' : dir === path.join(os.homedir(), 'Downloads') ? '다운로드' : dir;
    visit(dir, label, 0);
  }
  return fonts;
}

// GET /userfonts/<id>.<ext>
export function serveFont(root, req, res) {
  const id = (req.url.split('/')[2] || '').replace(/\.[a-z0-9]+$/i, '');
  if (!INDEX.has(id)) scanFonts(root);
  const f = INDEX.get(id);
  if (!f) { res.writeHead(404); return res.end(); }
  try {
    const data = f.entry ? readZipEntry(f.file, f.entry) : fs.readFileSync(f.file);
    res.writeHead(200, { 'Content-Type': MIME[f.ext] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'max-age=3600' });
    res.end(data);
  } catch (e) { res.writeHead(500); res.end(String(e.message)); }
}

// 스튜디오에서 올린 글꼴 파일을 fonts 폴더에 저장
export function saveFont(root, name, base64) {
  const clean = path.basename(String(name || '')).replace(/[\\/:*?"<>|]+/g, '_');
  if (!FONT_RE.test(clean)) throw new Error('글꼴 파일(.ttf .otf .woff .woff2)만 올릴 수 있습니다');
  const buf = Buffer.from(String(base64 || ''), 'base64');
  if (!buf.length || buf.length > MAX_FONT) throw new Error('파일 크기가 올바르지 않습니다');
  const dir = path.join(root, 'fonts');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, clean), buf);
  return clean;
}
