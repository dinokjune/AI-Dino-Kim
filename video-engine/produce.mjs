// 헤드리스 제작기: 스튜디오 페이지를 화면 없이 열어 대본·음성·검수를 돌리고, 프레임을 하나씩 그려 ffmpeg로 MP4를 만든다.
// 서버의 작업 대기열(server.mjs)과 예약 실행 CLI(pipeline.mjs)가 함께 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      let pw;
      try { pw = await import('playwright'); }
      catch { throw new Error('playwright가 설치되어 있지 않습니다. video-engine 폴더에서 "npm install" 후 "npx playwright install chromium"을 실행하세요.'); }
      return pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    })();
    browserPromise.catch(() => { browserPromise = null; });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  if (b) await b.close();
}

// 스튜디오 페이지 하나를 열고 fn(page)를 실행한다. settings는 브라우저 저장소에 들어가 API 키 헤더로 쓰인다.
export async function withStudioPage(baseUrl, settings, fn) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((s) => { try { localStorage.setItem('studio.settings', JSON.stringify(s || {})); } catch (e) {} }, settings || {});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(`${baseUrl}/studio.html?headless=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof renderAt === 'function' && typeof TL !== 'undefined' && TL.length > 0, null, { timeout: 30000 });
    return await fn(page);
  } catch (e) {
    if (errors.length) e.message += ` (페이지 오류: ${errors.slice(0, 3).join(' / ')})`;
    throw e;
  } finally {
    await ctx.close();
  }
}

async function waitFonts(page) {
  await page.evaluate(async () => {
    if (typeof loadUserFonts === 'function') await loadUserFonts();
    const fams = [FONT_HEAD, FONT_BODY, 'Nanum Gothic Coding', 'Noto Sans KR'];
    await Promise.all(fams.map((f) => document.fonts.load(`64px "${f}"`).catch(() => null)));
    await document.fonts.ready;
  });
}

function runFfmpeg(args) {
  const proc = spawn(FFMPEG, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  proc.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
  const done = new Promise((resolve, reject) => {
    proc.on('error', (e) => reject(e.code === 'ENOENT' ? new Error('ffmpeg를 찾을 수 없습니다. ffmpeg를 설치하거나 .env에 FFMPEG_PATH를 지정하세요.') : e));
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg 종료 코드 ${code}: ${err.split('\n').slice(-4).join(' ')}`))));
  });
  return { proc, done };
}

// 현재 페이지에 로드된 대본을 MP4로 만든다. 결과 파일 경로들을 돌려준다.
export async function renderToFiles(page, outDir, { fps = 30, quality = 0.9, bgm = true, onProgress } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  await waitFonts(page);
  const total = await page.evaluate(() => TOTAL);
  const frames = Math.ceil(total * fps);

  onProgress && onProgress('audio', 0);
  const wavB64 = await page.evaluate((b) => renderAudioOffline(44100, b), bgm);
  const wavPath = path.join(outDir, 'audio.wav');
  fs.writeFileSync(wavPath, Buffer.from(wavB64, 'base64'));

  const mp4Path = path.join(outDir, 'video.mp4');
  const { proc, done } = runFfmpeg([
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', wavPath,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
    mp4Path,
  ]);
  let pipeErr = null;
  proc.stdin.on('error', (e) => { pipeErr = e; });
  const write = (buf) => new Promise((resolve, reject) => {
    if (pipeErr) return reject(pipeErr);
    if (!proc.stdin.write(buf)) proc.stdin.once('drain', resolve); else resolve();
  });
  const BATCH = 12;
  try {
    for (let f = 0; f < frames; f += BATCH) {
      const imgs = await page.evaluate(([s, c, r, q]) => renderFrames(s, c, r, q), [f, BATCH, fps, quality]);
      for (const b64 of imgs) await write(Buffer.from(b64, 'base64'));
      onProgress && onProgress('frames', Math.min(1, (f + BATCH) / frames));
    }
  } finally {
    proc.stdin.end();
  }
  await done;

  const sheet = await page.evaluate(() => { const g = buildContactSheet(); const u = g.elt.toDataURL('image/png'); g.remove(); return u; });
  const sheetPath = path.join(outDir, 'contact-sheet.png');
  fs.writeFileSync(sheetPath, Buffer.from(sheet.split(',')[1], 'base64'));
  const meta = await page.evaluate(() => youtubeMeta());
  fs.writeFileSync(path.join(outDir, 'youtube.json'), JSON.stringify(meta, null, 2));
  return { mp4: mp4Path, wav: wavPath, sheet: sheetPath, meta, duration: total, frames };
}

// 스튜디오에서 만든 대본(+음성)을 그대로 렌더
export async function renderScript({ baseUrl, settings, script, voices, outDir, onProgress }) {
  return withStudioPage(baseUrl, settings, async (page) => {
    await page.evaluate(async ({ script, voices }) => { await importVoices(voices); loadScript(script); }, { script, voices });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'script.json'), JSON.stringify(script, null, 2));
    return renderToFiles(page, outDir, { onProgress });
  });
}

// 주제 하나를 처음부터 끝까지: 대본 → 음성 → 검수 → MP4
export async function produceTopic({ baseUrl, settings, job, outDir, onProgress }) {
  return withStudioPage(baseUrl, settings, async (page) => {
    onProgress && onProgress('script', 0);
    const res = await page.evaluate((j) => autopilot(j).then((r) => ({ script: r.script, qa: r.qa, log: r.log, cost: r.cost, voices: exportVoices() })), job);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'script.json'), JSON.stringify(res.script, null, 2));
    fs.writeFileSync(path.join(outDir, 'qa.json'), JSON.stringify(res.qa, null, 2));
    const files = await renderToFiles(page, outDir, { onProgress });
    return { ...files, qa: res.qa, log: res.log, script: res.script, cost: res.cost };
  });
}

// 주제 → 폴더 이름
export function slugify(s) {
  return (String(s).replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40)) || 'video';
}
