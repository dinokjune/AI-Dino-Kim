import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// TTS 공급자 모음: 경제음성(내 PC 로컬) · Cartesia · ElevenLabs · OpenAI · Google Cloud · 네이버 클로바 보이스
// 모두 같은 형태로 돌려준다: { audio: Buffer, mime, words: [{w,start,end}], note }
// words(단어 시간표)는 Cartesia·ElevenLabs만 있고, 나머지는 자막을 글자 수 비례로 맞춘다.
// 각 서비스의 주소는 시험용으로 <공급자>_BASE_URL 환경 변수로 바꿀 수 있다.

const env = (k, d) => process.env[k] || d;

function wavFromFloat32(samples, sampleRate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

async function fail(r, label) {
  const t = await r.text().catch(() => '');
  throw new Error(`${label} ${r.status}: ${t.slice(0, 300)}`);
}

// ── Cartesia ──
const CARTESIA = () => env('CARTESIA_BASE_URL', 'https://api.cartesia.ai');
const cartesiaHeaders = (key, version) => ({ 'Content-Type': 'application/json', 'X-API-Key': key, Authorization: `Bearer ${key}`, 'Cartesia-Version': version });

async function cartesiaSynth({ key, voiceId, text, language, model, version }) {
  model = model || env('CARTESIA_MODEL', 'sonic-3');
  version = version || env('CARTESIA_VERSION', '2024-11-13');
  const body = { model_id: model, transcript: text, voice: { mode: 'id', id: voiceId }, language };
  try {
    const sr = 44100;
    const r = await fetch(`${CARTESIA()}/tts/sse`, {
      method: 'POST', headers: cartesiaHeaders(key, version),
      body: JSON.stringify({ ...body, output_format: { container: 'raw', encoding: 'pcm_f32le', sample_rate: sr }, add_timestamps: true }),
    });
    if (!r.ok) await fail(r, 'Cartesia SSE');
    const pcm = [], words = [];
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
    const dec = new TextDecoder();
    for await (const chunk of r.body) {
      pending += dec.decode(chunk, { stream: true });
      let idx;
      while ((idx = pending.search(/\r?\n\r?\n/)) >= 0) { handle(pending.slice(0, idx)); pending = pending.slice(idx).replace(/^\r?\n\r?\n/, ''); }
    }
    if (pending.trim()) handle(pending);
    const raw = Buffer.concat(pcm);
    const f32 = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
    if (!f32.length) throw new Error('Cartesia SSE에서 오디오를 받지 못했습니다');
    return { audio: wavFromFloat32(f32, sr), mime: 'audio/wav', words };
  } catch (e1) {
    // 타임스탬프 경로가 실패하면 WAV만 받는다
    const r = await fetch(`${CARTESIA()}/tts/bytes`, {
      method: 'POST', headers: cartesiaHeaders(key, version),
      body: JSON.stringify({ ...body, output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 44100 } }),
    });
    if (!r.ok) await fail(r, `Cartesia (SSE 실패: ${e1.message}) bytes`);
    return { audio: Buffer.from(await r.arrayBuffer()), mime: 'audio/wav', words: [], note: `타임스탬프 없이 생성됨: ${e1.message}` };
  }
}

async function cartesiaVoices({ key, version }) {
  const r = await fetch(`${CARTESIA()}/voices?limit=100`, { headers: cartesiaHeaders(key, version || env('CARTESIA_VERSION', '2024-11-13')) });
  if (!r.ok) await fail(r, 'Cartesia 목소리 목록');
  const j = await r.json();
  const list = Array.isArray(j) ? j : j.data || j.voices || [];
  return list.map((v) => ({ id: v.id, name: v.name, lang: v.language || '', mine: !!(v.is_owner || v.is_public === false) }))
    .sort((a, b) => (b.mine - a.mine) || (a.lang === 'ko' ? -1 : 0));
}

// ── ElevenLabs (글자별 시간표 → 단어 시간표) ──
const ELEVEN = () => env('ELEVENLABS_BASE_URL', 'https://api.elevenlabs.io');

async function elevenSynth({ key, voiceId, text, model, speed }) {
  const body = { text, model_id: model || env('ELEVENLABS_MODEL', 'eleven_multilingual_v2') };
  if (speed && speed !== 1) body.voice_settings = { speed };
  const r = await fetch(`${ELEVEN()}/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'xi-api-key': key }, body: JSON.stringify(body),
  });
  if (!r.ok) await fail(r, 'ElevenLabs');
  const j = await r.json();
  const al = j.alignment || j.normalized_alignment;
  const words = [];
  if (al && al.characters) {
    let cur = null;
    al.characters.forEach((ch, i) => {
      if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
      if (!cur) cur = { w: '', start: al.character_start_times_seconds[i], end: al.character_end_times_seconds[i] };
      cur.w += ch; cur.end = al.character_end_times_seconds[i];
    });
    if (cur) words.push(cur);
  }
  return { audio: Buffer.from(j.audio_base64, 'base64'), mime: 'audio/mpeg', words };
}

async function elevenVoices({ key }) {
  const r = await fetch(`${ELEVEN()}/v1/voices`, { headers: { 'xi-api-key': key } });
  if (!r.ok) await fail(r, 'ElevenLabs 목소리 목록');
  const j = await r.json();
  return (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, lang: (v.labels && (v.labels.language || v.labels.accent)) || '', mine: v.category === 'cloned' || v.category === 'professional' }))
    .sort((a, b) => b.mine - a.mine);
}

// ── OpenAI ──
const OPENAI = () => env('OPENAI_BASE_URL', 'https://api.openai.com');
const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

async function openaiSynth({ key, voiceId, text, model, speed }) {
  const body = { model: model || env('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts'), voice: voiceId || 'alloy', input: text, response_format: 'wav' };
  if (speed && speed !== 1) body.speed = speed;
  const r = await fetch(`${OPENAI()}/v1/audio/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  if (!r.ok) await fail(r, 'OpenAI TTS');
  return { audio: Buffer.from(await r.arrayBuffer()), mime: 'audio/wav', words: [] };
}

// ── Google Cloud Text-to-Speech ──
// 인증 두 가지: API 키, 또는 API 키 없이 gcloud CLI 로그인(내 Google 계정). 키가 없으면 gcloud 를 쓴다.
const GOOGLE = () => env('GOOGLE_TTS_BASE_URL', 'https://texttospeech.googleapis.com');
const IS_WIN = process.platform === 'win32';
let gcloudCache = { token: null, project: null, at: 0, error: null };

function gcloudRun(args) {
  const r = spawnSync(env('GCLOUD_BIN', 'gcloud'), args, { encoding: 'utf8', shell: IS_WIN, timeout: 30000 });
  if (r.error || r.status !== 0) throw new Error((r.stderr || (r.error && r.error.message) || '').trim().split('\n').slice(-2).join(' ') || 'gcloud 실행 실패');
  return (r.stdout || '').trim();
}

// gcloud 로그인 토큰 (40분 캐시). 사용자 로그인 → 실패하면 애플리케이션 기본 사용자 인증 순서로 시도
export function gcloudAuth(force = false) {
  // 성공한 토큰은 40분, 실패는 2분 동안 다시 묻지 않는다 (상태 확인 때마다 gcloud 를 띄우지 않게)
  if (!force && gcloudCache.at && Date.now() - gcloudCache.at < (gcloudCache.token ? 40 : 2) * 60 * 1000) return gcloudCache;
  try {
    let token;
    try { token = gcloudRun(['auth', 'print-access-token']); }
    catch { token = gcloudRun(['auth', 'application-default', 'print-access-token']); }
    let project = env('GOOGLE_CLOUD_PROJECT', '');
    if (!project) { try { project = gcloudRun(['config', 'get-value', 'project']); } catch { project = ''; } }
    gcloudCache = { token, project: project && project !== '(unset)' ? project : '', at: Date.now(), error: null };
  } catch (e) {
    gcloudCache = { token: null, project: null, at: Date.now(), error: `gcloud 로그인이 필요합니다 (gcloud auth login): ${e.message}` };
  }
  return gcloudCache;
}

export async function gcloudStatus() {
  if (env('GOOGLE_TTS_API_KEY')) return { mode: 'apikey' };
  const g = gcloudAuth();
  return g.token ? { mode: 'gcloud', project: g.project || '' } : { mode: 'none', error: g.error };
}

function googleAuthHeaders(key) {
  if (key && key !== 'gcloud') return { url: `key=${encodeURIComponent(key)}`, headers: {} };
  const g = gcloudAuth();
  if (!g.token) throw new Error(g.error || 'Google 인증 정보가 없습니다');
  const headers = { Authorization: `Bearer ${g.token}` };
  if (g.project) headers['x-goog-user-project'] = g.project; // 사용자 로그인일 때 요금·할당량을 계산할 프로젝트
  return { url: '', headers };
}

async function googleSynth({ key, voiceId, text, speed, language }) {
  const name = voiceId || 'ko-KR-Neural2-A';
  const audioConfig = { audioEncoding: 'LINEAR16', sampleRateHertz: 44100 };
  if (speed && speed !== 1) audioConfig.speakingRate = speed;
  const auth = googleAuthHeaders(key);
  const r = await fetch(`${GOOGLE()}/v1/text:synthesize${auth.url ? '?' + auth.url : ''}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...auth.headers },
    body: JSON.stringify({ input: { text }, voice: { languageCode: name.split('-').slice(0, 2).join('-') || (language === 'ko' ? 'ko-KR' : language), name }, audioConfig }),
  });
  if (!r.ok) await fail(r, 'Google TTS');
  const j = await r.json();
  return { audio: Buffer.from(j.audioContent || '', 'base64'), mime: 'audio/wav', words: [] };
}

async function googleVoices({ key }) {
  const auth = googleAuthHeaders(key);
  const r = await fetch(`${GOOGLE()}/v1/voices?languageCode=ko-KR${auth.url ? '&' + auth.url : ''}`, { headers: auth.headers });
  if (!r.ok) await fail(r, 'Google 목소리 목록');
  const j = await r.json();
  return (j.voices || []).map((v) => ({ id: v.name, name: `${v.name} (${v.ssmlGender === 'FEMALE' ? '여' : v.ssmlGender === 'MALE' ? '남' : '중립'})`, lang: 'ko' }));
}

// ── 네이버 클로바 보이스 (Premium) ──
const CLOVA = () => env('CLOVA_BASE_URL', 'https://naveropenapi.apigw.ntruss.com');
const CLOVA_VOICES = [
  ['nara', '아라 (여)'], ['nminsang', '민상 (남)'], ['njinho', '진호 (남)'], ['njiyun', '지윤 (여)'], ['nsujin', '수진 (여)'],
  ['ndain', '다인 (여)'], ['nsinu', '신우 (남)'], ['njihun', '지훈 (남)'], ['vara', '아라 감정 (여)'], ['vmikyung', '미경 감정 (여)'],
  ['vdain', '다인 감정 (여)'], ['vyuna', '유나 감정 (여)'], ['vgoeun', '고은 감정 (여)'], ['vdaeseong', '대성 감정 (남)'],
];

async function clovaSynth({ key, voiceId, text, speed }) {
  const [id, secret] = String(key).split('|');
  // 클로바 speed: -5(빠름)~5(느림), 0 = 보통
  const sp = Math.max(-5, Math.min(5, Math.round((1 - (speed || 1)) * 10)));
  const form = new URLSearchParams({ speaker: voiceId || 'nara', text: text.slice(0, 2000), volume: '0', speed: String(sp), pitch: '0', format: 'wav', 'sampling-rate': '24000' });
  const r = await fetch(`${CLOVA()}/tts-premium/v1/tts`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret || '' }, body: form,
  });
  if (!r.ok) await fail(r, 'CLOVA Voice');
  return { audio: Buffer.from(await r.arrayBuffer()), mime: 'audio/wav', words: [] };
}

// ── 경제음성: 내 PC의 로컬 Qwen3-TTS 클론 목소리 (economic-voice 스킬과 같은 방법) ──
// myvoice.cmd say --voice kkwabaegi --text-file 원고.txt --out 결과.wav
// 출력: 결과.wav, 결과_parts/001.wav …, 결과.timing.json ([{index,text,start,end,file}]). 유료 API를 쓰지 않는다.
// 속도(README, RTX 3060): 모델 로딩 약 2분 + 음성 1초에 약 6초 → 장면을 모아 한 번에 부른다.
const MYVOICE = () => env('MYVOICE_CMD', 'D:/Claude/Projects/my-voice-clone/myvoice.cmd');
const localReady = () => { try { return fs.existsSync(MYVOICE()); } catch { return false; } };
let localChain = Promise.resolve(); // GPU 모델을 한 번에 하나만 돌리도록 차례로 실행

function runMyVoice(args, timeoutMs, onLine) {
  return new Promise((resolve, reject) => {
    const bin = MYVOICE();
    const q = (a) => (IS_WIN && /[\s"&()^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
    const p = spawn(IS_WIN ? q(bin) : bin, IS_WIN ? args.map(q) : args, { shell: IS_WIN, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } });
    let err = '', out = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error(`경제음성: ${Math.round(timeoutMs / 60000)}분 안에 끝나지 않았습니다`)); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; if (onLine) String(d).split(/\r?\n/).filter(Boolean).forEach(onLine); }); p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => { clearTimeout(timer); reject(new Error(`경제음성 실행 실패: ${e.message} (${bin})`)); });
    p.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`경제음성 종료 코드 ${code}: ${(err || out).trim().split('\n').slice(-3).join(' ').slice(0, 300)}`)); });
  });
}

// timing.json → 단어 시간표. 형식이 확실하지 않아 흔한 모양(배열 / sentences·segments·items)과 필드 이름을 넓게 받는다.
// 문장 안 단어 시간은 글자 수 비례로 나눈다. 모르는 형식이면 빈 배열(자막은 글자 수 비례로 맞춤).
export function wordsFromTiming(j) {
  const list = Array.isArray(j) ? j : (j && (j.sentences || j.segments || j.items || j.parts || j.timing)) || [];
  const num = (o, ks) => { for (const k of ks) if (o[k] !== undefined && isFinite(Number(o[k]))) return Number(o[k]) / (/_ms$|Ms$/.test(k) ? 1000 : 1); return null; };
  const words = [];
  for (const seg of list) {
    if (!seg || typeof seg !== 'object') continue;
    const a = num(seg, ['start', 'start_sec', 'begin', 'start_time', 'start_ms', 'startMs']);
    const b = num(seg, ['end', 'end_sec', 'stop', 'end_time', 'end_ms', 'endMs']);
    const text = String(seg.text || seg.sentence || seg.line || '').trim();
    if (a === null || b === null || b <= a || !text) continue;
    const toks = text.split(/\s+/).filter(Boolean);
    const total = toks.reduce((n, t) => n + [...t].length, 0) || 1;
    let t = a;
    toks.forEach((w) => { const d = ((b - a) * [...w].length) / total; words.push({ w, start: t, end: t + d }); t += d; });
  }
  return words;
}

// voice_clone.py 의 split_sentences 와 똑같이 나눈다 (장면 ↔ 문장 대응을 맞추려고)
//   공백 정리 → 문장부호(.?!…) 뒤 공백 또는 줄바꿈에서 나눔 → 120자 넘으면 쉼표·공백에서 자름
const MAX_SENTENCE_CHARS = 120;
export function splitSentencesLikeMyVoice(text) {
  const t = text.trim().replace(/[ \t]+/g, ' ');
  const out = [];
  for (let p of t.split(/(?<=[.?!…])\s+|\n+/).map((x) => x.trim())) {
    if (!p) continue;
    let cps = [...p];
    while (cps.length > MAX_SENTENCE_CHARS) {
      const head = cps.slice(0, MAX_SENTENCE_CHARS).join('');
      let cut = [...head.slice(0, head.lastIndexOf(','))].length;
      if (head.lastIndexOf(',') < 0) cut = -1;
      if (!(cut > 20)) { const sp = head.lastIndexOf(' '); cut = sp < 0 ? -1 : [...head.slice(0, sp)].length; }
      if (!(cut > 20)) cut = MAX_SENTENCE_CHARS;
      out.push(cps.slice(0, cut + 1).join('').trim());
      cps = [...cps.slice(cut + 1).join('').trim()];
    }
    if (cps.length) out.push(cps.join(''));
  }
  return out;
}

// WAV(PCM) 읽기·자르기: 전체 내레이션을 장면별로 나눌 때 쓴다
function readWav(buf) {
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4), size = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ') fmt = buf.subarray(pos + 8, pos + 8 + size);
    if (id === 'data') { data = buf.subarray(pos + 8, Math.min(buf.length, pos + 8 + size)); break; }
    pos += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('경제음성: WAV 형식을 읽지 못했습니다');
  return { fmt, data, rate: fmt.readUInt32LE(4), block: fmt.readUInt16LE(12) };
}
function sliceWav(w, a, b) {
  const f0 = Math.max(0, Math.floor(a * w.rate)), f1 = Math.min(w.data.length / w.block, Math.ceil(b * w.rate));
  const data = w.data.subarray(f0 * w.block, f1 * w.block);
  const head = Buffer.alloc(12 + 8 + w.fmt.length + 8);
  head.write('RIFF', 0); head.writeUInt32LE(4 + 8 + w.fmt.length + 8 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(w.fmt.length, 16); w.fmt.copy(head, 20);
  head.write('data', 20 + w.fmt.length); head.writeUInt32LE(data.length, 24 + w.fmt.length);
  return Buffer.concat([head, data]);
}

// 진행률 (화면이 /api/tts-progress 로 읽는다)
export const LOCAL_PROGRESS = { running: false, done: 0, total: 0, startedAt: 0, line: '' };
const norm = (x) => String(x).replace(/\s+/g, ' ').trim();

// 여러 장면을 한 번에: 장면마다 한 줄로 원고를 만들어 myvoice 를 한 번만 부르고(모델 로딩 약 2분은 한 번만),
// timing.json 으로 문장 ↔ 장면을 맞춰 전체 WAV를 장면별로 자른다.
export async function localBatch({ voiceId, texts }) {
  const job = async () => {
    const clean = texts.map((t) => norm(String(t || '').replace(/\n+/g, ' ')));
    const expect = clean.map(splitSentencesLikeMyVoice);
    const lines = clean.filter((t, i) => expect[i].length);
    if (!lines.length) throw new Error('읽을 문장이 없습니다');
    const total = expect.reduce((n, e) => n + e.length, 0);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-studio-myvoice-'));
    Object.assign(LOCAL_PROGRESS, { running: true, done: 0, total, startedAt: Date.now(), line: '모델 불러오는 중 (약 2분)' });
    try {
      const txt = path.join(dir, 'script.txt'), wav = path.join(dir, 'narration.wav');
      fs.writeFileSync(txt, lines.join('\n'), 'utf8');
      await runMyVoice(['say', '--voice', voiceId || 'kkwabaegi', '--text-file', txt, '--out', wav],
        Number(env('MYVOICE_TIMEOUT_MIN', '240')) * 60000,
        (line) => { const m = line.match(/\[(\d+)\/(\d+)\]/); if (m) LOCAL_PROGRESS.done = Number(m[1]); LOCAL_PROGRESS.line = line.trim().slice(0, 80); });
      const timing = JSON.parse(fs.readFileSync(wav.replace(/\.wav$/, '.timing.json'), 'utf8'));
      const flat = expect.flat();
      if (timing.length !== flat.length || timing.some((t, k) => norm(t.text) !== norm(flat[k]))) {
        const k = timing.findIndex((t, k2) => norm(t.text) !== norm(flat[k2] || ''));
        throw new Error(`경제음성: 문장 나누기가 예상과 달라 장면을 맞추지 못했습니다 (예상 ${flat.length}문장, 결과 ${timing.length}문장${k >= 0 ? `, ${k + 1}번째: "${String(timing[k] && timing[k].text).slice(0, 30)}"` : ''})`);
      }
      const w = readWav(fs.readFileSync(wav));
      let k = 0;
      return expect.map((sents) => {
        if (!sents.length) return null;
        const segs = timing.slice(k, k + sents.length); k += sents.length;
        const a = segs[0].start, b = segs[segs.length - 1].end;
        const words = wordsFromTiming(segs.map((t) => ({ ...t, start: t.start - a, end: t.end - a })));
        return { audio: sliceWav(w, a, b), mime: 'audio/wav', words };
      });
    } finally {
      LOCAL_PROGRESS.running = false;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
  const run = localChain.then(job, job);
  localChain = run.catch(() => {});
  return run;
}

// 장면 하나만 (다시 만들기 등). 모델 로딩 때문에 한 번에 약 2분 이상 걸린다.
async function localSynth({ voiceId, text, speed }) {
  const [r] = await localBatch({ voiceId, texts: [text] });
  if (!r) throw new Error('읽을 문장이 없습니다');
  return { ...r, note: speed && speed !== 1 ? '경제음성은 속도 조절을 지원하지 않아 기본 속도로 만들었습니다' : null };
}

export const PROVIDERS = {
  local: {
    name: '경제음성 (내 PC)', envKey: () => (localReady() ? 'local' : ''), header: 'x-local-key',
    envVoice: () => env('MYVOICE_VOICE', 'kkwabaegi'), synth: localSynth, timestamps: true,
    voices: async () => [{ id: env('MYVOICE_VOICE', 'kkwabaegi'), name: `${env('MYVOICE_VOICE', 'kkwabaegi')} (경제음성)`, lang: 'ko', mine: true }],
  },
  cartesia: { name: 'Cartesia', envKey: () => env('CARTESIA_API_KEY'), header: 'x-cartesia-key', envVoice: () => env('CARTESIA_VOICE_ID'), synth: cartesiaSynth, voices: cartesiaVoices, timestamps: true },
  elevenlabs: { name: 'ElevenLabs', envKey: () => env('ELEVENLABS_API_KEY'), header: 'x-elevenlabs-key', envVoice: () => env('ELEVENLABS_VOICE_ID'), synth: elevenSynth, voices: elevenVoices, timestamps: true },
  openai: { name: 'OpenAI', envKey: () => env('OPENAI_API_KEY'), header: 'x-openai-key', envVoice: () => env('OPENAI_TTS_VOICE', 'alloy'), synth: openaiSynth, voices: async () => OPENAI_VOICES.map((v) => ({ id: v, name: v })) },
  google: { name: 'Google Cloud', envKey: () => env('GOOGLE_TTS_API_KEY') || (gcloudAuth().token ? 'gcloud' : ''), header: 'x-google-key', envVoice: () => env('GOOGLE_TTS_VOICE', 'ko-KR-Neural2-A'), synth: googleSynth, voices: googleVoices },
  clova: {
    name: '네이버 클로바', envKey: () => (env('CLOVA_CLIENT_ID') ? `${env('CLOVA_CLIENT_ID')}|${env('CLOVA_CLIENT_SECRET', '')}` : ''),
    header: 'x-clova-key', envVoice: () => env('CLOVA_SPEAKER', 'nara'), synth: clovaSynth, voices: async () => CLOVA_VOICES.map(([id, name]) => ({ id, name, lang: 'ko' })),
  },
};

export function providerKey(name, req) {
  const p = PROVIDERS[name];
  if (!p) return '';
  return p.envKey() || req.headers[p.header] || '';
}

export function providerStatus() {
  const out = {};
  for (const [k, p] of Object.entries(PROVIDERS)) out[k] = { name: p.name, key: !!p.envKey(), voice: !!p.envVoice(), timestamps: !!p.timestamps };
  return out;
}
