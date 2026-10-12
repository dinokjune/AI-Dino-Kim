import { spawnSync } from 'node:child_process';

// TTS 공급자 모음: Cartesia · ElevenLabs · OpenAI · Google Cloud · 네이버 클로바 보이스
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

export const PROVIDERS = {
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
