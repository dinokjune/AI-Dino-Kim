// 스튜디오 화면 로직: 톤 카드 → 주제/대본 → 목소리 → 미리보기 → 검수

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('studio.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('studio.' + k, JSON.stringify(v)); } catch (e) {} },
};
const settings = () => store.get('settings', {});
let SERVER = null; // /api/status 결과, 없으면 오프라인

// ── 서버 호출 ──
// 대본 엔진: 내 구독 CLI 우선, 종량제 API는 마지막 (기본값은 서버가 설치된 CLI 중에서 고른다)
const LLM_NAMES = { 'claude-cli': 'Claude Code (내 Claude 구독)', codex: 'Codex (내 ChatGPT 구독)', gemini: 'Gemini CLI (내 Google 구독)', 'claude-api': 'Claude API (종량제)' };
const LLM_NOTES = {
  'claude-api': 'Anthropic API 키로 실행 · 쓴 토큰만큼 요금 (claude-opus-5-5)',
  'claude-cli': 'Claude Code에 로그인한 내 구독으로 실행 · 추가 요금 없음 (구독 사용 한도 안에서)',
  codex: 'ChatGPT 계정으로 로그인한 Codex CLI로 실행 · 추가 요금 없음 (구독 사용 한도 안에서)',
  gemini: 'Google 계정으로 로그인한 Gemini CLI로 실행 · 추가 요금 없음 (구독·무료 한도 안에서)',
};
function llmEngine() { return (settings().llmEngine) || (SERVER && SERVER.llmDefault) || 'claude-cli'; }
function llmReady(e) {
  if (!SERVER) return false;
  if (e === 'claude-api') return !!(SERVER.claudeKey || settings().anthropicKey);
  return !!(SERVER.llm && SERVER.llm[e] && SERVER.llm[e].installed);
}
function renderLlmSelect() {
  const sel = $('llm-engine'); if (!sel) return;
  const cur = llmEngine();
  sel.innerHTML = '';
  Object.entries(LLM_NAMES).forEach(([k, v]) => {
    const o = document.createElement('option'); o.value = k;
    const inst = SERVER && SERVER.llm && SERVER.llm[k];
    o.textContent = v + (k !== 'claude-api' && inst && !inst.installed ? ' – 설치 안 됨' : '');
    sel.appendChild(o);
  });
  sel.value = cur;
  const ok = llmReady(cur);
  $('llm-note').textContent = (LLM_NOTES[cur] || '') + (ok ? '' : cur === 'claude-api' ? ' · ⚠ API 키 없음' : ' · ⚠ 이 컴퓨터에서 명령을 찾지 못했습니다 (설치·로그인 후 서버 재시작)');
  const b = $('st-claude');
  b.textContent = `${{ 'claude-api': 'Claude API', 'claude-cli': 'Claude 구독', codex: 'GPT 구독', gemini: 'Gemini 구독' }[cur]} ${ok ? '준비' : '확인 필요'}`;
  b.className = 'badge ' + (ok ? 'on' : 'off');
}

async function api(path, body, tag) {
  const s = settings();
  if (path === '/api/claude' && !body.engine) body = { ...body, engine: llmEngine() };
  const headers = { 'Content-Type': 'application/json' };
  const t = tag || (SCRIPT && (META().topic || META().title)) || '';
  if (t) headers['x-cost-tag'] = encodeURIComponent(t);
  if (s.anthropicKey) headers['x-anthropic-key'] = s.anthropicKey;
  if (s.cartesiaKey) headers['x-cartesia-key'] = s.cartesiaKey;
  const tk = s.ttsKeys || {};
  if (tk.elevenlabs) headers['x-elevenlabs-key'] = tk.elevenlabs;
  if (tk.openai) headers['x-openai-key'] = tk.openai;
  if (tk.google) headers['x-google-key'] = tk.google;
  if (tk.clovaId) headers['x-clova-key'] = `${tk.clovaId}|${tk.clovaSecret || ''}`;
  const r = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

async function checkServer() {
  try {
    const r = await fetch('/api/status');
    SERVER = r.ok ? await r.json() : null;
  } catch (e) { SERVER = null; }
  // 경제음성이 처음 잡히면 한 번만 기본 목소리로 바꾼다 (그 뒤에 사용자가 고른 공급자는 그대로 둔다)
  if (SERVER && SERVER.tts && SERVER.tts.local && SERVER.tts.local.key && !store.get('localVoiceApplied', false)) {
    store.set('localVoiceApplied', true);
    store.set('tts', defaultTTS());
    if ($('tts-provider') && $('tts-provider').options.length) { $('tts-provider').value = 'local'; $('voice-id').value = ''; loadVoiceList(1).then(saveTTSChoice); }
  }
  const s = settings();
  const set = (id, on, txt) => { const el = $(id); el.textContent = txt; el.className = 'badge ' + (on ? 'on' : 'off'); };
  set('st-server', !!SERVER, SERVER ? '서버 연결됨' : '오프라인 모드');
  set('st-claude', SERVER && (SERVER.claudeKey || s.anthropicKey), 'Claude ' + (SERVER && (SERVER.claudeKey || s.anthropicKey) ? '준비' : '키 없음'));
  const tp = currentTTS().provider, tReady = ttsReady(tp);
  set('st-voice', tReady, `${TTS_NAMES[tp]} ` + (tReady ? '준비' : '키 없음'));
  renderLlmSelect();
  $('btn-script').disabled = !SERVER;
  $('btn-topics').disabled = !SERVER;
  $('btn-voice').disabled = !SERVER;
  $('btn-queue').disabled = !SERVER;
  $('queue-upload').disabled = !(SERVER && SERVER.youtube);
  $('queue-upload').title = SERVER && SERVER.youtube ? '' : '유튜브 업로드 설정(README 참고)을 하면 켤 수 있습니다';
  if (SERVER) { pollJobs(); refreshLedger(); }
  if ($('tts-provider') && $('tts-provider').options.length) checkBadges();
  if ($('font-head') && userFontsPromise) userFontsPromise.then(renderFontSelects);
  if (!SERVER) status('script-status', '서버 없이 열렸습니다. "프롬프트 복사" → Claude 대화창에 붙여넣기 → 받은 JSON을 "JSON 붙여넣기"로 넣으면 됩니다. 음성 생성은 서버(npm start)가 필요합니다.');
}

function status(id, msg, err) { const el = $(id); el.textContent = msg || ''; el.classList.toggle('err', !!err); }

// ── 글꼴: 역할 4개 (제목 · 자막 · 본문 · 숫자) × 출처 3곳 (Google · 설치된 글꼴 · 다운로드/fonts 폴더) ──
const FONT_ROLES = ['head', 'caption', 'body', 'number'];
function currentFonts() {
  const f = store.get('fonts', {}) || {};
  return FONT_ROLES.some((r) => f[r]) ? Object.fromEntries(FONT_ROLES.map((r) => [r, f[r] || ''])) : null;
}

function fontChoices() {
  const q = ($('font-search').value || '').trim().toLowerCase();
  const koOnly = $('font-ko-only').checked;
  const hit = (...names) => !q || names.some((n) => String(n || '').toLowerCase().includes(q));
  return {
    google: GOOGLE_KO_FONTS.filter(([f, kind]) => hit(f, kind)).map(([f, kind]) => ({ value: f, label: `${f} · ${kind}` })),
    system: SYS_FONTS.filter((f) => (!koOnly || f.hangul) && hit(f.family, f.display)).map((f) => ({ value: f.family, label: f.display !== f.family ? `${f.display} (${f.family})` : f.family })),
    files: USER_FONTS.filter((f) => (!koOnly || f.hangul !== false) && hit(f.family, f.display, f.source)).map((f) => ({ value: f.family, label: `${f.display && f.display !== f.family ? f.display : f.family} · ${f.source}` })),
  };
}

function renderFontSelects() {
  const cur = store.get('fonts', {}) || {};
  const card = selectedCard();
  const def = { head: card.engine.fontHead, caption: card.engine.fontHead, body: card.engine.fontBody, number: card.engine.fontHead };
  const ch = fontChoices();
  FONT_ROLES.forEach((role) => {
    const sel = $('font-' + role);
    sel.innerHTML = '';
    const d = document.createElement('option'); d.value = ''; d.textContent = `톤 기본 (${def[role]})`; sel.appendChild(d);
    const group = (label, list) => {
      if (!list.length) return;
      const g = document.createElement('optgroup'); g.label = label;
      list.forEach((o) => { const op = document.createElement('option'); op.value = o.value; op.textContent = o.label; g.appendChild(op); });
      sel.appendChild(g);
    };
    group(`Google Fonts 한글 (${ch.google.length})`, ch.google);
    group(`내 컴퓨터에 설치된 글꼴 (${ch.system.length})`, ch.system);
    group(`다운로드 · fonts 폴더 (${ch.files.length})`, ch.files);
    // 검색에 걸리지 않아도 지금 고른 글꼴은 목록에 남긴다
    if (cur[role] && ![...sel.options].some((o) => o.value === cur[role])) { const op = document.createElement('option'); op.value = cur[role]; op.textContent = cur[role] + ' (선택됨)'; sel.appendChild(op); }
    sel.value = cur[role] || '';
    $('fp-' + role).style.fontFamily = `"${cur[role] || def[role]}"`;
  });
  const total = GOOGLE_KO_FONTS.length + SYS_FONTS.filter((f) => f.hangul).length + USER_FONTS.length;
  status('font-status', SERVER
    ? `Google 한글 ${GOOGLE_KO_FONTS.length}종 · 설치된 글꼴 ${SYS_FONTS.length}종(한글 ${SYS_FONTS.filter((f) => f.hangul).length}) · 다운로드·fonts 폴더 ${USER_FONTS.length}종`
    : `Google 한글 ${GOOGLE_KO_FONTS.length}종을 쓸 수 있습니다. 설치된 글꼴과 다운로드 폴더 글꼴은 서버(npm start)로 열면 보입니다.`);
  return total;
}

async function chooseFonts() {
  const f = Object.fromEntries(FONT_ROLES.map((r) => [r, $('font-' + r).value]));
  store.set('fonts', f);
  status('font-status', '글꼴을 불러오는 중…');
  await Promise.all(FONT_ROLES.map((r) => ensureGoogleFont(f[r])));
  const s = JSON.parse(JSON.stringify(SCRIPT));
  s.meta.fonts = currentFonts();
  if (!s.meta.fonts) delete s.meta.fonts;
  applyScript(s, { keepTime: true });
  await ensureScriptFonts([FONT_HEAD, FONT_BODY, FONT_CAPTION, FONT_NUM]);
  renderFontSelects();
}

async function addFontFiles(files) {
  for (const file of files) {
    const buf = await file.arrayBuffer();
    if (SERVER) {
      status('font-status', `${file.name} 올리는 중…`);
      try { await api('/api/fonts', { name: file.name, data: bytesToBase64(new Uint8Array(buf)) }); }
      catch (e) { status('font-status', `${file.name}: ${e.message}`, true); return; }
    } else {
      registerFont({ family: file.name.replace(/\.(ttf|otf|woff2?)$/i, ''), buffer: buf, source: '이 화면에서만' });
    }
  }
  if (SERVER) await loadUserFonts(true);
  renderFontSelects();
}

// ── 1. 톤 카드 ──
function selectedCard() { return TONE_CARDS.find((c) => c.id === store.get('tone', 'stage')) || TONE_CARDS[0]; }

function renderTones() {
  const cur = selectedCard();
  $('tones').innerHTML = '';
  TONE_CARDS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'tone' + (c.id === cur.id ? ' on' : '');
    b.innerHTML = `<div class="sw">${c.swatch.map((s) => `<span style="background:${s}"></span>`).join('')}</div><div class="nm"></div><div class="en"></div>`;
    b.querySelector('.nm').textContent = c.name;
    b.querySelector('.en').textContent = c.en;
    b.onclick = () => chooseTone(c.id);
    $('tones').appendChild(b);
  });
  const d = $('card-detail');
  d.innerHTML = `<h3></h3><div class="summary"></div><dl></dl><div class="targets"></div>`;
  d.querySelector('h3').textContent = `${cur.name} 톤 카드`;
  d.querySelector('.summary').textContent = cur.summary;
  const dl = d.querySelector('dl');
  Object.entries(cur.rules).forEach(([k, v]) => {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  });
  const t = cur.targets;
  d.querySelector('.targets').innerHTML = `<span>장면 평균 ${t.cutSec}초 ±30%</span><span>밝기 ${t.brightness[0]}~${t.brightness[1]}</span><span>움직임 ${t.motion[0]}~${t.motion[1]}</span>`;
  // 추천 주제
  $('topic-chips').innerHTML = '';
  cur.topics.forEach((tp) => addTopicChip(tp));
}

function addTopicChip(tp) {
  const c = document.createElement('button');
  c.className = 'chip'; c.textContent = tp;
  c.onclick = () => { $('topic').value = tp; $('topic').focus(); };
  $('topic-chips').appendChild(c);
}

function chooseTone(id) {
  store.set('tone', id);
  renderTones();
  if ($('font-head')) renderFontSelects();
  const s = JSON.parse(JSON.stringify(SCRIPT));
  s.meta.tone = id;
  applyScript(s, { keepTime: true });
}

// ── 2. 주제 · 대본 ──
function currentAspect() { return store.get('aspect', '16:9') === '9:16' ? '9:16' : '16:9'; }
function renderAspect() {
  document.querySelectorAll('#aspect button').forEach((b) => { const on = b.dataset.v === currentAspect(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
function renderLengthNote() {
  const el = $('length-note'); if (!el) return;
  const L = lengthOf($('length').value), v = currentAspect() === '9:16';
  const notes = [];
  if (L.chapters) notes.push(`목차를 먼저 짜고 ${L.chapters}개 챕터를 하나씩 씁니다. 대본 AI를 ${L.chapters + 1}번 부르고, 음성·MP4 렌더도 길이만큼 오래 걸립니다(30분 영상은 렌더만 수십 분 이상).`);
  if (L.maxSec) notes.push(v ? '세로 + 1분 미만이면 유튜브에 쇼츠로 올라갑니다.' : '쇼츠로 올리려면 9:16 세로를 고르세요.');
  else if (v) notes.push('세로 화면은 가운데에 장면, 위에 제목, 아래에 큰 자막이 들어갑니다.');
  el.textContent = notes.join(' ');
}
function promptInputs() {
  return {
    topic: $('topic').value.trim(), card: selectedCard(), length: $('length').value, aspect: currentAspect(),
    source: $('source').value.trim(), lessons: store.get('lessons', []),
    channel: $('channel').value.trim(), url: $('url').value.trim(),
  };
}

function applyScript(obj, { keepTime = false } = {}) {
  const errs = validateScript(obj);
  if (errs.length) throw new Error(errs.slice(0, 6).join('\n'));
  obj.meta = obj.meta || {};
  obj.meta.tone = obj.meta.tone || store.get('tone', 'stage');
  const ch = $('channel').value.trim(), url = $('url').value.trim();
  if (ch) obj.meta.channel = ch;
  if (url) obj.meta.url = url;
  if (!obj.meta.fonts && currentFonts()) obj.meta.fonts = currentFonts();
  if ($('source').value.trim()) obj.meta.source = $('source').value.trim();
  const t = curT;
  pause();
  loadScript(obj);
  if (!keepTime) curT = 0; else curT = Math.min(t, TOTAL - 0.01);
  store.set('script', obj);
  if (obj.meta.tone !== store.get('tone')) { store.set('tone', obj.meta.tone); renderTones(); }
}

async function makeScript() {
  const inp = promptInputs();
  if (!inp.topic) return status('script-status', '주제를 먼저 적어 주세요.', true);
  $('btn-script').disabled = true;
  try {
    const r = await writeScript({
      ...inp, fonts: currentFonts(),
      onStep: (n) => status('script-status', typeof n === 'string' ? `${n} (챕터마다 1~3분)` : n ? '근거 없는 숫자나 형식 오류가 있어 한 번 더 쓰는 중…' : `"${inp.topic}" 대본을 쓰는 중… (톤: ${inp.card.name}, 보통 30초~2분)`),
    });
    curT = firstLook();
    store.set('script', SCRIPT);
    const warn = r.numberIssues.length ? `\n주의: 근거 없는 숫자 ${r.numberIssues.length}개가 남았습니다. 검수에서 확인하세요.` : '';
    status('script-status', `완료: 장면 ${TL.length}개, 약 ${TOTAL.toFixed(0)}초. 대본 비용 ${fmtUsd(r.script.meta.cost.claude.usd)}. 다음은 목소리 입히기입니다.\n${r.log.join(' · ')}${warn}`);
    refreshLedger();
  } catch (e) {
    status('script-status', '대본 생성 실패: ' + e.message, true);
  } finally { $('btn-script').disabled = !SERVER; }
}

async function suggestTopics() {
  $('btn-topics').disabled = true;
  status('script-status', '이 톤에 어울리는 주제를 찾는 중…');
  try {
    const r = await api('/api/claude', { prompt: buildTopicPrompt(selectedCard(), $('channel').value.trim() || 'AI 활용, 업무 자동화, 생활 정보'), maxTokens: 2000 });
    const list = extractJSON(r.text);
    $('topic-chips').innerHTML = '';
    list.forEach((tp) => addTopicChip(String(tp)));
    status('script-status', '추천 주제를 눌러 고르세요.');
  } catch (e) { status('script-status', '추천 실패: ' + e.message, true); }
  finally { $('btn-topics').disabled = !SERVER; }
}

// ── 음성 보관: 새로고침해도 만든 음성을 잃지 않게 IndexedDB에 둔다 ──
const voiceDB = {
  open() {
    if (this._p) return this._p;
    this._p = new Promise((resolve, reject) => {
      const r = indexedDB.open('studio-voices', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('v');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return this._p;
  },
  async put(key, val) {
    try { const db = await this.open(); db.transaction('v', 'readwrite').objectStore('v').put(val, key); } catch (e) {}
  },
  async get(key) {
    try {
      const db = await this.open();
      return await new Promise((res) => { const q = db.transaction('v').objectStore('v').get(key); q.onsuccess = () => res(q.result); q.onerror = () => res(null); });
    } catch (e) { return null; }
  },
  async clear() { try { const db = await this.open(); db.transaction('v', 'readwrite').objectStore('v').clear(); } catch (e) {} },
};

// 현재 대본의 장면 중 저장된 음성이 있으면 불러온다
async function restoreVoices() {
  const found = {};
  for (const e of TL) {
    const k = voiceKey(e.s);
    if (VOICE[k]) continue;
    const v = await voiceDB.get(k);
    if (v) found[k] = v;
  }
  if (!Object.keys(found).length) return 0;
  await importVoices(found);
  loadScript(SCRIPT);
  return Object.keys(found).length;
}

// ── 3. 목소리 (TTS 공급자 여러 개) ──
const TTS_NAMES = { local: '경제음성 (내 PC)', cartesia: 'Cartesia', elevenlabs: 'ElevenLabs', openai: 'OpenAI', google: 'Google Cloud', clova: '네이버 클로바' };
const TTS_NOTES = {
  local: '내 PC의 로컬 Qwen3-TTS 클론 목소리 kkwabaegi (경제음성 스킬) · 유료 API 없음 · 문장 시간표로 자막을 맞춤 · 장면을 하나씩 차례로 만들어 시간이 걸림',
  cartesia: '내 클론 목소리 사용 가능 · 단어별 시간표로 자막이 말과 정확히 맞음 · 글자당 약 1크레딧',
  elevenlabs: '내 클론 목소리 사용 가능 · 글자별 시간표로 자막이 말과 정확히 맞음 · 모델 eleven_multilingual_v2',
  openai: '고정 목소리 11종 · 모델 gpt-4o-mini-tts · 자막은 글자 수 비례',
  google: '한국어 목소리 다수 (ko-KR-Neural2·Chirp3-HD 등) · 월 100만 자 무료 구간 · 자막은 글자 수 비례',
  clova: '한국어 전용 화자 · 네이버 클라우드에서 CLOVA Voice 사용 설정 필요 · 자막은 글자 수 비례',
};
const TTS_DEFAULT_VOICES = { local: 'kkwabaegi', openai: 'alloy', google: 'ko-KR-Neural2-A', clova: 'nara' };

// 기본 목소리: 내 PC에 경제음성이 있으면 그것, 없으면 Cartesia
function defaultTTS(voiceId = '') {
  return SERVER && SERVER.tts && SERVER.tts.local && SERVER.tts.local.key ? { provider: 'local', voiceId: 'kkwabaegi', speed: 1 } : { provider: 'cartesia', voiceId, speed: 1 };
}
function ttsReady(provider) {
  const s = settings(), tk = s.ttsKeys || {};
  const local = provider === 'cartesia' ? s.cartesiaKey : provider === 'clova' ? tk.clovaId : tk[provider];
  return !!(SERVER && ((SERVER.tts && SERVER.tts[provider] && SERVER.tts[provider].key) || local));
}

// 화면에서 고른 목소리 → { provider, voiceId, speed }
function pickerSpec(n) {
  const sfx = n === 2 ? '2' : '';
  const provider = $(`tts${sfx}-provider`).value || 'cartesia';
  const manual = $(n === 2 ? 'voice2-id' : 'voice-id').value.trim();
  const voiceId = manual || $(`tts${sfx}-voice`).value || TTS_DEFAULT_VOICES[provider] || '';
  return { provider, voiceId, speed: parseFloat($('tts-speed').value) || 1 };
}
function currentTTS() { return $('tts-provider') ? pickerSpec(1) : (store.get('tts', null) || { provider: 'cartesia', voiceId: '' }); }
function currentTTS2() { return $('tts2-on') && $('tts2-on').checked ? pickerSpec(2) : null; }

function fillVoiceSelect(sel, voices, keep) {
  sel.innerHTML = '';
  const d = document.createElement('option'); d.value = ''; d.textContent = voices.length ? '목소리를 고르세요' : '목록을 불러오거나 ID를 직접 입력'; sel.appendChild(d);
  voices.forEach((v) => { const o = document.createElement('option'); o.value = v.id; o.textContent = `${v.mine ? '★ ' : ''}${v.name}${v.lang ? ' · ' + v.lang : ''}`; sel.appendChild(o); });
  if (keep && voices.some((v) => v.id === keep)) sel.value = keep;
}

async function loadVoiceList(n) {
  const sfx = n === 2 ? '2' : '';
  const provider = $(`tts${sfx}-provider`).value;
  const sel = $(`tts${sfx}-voice`);
  const cached = store.get(`voices.${provider}`, null);
  if (cached) fillVoiceSelect(sel, cached, store.get(`tts${sfx}`, {}).voiceId);
  if (!SERVER) return;
  try {
    const s = settings(), tk = s.ttsKeys || {};
    const headers = {};
    if (s.cartesiaKey) headers['x-cartesia-key'] = s.cartesiaKey;
    if (tk.elevenlabs) headers['x-elevenlabs-key'] = tk.elevenlabs;
    if (tk.google) headers['x-google-key'] = tk.google;
    const r = await fetch(`/api/voices?provider=${provider}`, { headers });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    store.set(`voices.${provider}`, j.voices);
    fillVoiceSelect(sel, j.voices, store.get(`tts${sfx}`, {}).voiceId);
    status('voice-status', `${TTS_NAMES[provider]} 목소리 ${j.voices.length}개를 불러왔습니다.`);
  } catch (e) { if (!cached) fillVoiceSelect(sel, [], ''); status('voice-status', `${TTS_NAMES[provider]} 목록: ${e.message}`, true); }
}

function saveTTSChoice() {
  store.set('tts', pickerSpec(1));
  store.set('tts2', Object.assign(pickerSpec(2), { on: $('tts2-on').checked }));
  $('tts-speed-v').textContent = Number($('tts-speed').value).toFixed(2);
  $('tts-note').textContent = TTS_NOTES[$('tts-provider').value] || '';
  updateEstimate(); renderCost(); checkBadges();
}
function checkBadges() {
  const tp = currentTTS().provider, ok = ttsReady(tp), el = $('st-voice');
  el.textContent = `${TTS_NAMES[tp]} ${ok ? '준비' : '키 없음'}`; el.className = 'badge ' + (ok ? 'on' : 'off');
}

function initVoicePickers() {
  ['tts-provider', 'tts2-provider'].forEach((id) => Object.entries(TTS_NAMES).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v; $(id).appendChild(o); }));
  const t1 = store.get('tts', null) || defaultTTS(store.get('f.voice-id', ''));
  const t2 = store.get('tts2', null) || { provider: 'openai', voiceId: '', on: false };
  $('tts-provider').value = t1.provider; $('tts2-provider').value = t2.provider;
  $('tts-speed').value = t1.speed || 1;
  $('tts2-on').checked = !!t2.on;
  const known = (p, id) => (store.get(`voices.${p}`, []) || []).some((v) => v.id === id) || ['openai', 'clova', 'local'].includes(p);
  $('voice-id').value = t1.voiceId && !known(t1.provider, t1.voiceId) ? t1.voiceId : '';
  $('voice2-id').value = t2.voiceId && !known(t2.provider, t2.voiceId) ? t2.voiceId : '';
  if (t2.on) $('tts2-box').open = true;
  [1, 2].forEach((n) => {
    const sfx = n === 2 ? '2' : '';
    $(`tts${sfx}-provider`).onchange = () => { $(n === 2 ? 'voice2-id' : 'voice-id').value = ''; loadVoiceList(n).then(saveTTSChoice); saveTTSChoice(); };
    $(`tts${sfx}-voice`).onchange = saveTTSChoice;
    $(n === 2 ? 'voice2-id' : 'voice-id').onchange = saveTTSChoice;
  });
  $('btn-voices').onclick = () => loadVoiceList(1);
  $('btn-voices2').onclick = () => loadVoiceList(2);
  $('tts-speed').oninput = saveTTSChoice;
  $('tts2-on').onchange = saveTTSChoice;
  // 고정 목록(OpenAI·클로바)이나 저장해 둔 목록은 바로 채운다
  [1, 2].forEach((n) => { const p = $(`tts${n === 2 ? '2' : ''}-provider`).value; const c = store.get(`voices.${p}`, null); if (c || ['openai', 'clova', 'local'].includes(p)) loadVoiceList(n); else fillVoiceSelect($(`tts${n === 2 ? '2' : ''}-voice`), [], ''); });
  saveTTSChoice();
}

// 장면마다 정해진 목소리로 음성을 만든다. 실패하면 예외를 던진다 (화면 버튼과 자동 제작이 같이 쓴다)
async function generateVoices({ tts, tts2 = null, voiceId, onProgress, onLocalProgress } = {}) {
  const s = settings();
  if (!tts) tts = defaultTTS(voiceId || ''); // 예전 호출 방식
  SCRIPT.meta.tts = tts;
  if (tts2 && tts2.voiceId) SCRIPT.meta.tts2 = tts2; else delete SCRIPT.meta.tts2;
  delete SCRIPT.meta.voiceId;
  loadScript(SCRIPT); // 목소리가 바뀌면 장면 키도 바뀐다
  AE.init();
  const all = TL.filter((e) => e.s.say && !VOICE[voiceKey(e.s)]);
  // 경제음성(내 PC)은 모델 로딩이 길어서 장면을 모아 한 번에 만든다. 나머지 공급자는 장면마다 부른다.
  const localTodo = all.filter((e) => voiceSpec(e.s).provider === 'local');
  const todo = all.filter((e) => voiceSpec(e.s).provider !== 'local');
  const total = all.length;
  let done = 0; const notes = [];
  const keep = async (e, r) => {
    const buffer = await AE.ctx.decodeAudioData(base64ToArrayBuffer(r.audio));
    VOICE[voiceKey(e.s)] = { buffer, duration: buffer.duration, words: r.words || [], wav: r.audio };
    voiceDB.put(voiceKey(e.s), { audio: r.audio, words: r.words || [] });
    if (r.note) notes.push(r.note);
    addCost(r.cost);
    done++;
    if (onProgress) onProgress(done, total);
  };
  const localRun = async () => {
    if (!localTodo.length) return;
    // 같은 목소리끼리 묶는다 (보통 하나)
    const groups = {};
    localTodo.forEach((e) => { const id = voiceSpec(e.s).voiceId || 'kkwabaegi'; (groups[id] = groups[id] || []).push(e); });
    for (const [voiceId, list] of Object.entries(groups)) {
      let poll = null;
      if (onLocalProgress) poll = setInterval(async () => { try { onLocalProgress(await (await fetch('/api/tts-progress')).json()); } catch (err) {} }, 3000);
      try {
        const r = await api('/api/tts-batch', { voiceId, texts: list.map((e) => stripMarks(e.s.say)) });
        for (let i = 0; i < list.length; i++) if (r.items[i]) await keep(list[i], r.items[i]);
      } finally { if (poll) clearInterval(poll); }
    }
  };
  const worker = async () => {
    while (todo.length) {
      const e = todo.shift();
      const v = voiceSpec(e.s);
      const r = await api('/api/tts', {
        provider: v.provider, voiceId: v.voiceId, text: stripMarks(e.s.say), speed: v.speed || 1,
        model: v.model || (v.provider === 'cartesia' ? s.cartesiaModel : '') || undefined,
        version: v.provider === 'cartesia' ? s.cartesiaVersion || undefined : undefined,
      });
      await keep(e, r);
    }
  };
  try { await Promise.all([localRun(), worker(), worker()]); }
  finally { loadScript(SCRIPT); }
  return { done, notes };
}

// 경제음성 진행률 표시: 문장 n/총, 걸린 시간, 남은 시간(대략)
function localProgressText(p, show) {
  if (!p || !p.running) return;
  const min = (x) => `${Math.max(0, Math.round(x / 60000))}분`;
  const spent = Date.now() - p.startedAt;
  const eta = p.done > 0 ? ((spent - 120000) / p.done) * (p.total - p.done) : null;
  show(`경제음성 ${p.done}/${p.total} 문장 · ${min(spent)} 지남${eta && eta > 0 ? ` · 약 ${min(eta)} 남음` : p.done ? '' : ' · 모델 불러오는 중(약 2분)'}`, p.total ? p.done / p.total : 0);
}

async function makeVoices() {
  const tts = currentTTS();
  if (!ttsReady(tts.provider)) return status('voice-status', tts.provider === 'local' ? '이 PC에서 경제음성(myvoice.cmd)을 찾지 못했습니다. .env 의 MYVOICE_CMD 경로를 확인하세요.' : `${TTS_NAMES[tts.provider]} API 키를 ⚙ 설정이나 .env에 넣어 주세요.`, true);
  if (!tts.voiceId && !(SERVER.tts && SERVER.tts[tts.provider] && SERVER.tts[tts.provider].voice)) return status('voice-status', '목소리를 고르거나 ID를 넣어 주세요.', true);
  $('btn-voice').disabled = true;
  const bar = $('voice-bar');
  try {
    const { done, notes } = await generateVoices({
      tts, tts2: currentTTS2(),
      onProgress: (d, t) => { bar.style.width = `${(d / t) * 100}%`; status('voice-status', `${d}/${t} 장면 음성 생성 중…`); },
      onLocalProgress: (p) => localProgressText(p, (msg, frac) => { bar.style.width = `${frac * 100}%`; status('voice-status', msg); }),
    });
    store.set('script', SCRIPT);
    refreshLedger();
    status('voice-status', done ? `완료: ${done}개 장면. 영상 길이 ${TOTAL.toFixed(1)}초로 맞췄습니다.` + (notes.length ? `\n참고: ${notes[0]}` : '') : '모든 장면에 이미 음성이 있습니다.');
  } catch (e) {
    status('voice-status', '음성 생성 실패: ' + e.message, true);
  } finally { $('btn-voice').disabled = !SERVER; }
}

// 화면 없이 주제 하나를 끝까지 만든다: 대본 → 숫자 검문(실패 시 1회 재작성) → 음성 → 검수
// 서버의 자동 제작 대기열이 헤드리스 브라우저에서 부른다.
// 대본 작성: 형식 오류나 근거 없는 숫자가 나오면 이유를 알려 주고 한 번 다시 쓰게 한다
async function writeScript({ topic, card, length = 'standard', aspect = '16:9', source = '', lessons = [], channel = '', url = '', voiceId = '', fonts = null, onStep }) {
  length = lengthKey(length);
  if (lengthOf(length).chapters) return writeLongScript({ topic, card, length, aspect, source, lessons, channel, url, voiceId, fonts, onStep });
  const log = [];
  const run = emptyCost();
  let issues = [], last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (onStep) onStep(attempt);
    const extra = attempt ? ['지난 시도에서 문제가 있었다: ' + issues.join(' / ') + ' → 형식을 지키고, 화면 숫자는 say와 참고 자료에 있는 것만 쓴다'] : [];
    const r = await api('/api/claude', { prompt: buildScriptPrompt({ topic, card, length, aspect, source, lessons: [...lessons, ...extra], channel, url }), maxTokens: 32000 }, topic);
    addCost(r.cost, run);
    let obj;
    try { obj = extractJSON(r.text); } catch (e) { issues = [e.message]; log.push(`대본 ${attempt + 1}차: JSON 오류`); continue; }
    const errs = validateScript(obj);
    if (errs.length) { issues = errs; log.push(`대본 ${attempt + 1}차: 형식 오류 ${errs.length}개`); continue; }
    obj.meta = Object.assign({}, obj.meta, { tone: card.id, topic, source, voiceId, length, aspect, cost: run });
    if (fonts) obj.meta.fonts = fonts;
    if (channel) obj.meta.channel = channel;
    if (url) obj.meta.url = url;
    loadScript(obj);
    last = obj;
    issues = numberIssues(source);
    log.push(`대본 ${attempt + 1}차: 장면 ${TL.length}개, 근거 없는 숫자 ${issues.length}개`);
    if (!issues.length) break;
  }
  if (!last) throw new Error('대본을 만들지 못했습니다: ' + issues.slice(0, 3).join(' / ') + ` (이미 쓴 비용 ${fmtUsd(run.claude.usd)})`);
  rememberTopic(topic);
  return { script: last, log, numberIssues: issues };
}

// 10분 이상: 목차를 먼저 짜고 챕터마다 따로 써서 이어 붙인다 (챕터마다 형식·숫자 검문, 실패하면 그 챕터만 한 번 다시)
async function writeLongScript({ topic, card, length, aspect, source, lessons, channel, url, voiceId, fonts, onStep }) {
  const log = [], run = emptyCost(), L = lengthOf(length);
  const say = (msg) => onStep && onStep(msg);
  say(`목차 짜는 중… (${L.label})`);
  let outline = null;
  for (let attempt = 0; attempt < 2 && !outline; attempt++) {
    const r = await api('/api/claude', { prompt: buildOutlinePrompt({ topic, card, length, source, aspect }), maxTokens: 8000 }, topic);
    addCost(r.cost, run);
    try {
      const o = extractJSON(r.text);
      if (Array.isArray(o.chapters) && o.chapters.length >= 2) outline = { title: o.title || topic, chapters: o.chapters.slice(0, L.chapters) };
    } catch (e) { /* 한 번 더 */ }
  }
  if (!outline) throw new Error('목차를 만들지 못했습니다' + ` (이미 쓴 비용 ${fmtUsd(run.claude.usd)})`);
  log.push(`목차 ${outline.chapters.length}장`);
  const meta = { title: outline.title, tone: card.id, topic, source, voiceId, length, aspect, chapters: [], cost: run };
  if (fonts) meta.fonts = fonts;
  if (channel) meta.channel = channel;
  if (url) meta.url = url;
  const scenes = [];
  let prevSay = '', leftIssues = [];
  for (let i = 0; i < outline.chapters.length; i++) {
    let issues = [], got = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      say(`${i + 1}/${outline.chapters.length}장 "${outline.chapters[i].title}" 쓰는 중…${attempt ? ' (다시)' : ''}`);
      const extra = attempt ? ['지난 시도에서 문제가 있었다: ' + issues.join(' / ') + ' → 형식을 지키고, 화면 숫자는 say와 참고 자료에 있는 것만 쓴다'] : [];
      const r = await api('/api/claude', { prompt: buildChapterPrompt({ topic, card, outline, index: i, prevSay, source, lessons: [...lessons, ...extra], channel, url, aspect, length }), maxTokens: 32000 }, topic);
      addCost(r.cost, run);
      let obj;
      try { obj = extractJSON(r.text); } catch (e) { issues = [e.message]; continue; }
      if (Array.isArray(obj)) obj = { scenes: obj };
      const errs = validateScript(obj);
      if (errs.length) { issues = errs; continue; }
      // 마지막 장이 아니면 끝인사 장면은 뺀다
      if (i < outline.chapters.length - 1) obj.scenes = obj.scenes.filter((sc) => sc.type !== 'endcard');
      loadScript({ meta: { ...meta, cost: emptyCost() }, scenes: obj.scenes });
      got = obj.scenes;
      issues = numberIssues(source);
      if (!issues.length) break;
    }
    if (!got) throw new Error(`${i + 1}장을 만들지 못했습니다: ${issues.slice(0, 2).join(' / ')} (이미 쓴 비용 ${fmtUsd(run.claude.usd)})`);
    got.forEach((sc) => { if (!sc.beat) sc.beat = outline.chapters[i].title; });
    meta.chapters.push({ title: outline.chapters[i].title, scene: scenes.length });
    scenes.push(...got);
    leftIssues = leftIssues.concat(issues);
    prevSay = stripMarks(got[got.length - 1].say || '');
    log.push(`${i + 1}장 ${got.length}장면${issues.length ? ` (숫자 ${issues.length})` : ''}`);
  }
  const obj = { meta, scenes };
  loadScript(obj);
  rememberTopic(topic);
  log.push(`합계 ${TL.length}장면 · 약 ${Math.round(TOTAL / 60)}분`);
  return { script: obj, log, numberIssues: leftIssues };
}

// 화면 없이 주제 하나를 끝까지 만든다: 대본(재작성 포함) → 음성 → 검수
// 서버의 자동 제작 대기열이 헤드리스 브라우저에서 부른다.
async function autopilot({ topic, tone, length = 'standard', aspect = '16:9', voiceId = '', tts = null, tts2 = null, source = '', channel = '', url = '', lessons = [], withVoice = true, fonts = null }) {
  if (fonts) { await loadUserFonts(); await Promise.all(Object.values(fonts).map(ensureGoogleFont)); }
  const card = TONE_CARDS.find((c) => c.id === tone) || TONE_CARDS[0];
  const { log } = await writeScript({ topic, card, length, aspect, source, lessons, channel, url, voiceId, fonts });
  await ensureScriptFonts([FONT_HEAD, FONT_BODY, FONT_CAPTION, FONT_NUM]);
  if (withVoice) {
    const v = await generateVoices({ tts: tts || defaultTTS(voiceId), tts2 });
    log.push(`음성 ${v.done}개 장면` + (v.notes.length ? ` (${v.notes[0]})` : ''));
  }
  const qa = await runQA({ source: source + ' ' + topic });
  const cost = SCRIPT.meta.cost || emptyCost();
  log.push(`비용: Claude ${fmtUsd(cost.claude.usd)} (토큰 ${fmtNum(cost.claude.input)}→${fmtNum(cost.claude.output)}) · 음성 ${fmtNum(cost.tts.chars)}크레딧`);
  return { script: SCRIPT, qa, log, cost };
}

// 새 대본을 만든 직후 미리보기 위치: 첫 장면이 다 보이는 시점 (0초는 커튼이 닫혀 있어 빈 화면처럼 보인다)
function firstLook() { return TL.length ? Math.min(TOTAL - 0.01, TL[0].start + TL[0].d * 0.7) : 0; }

// ── 최근 주제 ──
function rememberTopic(t) {
  if (!t) return;
  const a = [t, ...store.get('recentTopics', []).filter((x) => x !== t)].slice(0, 8);
  store.set('recentTopics', a);
  renderRecentTopics();
}
function renderRecentTopics() {
  const box = $('recent-topics'); if (!box) return;
  box.innerHTML = '';
  store.get('recentTopics', []).forEach((tp) => {
    const c = document.createElement('button'); c.className = 'chip'; c.textContent = tp;
    c.onclick = () => { $('topic').value = tp; store.set('f.topic', tp); updateEstimate(); };
    box.appendChild(c);
  });
  $('recent-wrap').hidden = !store.get('recentTopics', []).length;
}

// ── 비용 표시 ──
function updateEstimate() {
  const el = $('estimate'); if (!el) return;
  const topic = $('topic').value.trim();
  const e = estimateNew($('length').value, buildScriptPrompt({ topic: topic || '주제', card: selectedCard(), length: $('length').value, source: $('source').value.trim(), lessons: store.get('lessons', []) }));
  if (llmEngine() !== 'claude-api') { el.textContent = `예상 비용(대략): 대본은 내 구독으로 추가 요금 없음 + 음성 약 ${fmtNum(e.credits)}${currentTTS().provider === 'cartesia' ? '크레딧' : '자'}(${fmtUsd(e.tts)}) ≈ ${fmtKrw(e.tts * costSettings().krw)}`; return; }
  el.textContent = `예상 비용(대략): 대본 ${fmtUsd(e.claudeLo)}~${fmtUsd(e.claudeHi)} + 음성 약 ${fmtNum(e.credits)}크레딧(${fmtUsd(e.tts)}) ≈ ${fmtKrw(e.krwLo)}~${fmtKrw(e.krwHi)} · 숫자 검문으로 대본을 다시 쓰면 대본 비용이 최대 2배`;
}

let ledgerCache = null;
async function refreshLedger() {
  if (!SERVER) return;
  try { ledgerCache = await (await fetch('/api/ledger')).json(); } catch (e) {}
  renderCost();
}

function renderCost() {
  const box = $('cost'); if (!box || !SCRIPT) return;
  const c = SCRIPT.meta.cost || emptyCost();
  const p = priceOf(c), cs = costSettings();
  const tt = currentTTS();
  const pendChars = pendingTtsChars();
  const pendUsd = tt.provider === 'cartesia' ? pendChars * cs.creditMult * cs.usdPerCredit : (pendChars / 1000) * ttsRatePer1k(tt.provider, tt.voiceId, tt.model);
  const rows = [
    [`대본 (${c.claude.engine ? (LLM_NAMES[c.claude.engine] || c.claude.engine).replace(/ \(.*\)/, '') : 'Claude'})`,
      !c.claude.calls ? '아직 없음' : c.claude.subscription ? `내 구독으로 처리 · 추가 요금 없음${c.claude.input ? ` (${fmtNum(c.claude.input)}→${fmtNum(c.claude.output)} 토큰)` : ''}` : `${fmtNum(c.claude.input)} 입력 · ${fmtNum(c.claude.output)} 출력 토큰`,
      c.claude.subscription && !p.claudeUsd ? '구독' : fmtUsd(p.claudeUsd)],
    ['음성 (TTS)', c.tts.calls ? Object.entries(p.by).map(([k, n]) => `${TTS_NAMES[k] || k} ${fmtNum(k === 'cartesia' ? n * cs.creditMult : n)}${k === 'cartesia' ? '크레딧' : '자'}`).join(' · ') : '아직 없음', fmtUsd(p.ttsUsd)],
    ['렌더 · 검수', '내 컴퓨터에서 처리', '$0'],
  ];
  let html = '<table>' + rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') +
    `<tr class="sum"><td>이 영상 합계</td><td>${fmtKrw(p.krw)} (환율 ${fmtNum(cs.krw)}원 기준)</td><td>${fmtUsd(p.usd)}</td></tr></table>`;
  if (pendChars > 0) html += `<div class="hint" style="margin:8px 0 0">${TTS_NAMES[tt.provider]}로 음성을 만들면 약 ${fmtNum(pendChars)}자 · ${fmtUsd(pendUsd)} (${fmtKrw(pendUsd * cs.krw)})가 더 듭니다.</div>`;
  if (ledgerCache) {
    const m = ledgerCache.month;
    const mp = priceOf({ claude: { usd: m.claudeUsd }, tts: { chars: m.ttsChars, by: m.ttsBy || { cartesia: m.ttsChars } } });
    html += `<div class="hint" style="margin:8px 0 0">이번 달(${ledgerCache.monthKey}) 누적: Claude ${fmtUsd(m.claudeUsd)} (${m.claudeCalls}회) · 음성 ${fmtNum(m.ttsChars)}자 → 합계 ${fmtUsd(mp.usd)} ≈ ${fmtKrw(mp.krw)}</div>`;
  }
  box.innerHTML = html;
}

// ── 한 번에 완성: 주제 → 대본 → 내 목소리 → 검수 → MP4 ──
async function makeAll() {
  const inp = promptInputs();
  if (!inp.topic) return status('all-status', '주제를 적거나 아래 추천 주제를 눌러 고르세요.', true);
  if (!SERVER) return status('all-status', '한 번에 완성은 서버(npm start)에서 동작합니다. 지금은 "프롬프트 복사"를 쓰세요.', true);
  const tts = currentTTS(), tts2 = currentTTS2();
  const btn = $('btn-all'); btn.disabled = true;
  const step = (n, msg) => status('all-status', `[${n}/4] ${msg}`);
  try {
    step(1, `"${inp.topic}" 대본을 쓰는 중… (${inp.card.name} 톤)`);
    const r = await writeScript({ ...inp, fonts: currentFonts(), onStep: (a) => typeof a === 'string' ? step(1, a) : a && step(1, '근거 없는 숫자나 형식 오류가 있어 한 번 더 쓰는 중…') });
    curT = firstLook(); store.set('script', SCRIPT); renderCost();
    if (ttsReady(tts.provider) && (tts.voiceId || (SERVER.tts && SERVER.tts[tts.provider] && SERVER.tts[tts.provider].voice))) {
      await generateVoices({ tts, tts2, onProgress: (d, t) => { step(2, `내 목소리 ${d}/${t} 장면`); $('voice-bar').style.width = `${(d / t) * 100}%`; },
        onLocalProgress: (p) => localProgressText(p, (msg, frac) => { step(2, msg); $('voice-bar').style.width = `${frac * 100}%`; }) });
      store.set('script', SCRIPT); renderCost();
    } else step(2, `${TTS_NAMES[tts.provider]} 키나 목소리가 없어 음성은 건너뜁니다`);
    step(3, '검수 중…');
    await doQA();
    step(4, 'MP4 렌더를 대기열에 넣는 중…');
    await api('/api/render', jobBody({ script: SCRIPT, voices: exportVoices() }));
    pollJobs();
    const p = priceOf(SCRIPT.meta.cost || emptyCost());
    status('all-status', `완료: 대본 ${TL.length}장면 · ${TOTAL.toFixed(0)}초. MP4는 아래 5번 목록에서 받을 수 있습니다.\n이 영상 비용 ${fmtUsd(p.usd)} ≈ ${fmtKrw(p.krw)} (${r.log.join(' · ')})`);
  } catch (e) {
    status('all-status', '중단: ' + e.message, true);
  } finally { btn.disabled = !SERVER; refreshLedger(); }
}

// ── 4. 검수 ──
async function doQA() {
  $('btn-qa').disabled = true;
  $('qa').innerHTML = '<li class="info"><b>재는 중…</b></li>';
  try {
    const res = await runQA({ source: (SCRIPT.meta.source || '') + ' ' + (SCRIPT.meta.topic || '') });
    $('qa').innerHTML = '';
    res.forEach((r) => {
      const li = document.createElement('li');
      li.className = r.level;
      const b = document.createElement('b'); b.textContent = ({ pass: '✓ ', warn: '! ', fail: '✗ ', info: 'i ' }[r.level] || '') + r.title;
      const pre = document.createElement('pre'); pre.textContent = r.detail;
      li.append(b, pre);
      if (r.level === 'fail' || r.level === 'warn') {
        const add = document.createElement('button'); add.className = 'b'; add.textContent = '실수 노트에 규칙으로 추가';
        add.onclick = () => addLesson(LESSON_FROM_QA[r.title] || r.title);
        li.appendChild(add);
      }
      $('qa').appendChild(li);
    });
  } finally { $('btn-qa').disabled = false; }
}

const LESSON_FROM_QA = {
  '숫자 검문: 근거 없는 숫자': '화면에 쓰는 숫자는 반드시 say와 참고 자료에 있는 숫자만 쓴다',
  '장면 속도: 너무 급함': '장면마다 say를 조금 더 길게 써서 목표 장면 길이를 지킨다',
  '장면 속도: 너무 느림': '긴 say는 두 장면으로 나눈다',
  '자막이 너무 빠름': 'say 한 문장은 25자 이내로 짧게 끊는다',
  '1초 넘게 멈춘 화면': '말이 긴 장면에는 움직이는 요소(typing, line, step)를 쓴다',
};

function renderLessons() {
  const list = store.get('lessons', []);
  $('lessons').innerHTML = '';
  list.forEach((l, i) => {
    const li = document.createElement('li');
    const sp = document.createElement('span'); sp.textContent = l;
    const del = document.createElement('button'); del.textContent = '✕'; del.setAttribute('aria-label', '삭제');
    del.onclick = () => { const a = store.get('lessons', []); a.splice(i, 1); store.set('lessons', a); renderLessons(); };
    li.append(sp, del);
    $('lessons').appendChild(li);
  });
}
function addLesson(text) {
  text = (text || '').trim();
  if (!text) return;
  const a = store.get('lessons', []);
  if (!a.includes(text)) a.push(text);
  store.set('lessons', a);
  renderLessons();
}

// ── 5. MP4 렌더 · 자동 제작 대기열 ──
const STEP_NAMES = { script: '대본·음성·검수', audio: '소리 믹스', frames: '화면 렌더', upload: '유튜브 업로드' };
let jobTimer = null;

function jobBody(extra) {
  const s = settings();
  return Object.assign({ cartesiaModel: s.cartesiaModel || '', cartesiaVersion: s.cartesiaVersion || '', llmEngine: llmEngine() }, extra);
}

async function renderMP4() {
  if (!SERVER) return alert('MP4 렌더는 서버(npm start)에서 동작합니다. 지금은 WebM 녹화를 쓰세요.');
  $('btn-mp4').disabled = true;
  try {
    await api('/api/render', jobBody({ script: SCRIPT, voices: exportVoices() }));
    status('queue-status', 'MP4 렌더를 대기열에 넣었습니다. 아래 5번 목록에서 진행 상황을 볼 수 있습니다.');
    pollJobs();
  } catch (e) { alert('렌더 요청 실패: ' + e.message); }
  finally { $('btn-mp4').disabled = false; }
}

async function queueTopics() {
  const topics = $('queue-topics').value.split('\n').map((t) => t.trim()).filter(Boolean);
  if (!topics.length) return status('queue-status', '주제를 한 줄에 하나씩 넣어 주세요.', true);
  $('btn-queue').disabled = true;
  try {
    const r = await api('/api/jobs', jobBody({
      topics, tone: selectedCard().id, length: $('length').value, aspect: currentAspect(), tts: currentTTS(), tts2: currentTTS2(),
      source: $('source').value.trim(), channel: $('channel').value.trim(), url: $('url').value.trim(),
      lessons: store.get('lessons', []), withVoice: $('queue-voice').checked, upload: $('queue-upload').checked, fonts: currentFonts(),
    }));
    status('queue-status', `${r.jobs.length}개 주제를 대기열에 넣었습니다. 한 편에 몇 분씩 걸립니다.`);
    $('queue-topics').value = '';
    pollJobs();
  } catch (e) { status('queue-status', '대기열 실패: ' + e.message, true); }
  finally { $('btn-queue').disabled = !SERVER; }
}

async function pollJobs() {
  if (!SERVER) return;
  let list = [];
  try { list = (await (await fetch('/api/jobs')).json()).jobs || []; } catch (e) { return; }
  const box = $('jobs');
  box.innerHTML = '';
  list.forEach((j) => {
    const li = document.createElement('li');
    li.className = j.status;
    const b = document.createElement('b');
    b.textContent = `${{ queued: '대기', running: '제작 중', done: '완료', error: '실패' }[j.status]} · ${j.kind === 'render' ? 'MP4 렌더' : '자동 제작'} · ${j.title}`;
    li.appendChild(b);
    const pre = document.createElement('pre');
    if (j.status === 'running') pre.textContent = `${STEP_NAMES[j.step] || '준비'} ${j.progress ?? 0}%`;
    else if (j.status === 'done') {
      const cp = j.cost ? priceOf(j.cost) : null;
      pre.textContent = [`${(j.duration || 0).toFixed(1)}초`, j.qaSummary ? `검수 ${j.qaSummary}` : '', cp ? `비용 ${fmtUsd(cp.usd)} ≈ ${fmtKrw(cp.krw)} (Claude ${fmtUsd(cp.claudeUsd)} · 음성 ${fmtNum(cp.chars)}자 ${fmtUsd(cp.ttsUsd)})` : '', ...(j.log || []).filter((l) => !l.startsWith('비용:'))].filter(Boolean).join('\n');
    }
    else if (j.status === 'error') pre.textContent = j.error;
    li.appendChild(pre);
    if (j.status === 'running') { const bar = document.createElement('div'); bar.className = 'bar'; bar.innerHTML = `<i style="width:${j.progress || 0}%"></i>`; li.appendChild(bar); }
    if (j.files) {
      const links = document.createElement('div');
      [['영상 MP4', j.files.mp4], ['컨택트시트', j.files.sheet], ['대본', j.files.dir + '/script.json'], ['유튜브 정보', j.files.dir + '/youtube.json']].forEach(([t, href]) => {
        const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t; links.appendChild(a);
      });
      if (j.youtube) { const a = document.createElement('a'); a.href = j.youtube.studio; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '유튜브 스튜디오(비공개)'; links.appendChild(a); }
      li.appendChild(links);
    }
    box.appendChild(li);
  });
  const active = list.some((j) => j.status === 'queued' || j.status === 'running');
  clearTimeout(jobTimer);
  if (active) jobTimer = setTimeout(pollJobs, 2000);
}

// ── 엔진이 부르는 UI 인터페이스 ──
const UI = {
  bgmOn() { return $('bgm').checked; },
  ttsOn() { return $('tts').checked; },
  init() {
    // 길이 선택
    Object.entries(LENGTHS).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v.label; $('length').appendChild(o); });
    $('length').value = lengthKey(store.get('length', 'standard'));
    $('length').onchange = () => { store.set('length', $('length').value); renderLengthNote(); updateEstimate(); };
    renderLengthNote();
    // 화면 비율: 고르면 지금 대본에도 바로 적용 (장면·음성은 그대로, 화면 배치만 바뀜)
    document.querySelectorAll('#aspect button').forEach((b) => {
      b.onclick = () => {
        store.set('aspect', b.dataset.v); renderAspect();
        if (SCRIPT && META().aspect !== b.dataset.v) { const s = JSON.parse(JSON.stringify(SCRIPT)); s.meta.aspect = b.dataset.v; applyScript(s, { keepTime: true }); }
        renderLengthNote();
      };
    });
    renderAspect();
    ['channel', 'url', 'source', 'topic'].forEach((id) => {
      $(id).value = store.get('f.' + id, id === 'channel' ? (META().channel || '') : '');
      $(id).addEventListener('change', () => store.set('f.' + id, $(id).value));
    });
    // 저장된 대본·톤 복원
    const saved = store.get('script', null);
    if (saved) { try { loadScript(saved); } catch (e) {} }
    const tone = store.get('tone', META().tone || 'stage');
    store.set('tone', tone);
    if (META().tone !== tone) { const s = JSON.parse(JSON.stringify(SCRIPT)); s.meta.tone = tone; loadScript(s); }
    renderTones();
    renderLessons();
    FONT_ROLES.forEach((r) => { $('font-' + r).onchange = chooseFonts; });
    $('font-search').oninput = renderFontSelects;
    $('font-ko-only').onchange = renderFontSelects;
    $('btn-fonts-rescan').onclick = async () => { status('font-status', '찾는 중…'); await loadUserFonts(true); renderFontSelects(); };
    $('font-file').onchange = (e) => { addFontFiles([...e.target.files]); e.target.value = ''; };
    loadUserFonts().then(async () => {
      renderFontSelects();
      const f = currentFonts();
      if (f) {
        await Promise.all(FONT_ROLES.map((r) => ensureGoogleFont(f[r])));
        if (!META().fonts) { const s = JSON.parse(JSON.stringify(SCRIPT)); s.meta.fonts = f; loadScript(s); }
      }
      await ensureScriptFonts([FONT_HEAD, FONT_BODY, FONT_CAPTION, FONT_NUM]);
    });
    if (!HEADLESS) restoreVoices().then((n) => { if (n) status('voice-status', `저장해 둔 음성 ${n}개를 불러왔습니다.`); });

    $('play').onclick = () => (playing ? pause() : play());
    $('restart').onclick = () => seek(0);
    $('seek').oninput = (e) => seek((e.target.value / 1000) * TOTAL);
    $('bgm').onchange = () => { if (playing) { pause(); play(); } };
    $('rec').onclick = () => { if (!recorder) record(); this.sync(); };
    $('btn-sheet').onclick = () => contactSheet();
    $('btn-script').onclick = makeScript;
    $('btn-topics').onclick = suggestTopics;
    $('btn-copy').onclick = async () => {
      const inp = promptInputs();
      if (!inp.topic) return status('script-status', '주제를 먼저 적어 주세요.', true);
      try { await navigator.clipboard.writeText(buildScriptPrompt(inp)); status('script-status', '프롬프트를 복사했습니다. Claude 대화창에 붙여 넣고, 받은 JSON을 "JSON 붙여넣기"로 넣으세요.'); }
      catch (e) { $('paste-box').hidden = false; $('paste').value = buildScriptPrompt(inp); status('script-status', '클립보드 접근이 막혀 아래 칸에 프롬프트를 넣었습니다. 직접 복사하세요.'); }
    };
    $('btn-paste').onclick = () => { $('paste-box').hidden = !$('paste-box').hidden; };
    $('btn-apply-paste').onclick = () => {
      try { applyScript(extractJSON($('paste').value)); $('paste-box').hidden = true; status('script-status', `적용했습니다: 장면 ${TL.length}개`); }
      catch (e) { status('script-status', 'JSON 오류: ' + e.message, true); }
    };
    $('btn-voice').onclick = makeVoices;
    $('btn-voice-clear').onclick = () => { Object.keys(VOICE).forEach((k) => delete VOICE[k]); voiceDB.clear(); loadScript(SCRIPT); $('voice-bar').style.width = '0'; status('voice-status', '음성을 지웠습니다.'); };
    $('btn-qa').onclick = doQA;
    $('btn-mp4').onclick = renderMP4;
    $('btn-all').onclick = makeAll;
    $('llm-engine').onchange = () => { const s = settings(); s.llmEngine = $('llm-engine').value; store.set('settings', s); renderLlmSelect(); updateEstimate(); renderCost(); };
    initVoicePickers();
    Object.entries(CARTESIA_PLANS).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v.label; $('c-plan').appendChild(o); });
    $('c-plan').onchange = () => { $('c-per1k-wrap').hidden = $('c-plan').value !== 'custom'; };
    ['topic', 'length', 'source'].forEach((id) => $(id).addEventListener('input', updateEstimate));
    renderRecentTopics(); updateEstimate();
    $('btn-queue').onclick = queueTopics;
    $('btn-lesson').onclick = () => { addLesson($('lesson').value); $('lesson').value = ''; };
    $('btn-json').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(SCRIPT, null, 2)], { type: 'application/json' }));
      a.download = (META().title || 'script') + '.json'; a.click();
    };
    $('btn-edit').onclick = () => { $('edit-box').hidden = !$('edit-box').hidden; $('editor').value = JSON.stringify(SCRIPT, null, 2); };
    $('btn-apply-edit').onclick = () => {
      try { applyScript(JSON.parse($('editor').value), { keepTime: true }); } catch (e) { alert('JSON 오류: ' + e.message); }
    };
    // 설정
    const dlg = $('settings');
    $('btn-settings').onclick = () => {
      const s = settings();
      $('k-anthropic').value = s.anthropicKey || ''; $('k-cartesia').value = s.cartesiaKey || '';
      const tk = s.ttsKeys || {}, tr = s.ttsRates || {};
      $('k-elevenlabs').value = tk.elevenlabs || ''; $('k-openai').value = tk.openai || ''; $('k-google').value = tk.google || '';
      $('k-clova-id').value = tk.clovaId || ''; $('k-clova-secret').value = tk.clovaSecret || '';
      ['elevenlabs', 'openai', 'google', 'clova'].forEach((k) => { $('r-' + k).value = tr[k] ?? ''; });
      $('c-model').value = s.cartesiaModel || ''; $('c-version').value = s.cartesiaVersion || '';
      $('c-plan').value = s.cartesiaPlan || 'pro'; $('c-per1k').value = s.cartesiaPer1k || ''; $('c-mult').value = s.creditMult || '1'; $('krw').value = s.krwRate || '1400';
      $('c-per1k-wrap').hidden = $('c-plan').value !== 'custom';
      dlg.showModal();
    };
    $('settings-close').onclick = () => dlg.close();
    $('settings-save').onclick = () => {
      store.set('settings', {
        anthropicKey: $('k-anthropic').value.trim(), cartesiaKey: $('k-cartesia').value.trim(), cartesiaModel: $('c-model').value.trim(), cartesiaVersion: $('c-version').value.trim(),
        cartesiaPlan: $('c-plan').value, cartesiaPer1k: $('c-per1k').value.trim(), creditMult: $('c-mult').value.trim(), krwRate: $('krw').value.trim(),
        ttsKeys: { elevenlabs: $('k-elevenlabs').value.trim(), openai: $('k-openai').value.trim(), google: $('k-google').value.trim(), clovaId: $('k-clova-id').value.trim(), clovaSecret: $('k-clova-secret').value.trim() },
        ttsRates: Object.fromEntries(['elevenlabs', 'openai', 'google', 'clova'].map((k) => [k, $('r-' + k).value.trim()]).filter(([, v]) => v !== '')),
      });
      renderCost(); updateEstimate();
      dlg.close(); checkServer();
    };
    // 드래그 앤 드롭
    const drop = $('drop');
    addEventListener('dragover', (e) => { e.preventDefault(); drop.style.display = 'flex'; });
    addEventListener('dragleave', (e) => { if (e.target === drop) drop.style.display = 'none'; });
    addEventListener('drop', (e) => {
      e.preventDefault(); drop.style.display = 'none';
      const f = e.dataTransfer.files[0];
      if (f) f.text().then((t) => { try { applyScript(JSON.parse(t)); } catch (err) { status('script-status', 'JSON 오류: ' + err.message, true); } });
    });
    checkServer();
    this.sync();
  },
  rebuild() {
    const box = $('scenes'); if (!box) return;
    setTimeout(renderCost, 0);
    box.innerHTML = '';
    TL.forEach((e) => {
      const b = document.createElement('button');
      b.textContent = `${e.i + 1}. ${e.s.beat || e.s.type}`;
      if (e.voice) { const v = document.createElement('span'); v.className = 'v'; v.textContent = '●'; b.appendChild(v); }
      b.title = stripMarks(e.s.say || '');
      b.onclick = () => seek(e.start + 0.01);
      box.appendChild(b);
    });
    document.title = (META().title ? META().title + ' – ' : '') + '톤 카드 영상 스튜디오';
  },
  sync() {
    $('play').textContent = playing ? '❚❚ 일시정지' : '▶ 재생';
    $('rec').textContent = recorder ? '● 녹화 중…' : '● WebM 녹화';
    $('rec').disabled = !!recorder;
  },
  frame() {
    $('seek').value = TOTAL ? Math.round((curT / TOTAL) * 1000) : 0;
    $('time').textContent = `${curT.toFixed(1)} / ${TOTAL.toFixed(1)}s`;
    const si = sceneAt(curT);
    [...$('scenes').children].forEach((b, i) => b.classList.toggle('on', i === si));
  },
};
