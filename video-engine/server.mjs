// 영상 스튜디오 로컬 서버
// - 정적 파일 제공 (studio.html 등)
// - POST /api/claude : 대본·주제 생성 (Claude API)
// - POST /api/tts    : 내레이션 생성 (Cartesia, 단어 타임스탬프 포함)
// - POST /api/render : 스튜디오 대본(+음성)을 MP4로 렌더 (헤드리스, 작업 대기열)
// - POST /api/jobs   : 주제 여러 개를 자동 제작 (대본 → 음성 → 검수 → MP4 → 선택: 유튜브 비공개 업로드)
// - GET  /api/jobs   : 작업 상태,  /out/... : 결과 파일
// API 키는 환경 변수(.env 권장) 또는 스튜디오 설정 화면에서 보낸 헤더로 받는다. 기본은 127.0.0.1에서만 열린다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { scanFonts, serveFont, saveFont, scanSystemFonts } from './fonts.mjs';
import { claudeCost, createLedger, loadJobs, saveJobs } from './usage.mjs';
import { PROVIDERS, providerKey, providerStatus } from './tts.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv(path.join(ROOT, '.env'));

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const CARTESIA_VERSION = process.env.CARTESIA_VERSION || '2024-11-13';
const CARTESIA_MODEL = process.env.CARTESIA_MODEL || 'sonic-3';

const OUT = path.join(ROOT, 'out');
const LEDGER = createLedger(OUT);
// 비용 기록에 붙일 꼬리표 (주제·제목). 한글이라 URI 인코딩으로 받는다
const costTag = (req) => { try { return decodeURIComponent(String(req.headers['x-cost-tag'] || '')).slice(0, 80); } catch { return ''; } };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp4': 'video/mp4' };

export function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('요청이 너무 큽니다')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// ── Claude: 대본·주제 생성 ──
async function handleClaude(req, res) {
  const { prompt, system, maxTokens } = await readBody(req);
  const apiKey = process.env.ANTHROPIC_API_KEY || req.headers['x-anthropic-key'];
  if (!apiKey) return send(res, 400, { error: 'Anthropic API 키가 없습니다. .env 또는 설정 화면에서 넣어 주세요.' });
  if (!prompt) return send(res, 400, { error: 'prompt가 비어 있습니다' });
  const client = new Anthropic({ apiKey });
  try {
    const stream = client.beta.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: Math.min(Number(maxTokens) || 32000, 64000),
      // 안전 분류기가 거절하면 서버가 알맞은 모델로 다시 시도한다
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: system || '너는 한국어 유튜브 설명 영상의 대본 작가다. 요청한 형식의 JSON만 출력한다.',
      messages: [{ role: 'user', content: prompt }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') return send(res, 422, { error: '모델이 이 요청을 거절했습니다', details: msg.stop_details || null });
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const cost = claudeCost(msg.model, msg.usage);
    LEDGER.add({ kind: 'claude', tag: costTag(req), model: cost.model, tokens: cost.tokens, usd: cost.usd });
    return send(res, 200, { text, model: msg.model, stop_reason: msg.stop_reason, usage: msg.usage, cost });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return send(res, 401, { error: 'Anthropic API 키가 올바르지 않습니다' });
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: '요청 한도를 넘었습니다. 잠시 후 다시 시도하세요' });
    if (err instanceof Anthropic.APIError) return send(res, err.status || 500, { error: `Claude API 오류 ${err.status}: ${err.message}` });
    return send(res, 500, { error: String(err.message || err) });
  }
}

// ── 내레이션 (TTS 공급자: tts.mjs) ──
async function handleTTS(req, res) {
  const body = await readBody(req);
  const provider = PROVIDERS[body.provider] ? body.provider : 'cartesia';
  const P = PROVIDERS[provider];
  const key = providerKey(provider, req);
  const voiceId = body.voiceId || P.envVoice();
  if (!key) return send(res, 400, { error: `${P.name} API 키가 없습니다. .env 또는 ⚙ 설정에서 넣어 주세요.` });
  if (!voiceId) return send(res, 400, { error: `${P.name} 목소리를 골라 주세요.` });
  if (!body.text) return send(res, 400, { error: 'text가 비어 있습니다' });
  let out;
  try {
    out = await P.synth({ key, voiceId, text: body.text, language: body.language || 'ko', model: body.model || '', version: body.version || '', speed: Number(body.speed) || 1 });
  } catch (e) { return send(res, 502, { error: e.message }); }
  // 과금 단위는 공급자 모두 글자 수 (Cartesia는 글자당 약 1크레딧)
  const chars = [...body.text].length;
  LEDGER.add({ kind: 'tts', tag: costTag(req), provider, model: body.model || '', voice: voiceId, chars });
  return send(res, 200, { audio: out.audio.toString('base64'), mime: out.mime, words: out.words || [], note: out.note || null, cost: { provider, chars, credits: chars } });
}

async function handleVoices(req, res) {
  const provider = new URL(req.url, 'http://x').searchParams.get('provider');
  const P = PROVIDERS[provider];
  if (!P) return send(res, 400, { error: '알 수 없는 TTS 공급자' });
  const key = providerKey(provider, req);
  if (!key && !['openai', 'clova'].includes(provider)) return send(res, 400, { error: `${P.name} API 키가 있어야 목소리 목록을 불러올 수 있습니다` });
  try { return send(res, 200, { voices: await P.voices({ key }) }); }
  catch (e) { return send(res, 502, { error: e.message }); }
}

// ── 정적 파일 ──
function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/studio.html';
  if (rel === '/vendor/p5.min.js') rel = '/node_modules/p5/lib/p5.min.js';
  else if (rel === '/vendor/three.module.min.js') rel = '/node_modules/three/build/three.module.min.js';
  else if (rel.startsWith('/node_modules')) { res.writeHead(403); return res.end(); }
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) || rel.includes('/.')) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}

// ── 작업 대기열: 한 번에 하나씩 헤드리스 브라우저로 처리 ──
const JOBS = loadJobs(OUT);
let running = false;

function publicJob(j) {
  const { settings, payload, ...rest } = j;
  return rest;
}

function keysFrom(req, body) {
  return {
    anthropicKey: req.headers['x-anthropic-key'] || '', cartesiaKey: req.headers['x-cartesia-key'] || '',
    ttsKeys: Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, req.headers[p.header] || ''])),
    cartesiaModel: body.cartesiaModel || '', cartesiaVersion: body.cartesiaVersion || '',
  };
}

async function notify(job) {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return;
  const text = job.status === 'done'
    ? `영상 완성: ${job.title}\n${job.youtube ? job.youtube.url + ' (비공개)' : job.files.mp4}\n검수: ${job.qaSummary || ''}`
    : `영상 제작 실패: ${job.title}\n${job.error}`;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text, job: publicJob(job) }) }); }
  catch (e) { console.warn('알림 전송 실패:', e.message); }
}

async function runQueue(baseUrl) {
  if (running) return;
  running = true;
  const produce = await import('./produce.mjs');
  try {
    let job;
    while ((job = JOBS.find((j) => j.status === 'queued'))) {
      job.status = 'running'; job.startedAt = Date.now();
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const outDir = path.join(OUT, `${stamp}-${produce.slugify(job.title)}`);
      const onProgress = (step, p) => { job.step = step; job.progress = Math.round(p * 100); };
      try {
        const res = job.kind === 'render'
          ? await produce.renderScript({ baseUrl, settings: job.settings, script: job.payload.script, voices: job.payload.voices, outDir, onProgress })
          : await produce.produceTopic({ baseUrl, settings: job.settings, job: job.payload, outDir, onProgress });
        const rel = (f) => '/out/' + path.relative(OUT, f).split(path.sep).join('/');
        job.files = { mp4: rel(res.mp4), sheet: rel(res.sheet), dir: rel(outDir) };
        if (res.qa) {
          const bad = res.qa.filter((r) => r.level === 'fail').length, warn = res.qa.filter((r) => r.level === 'warn').length;
          job.qaSummary = `실패 ${bad} · 경고 ${warn}`;
          job.qa = res.qa;
        }
        job.log = res.log || [];
        if (res.cost) job.cost = res.cost;
        job.duration = res.duration;
        // 숫자 검문에 걸린 영상은 업로드하지 않는다
        const failed = res.qa && res.qa.some((r) => r.level === 'fail');
        if (job.upload && !failed) {
          job.step = 'upload';
          const { uploadVideo } = await import('./youtube.mjs');
          job.youtube = await uploadVideo(res.mp4, res.meta);
        } else if (job.upload && failed) job.log.push('검수 실패 항목이 있어 업로드를 건너뛰었습니다');
        job.status = 'done';
      } catch (e) {
        job.status = 'error'; job.error = String(e.message || e);
      }
      job.step = null; job.finishedAt = Date.now();
      delete job.payload; delete job.settings;
      saveJobs(OUT, JOBS);
      notify(job);
    }
  } finally {
    running = false;
    await produce.closeBrowser().catch(() => {});
  }
}

let BASE_URL = '';
async function handleRender(req, res) {
  const body = await readBody(req, 300_000_000);
  if (!body.script) return send(res, 400, { error: 'script가 없습니다' });
  const job = { id: 'j' + Date.now().toString(36), kind: 'render', title: (body.script.meta && (body.script.meta.title || body.script.meta.topic)) || '영상', status: 'queued', createdAt: Date.now(), settings: keysFrom(req, body), payload: { script: body.script, voices: body.voices || {} } };
  JOBS.push(job); runQueue(BASE_URL);
  send(res, 200, publicJob(job));
}

async function handleJobs(req, res) {
  const body = await readBody(req);
  const topics = (body.topics || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 30);
  if (!topics.length) return send(res, 400, { error: '주제를 한 줄에 하나씩 넣어 주세요' });
  if (body.upload) {
    const { youtubeReady } = await import('./youtube.mjs');
    if (!youtubeReady()) return send(res, 400, { error: '유튜브 업로드 설정이 없습니다. README의 "유튜브 업로드 준비"를 먼저 해 주세요.' });
  }
  const created = topics.map((topic, i) => ({
    id: 'j' + (Date.now() + i).toString(36), kind: 'auto', title: topic, status: 'queued', createdAt: Date.now(), upload: !!body.upload,
    settings: keysFrom(req, body),
    payload: { topic, tone: body.tone || 'stage', length: body.length || 'standard', voiceId: body.voiceId || process.env.CARTESIA_VOICE_ID || '', source: body.source || '', channel: body.channel || '', url: body.url || '', lessons: body.lessons || [], withVoice: body.withVoice !== false, fonts: body.fonts || null, tts: body.tts || null, tts2: body.tts2 || null },
  }));
  JOBS.push(...created); runQueue(BASE_URL);
  send(res, 200, { jobs: created.map(publicJob) });
}

// 다른 웹사이트가 이 로컬 서버로 요청을 몰래 보내 API 키를 쓰지 못하게 막는다
// (Host 검사 = DNS 리바인딩 차단, Origin 검사 = 다른 사이트의 요청 차단, JSON 강제 = 단순 요청 우회 차단)
function allowed(req) {
  const host = String(req.headers.host || '').toLowerCase();
  const okHost = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host) || (process.env.ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean).includes(host);
  if (!okHost) return false;
  const origin = req.headers.origin;
  if (origin && origin !== 'null') {
    try { if (new URL(origin).host.toLowerCase() !== host) return false; } catch { return false; }
  }
  if (req.method === 'POST' && !String(req.headers['content-type'] || '').includes('application/json')) return false;
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    if (!allowed(req)) return send(res, 403, { error: '허용되지 않은 요청입니다' });
    if (req.method === 'GET' && req.url === '/api/status') {
      return send(res, 200, {
        server: true, claudeModel: CLAUDE_MODEL, cartesiaModel: CARTESIA_MODEL, cartesiaVersion: CARTESIA_VERSION,
        claudeKey: !!process.env.ANTHROPIC_API_KEY, cartesiaKey: !!process.env.CARTESIA_API_KEY, voiceId: !!process.env.CARTESIA_VOICE_ID,
        tts: providerStatus(),
        youtube: !!(process.env.YT_CLIENT_ID && process.env.YT_CLIENT_SECRET && process.env.YT_REFRESH_TOKEN),
      });
    }
    if (req.method === 'GET' && req.url === '/api/fonts') return send(res, 200, { fonts: scanFonts(ROOT), system: scanSystemFonts() });
    if (req.method === 'POST' && req.url === '/api/fonts') {
      const b = await readBody(req, 90_000_000);
      try { const name = saveFont(ROOT, b.name, b.data); return send(res, 200, { saved: name, fonts: scanFonts(ROOT) }); }
      catch (e) { return send(res, 400, { error: e.message }); }
    }
    if (req.method === 'GET' && req.url.startsWith('/userfonts/')) return serveFont(ROOT, req, res);
    if (req.method === 'GET' && req.url === '/api/ledger') return send(res, 200, LEDGER.summary());
    if (req.method === 'GET' && req.url === '/api/jobs') return send(res, 200, { jobs: JOBS.map(publicJob).reverse() });
    if (req.method === 'POST' && req.url === '/api/render') return await handleRender(req, res);
    if (req.method === 'POST' && req.url === '/api/jobs') return await handleJobs(req, res);
    if (req.method === 'POST' && req.url === '/api/claude') return await handleClaude(req, res);
    if (req.method === 'POST' && req.url === '/api/tts') return await handleTTS(req, res);
    if (req.method === 'GET' && req.url.startsWith('/api/voices')) return await handleVoices(req, res);
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405); res.end();
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

// 다른 스크립트(pipeline.mjs)에서 불러 쓸 수 있게 시작 함수를 내보낸다
export function startServer({ port = PORT, host = HOST } = {}) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const p = server.address().port;
      BASE_URL = `http://127.0.0.1:${p}`;
      resolve({ server, port: p, baseUrl: BASE_URL, jobs: JOBS, runQueue: () => runQueue(BASE_URL) });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().then(({ port }) => console.log(`영상 스튜디오: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${port}`));
}
