// 영상 스튜디오 로컬 서버
// - 정적 파일 제공 (studio.html 등)
// - POST /api/claude : 대본·주제 생성 (Claude API)
// - POST /api/tts    : 내레이션 생성 (Cartesia, 단어 타임스탬프 포함)
// API 키는 환경 변수(.env 권장) 또는 스튜디오 설정 화면에서 보낸 헤더로 받는다. 기본은 127.0.0.1에서만 열린다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv(path.join(ROOT, '.env'));

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const CARTESIA_URL = process.env.CARTESIA_BASE_URL || 'https://api.cartesia.ai';
const CARTESIA_VERSION = process.env.CARTESIA_VERSION || '2024-11-13';
const CARTESIA_MODEL = process.env.CARTESIA_MODEL || 'sonic-3';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };

function loadDotEnv(file) {
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
    return send(res, 200, { text, model: msg.model, stop_reason: msg.stop_reason, usage: msg.usage });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return send(res, 401, { error: 'Anthropic API 키가 올바르지 않습니다' });
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: '요청 한도를 넘었습니다. 잠시 후 다시 시도하세요' });
    if (err instanceof Anthropic.APIError) return send(res, err.status || 500, { error: `Claude API 오류 ${err.status}: ${err.message}` });
    return send(res, 500, { error: String(err.message || err) });
  }
}

// ── Cartesia: 내레이션 ──
function cartesiaHeaders(key, version) {
  return { 'Content-Type': 'application/json', 'X-API-Key': key, Authorization: `Bearer ${key}`, 'Cartesia-Version': version };
}

function wavFromFloat32(samples, sampleRate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

async function ttsSSE({ key, version, model, voiceId, text, language }) {
  const sampleRate = 44100;
  const r = await fetch(`${CARTESIA_URL}/tts/sse`, {
    method: 'POST',
    headers: cartesiaHeaders(key, version),
    body: JSON.stringify({
      model_id: model, transcript: text, voice: { mode: 'id', id: voiceId }, language,
      output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: sampleRate },
      add_timestamps: true,
    }),
  });
  if (!r.ok) throw new Error(`Cartesia SSE ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const pcm = []; const words = [];
  let pending = '';
  const handle = (block) => {
    const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
    if (!data) return;
    let ev; try { ev = JSON.parse(data); } catch { return; }
    if (ev.type === 'error' || ev.error) throw new Error(`Cartesia: ${ev.error || ev.message || 'error'}`);
    if (ev.type === 'chunk' && ev.data) pcm.push(Buffer.from(ev.data, 'base64'));
    const wt = ev.word_timestamps;
    if (wt && wt.words) wt.words.forEach((w, i) => words.push({ w, start: wt.start[i], end: wt.end[i] }));
  };
  const decoder = new TextDecoder();
  for await (const chunk of r.body) {
    pending += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = pending.search(/\r?\n\r?\n/)) >= 0) {
      handle(pending.slice(0, idx));
      pending = pending.slice(idx).replace(/^\r?\n\r?\n/, '');
    }
  }
  if (pending.trim()) handle(pending);
  const raw = Buffer.concat(pcm);
  const f32 = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  if (!f32.length) throw new Error('Cartesia SSE에서 오디오를 받지 못했습니다');
  return { wav: wavFromFloat32(f32, sampleRate), words, duration: f32.length / sampleRate };
}

async function ttsBytes({ key, version, model, voiceId, text, language }) {
  const r = await fetch(`${CARTESIA_URL}/tts/bytes`, {
    method: 'POST',
    headers: cartesiaHeaders(key, version),
    body: JSON.stringify({
      model_id: model, transcript: text, voice: { mode: 'id', id: voiceId }, language,
      output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 44100 },
    }),
  });
  if (!r.ok) throw new Error(`Cartesia bytes ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return { wav: Buffer.from(await r.arrayBuffer()), words: [], duration: null };
}

async function handleTTS(req, res) {
  const body = await readBody(req);
  const key = process.env.CARTESIA_API_KEY || req.headers['x-cartesia-key'];
  const voiceId = body.voiceId || process.env.CARTESIA_VOICE_ID;
  if (!key) return send(res, 400, { error: 'Cartesia API 키가 없습니다. .env 또는 설정 화면에서 넣어 주세요.' });
  if (!voiceId) return send(res, 400, { error: 'Cartesia 목소리 ID가 없습니다 (play.cartesia.ai → My Voices → 목소리 ID 복사)' });
  if (!body.text) return send(res, 400, { error: 'text가 비어 있습니다' });
  const opts = {
    key, voiceId, text: body.text, language: body.language || 'ko',
    version: body.version || CARTESIA_VERSION, model: body.model || CARTESIA_MODEL,
  };
  let out, note = null;
  try {
    out = await ttsSSE(opts);
  } catch (e1) {
    // 타임스탬프 경로가 실패하면 단어 시간 없이 WAV만 받는다 (자막은 글자 수 비례로 맞춤)
    try { out = await ttsBytes(opts); note = `타임스탬프 없이 생성됨: ${e1.message}`; }
    catch (e2) { return send(res, 502, { error: e2.message, first: e1.message }); }
  }
  return send(res, 200, { audio: out.wav.toString('base64'), words: out.words, duration: out.duration, note });
}

// ── 정적 파일 ──
function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/studio.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || rel.includes('/.') || rel.startsWith('/node_modules')) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/status') {
      return send(res, 200, {
        server: true, claudeModel: CLAUDE_MODEL, cartesiaModel: CARTESIA_MODEL, cartesiaVersion: CARTESIA_VERSION,
        claudeKey: !!process.env.ANTHROPIC_API_KEY, cartesiaKey: !!process.env.CARTESIA_API_KEY, voiceId: !!process.env.CARTESIA_VOICE_ID,
      });
    }
    if (req.method === 'POST' && req.url === '/api/claude') return await handleClaude(req, res);
    if (req.method === 'POST' && req.url === '/api/tts') return await handleTTS(req, res);
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405); res.end();
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => console.log(`영상 스튜디오: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`));
