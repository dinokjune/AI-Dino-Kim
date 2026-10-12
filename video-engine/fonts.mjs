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
    fonts.push({ id, family, url: `/userfonts/${id}${ext}`, source: label, size });
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
