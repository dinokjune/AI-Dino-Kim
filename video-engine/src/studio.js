// 스튜디오 화면 로직: 톤 카드 → 주제/대본 → 목소리 → 미리보기 → 검수

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('studio.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('studio.' + k, JSON.stringify(v)); } catch (e) {} },
};
const settings = () => store.get('settings', {});
let SERVER = null; // /api/status 결과, 없으면 오프라인

// ── 서버 호출 ──
async function api(path, body, tag) {
  const s = settings();
  const headers = { 'Content-Type': 'application/json' };
  const t = tag || (SCRIPT && (META().topic || META().title)) || '';
  if (t) headers['x-cost-tag'] = encodeURIComponent(t);
  if (s.anthropicKey) headers['x-anthropic-key'] = s.anthropicKey;
  if (s.cartesiaKey) headers['x-cartesia-key'] = s.cartesiaKey;
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
  const s = settings();
  const set = (id, on, txt) => { const el = $(id); el.textContent = txt; el.className = 'badge ' + (on ? 'on' : 'off'); };
  set('st-server', !!SERVER, SERVER ? '서버 연결됨' : '오프라인 모드');
  set('st-claude', SERVER && (SERVER.claudeKey || s.anthropicKey), 'Claude ' + (SERVER && (SERVER.claudeKey || s.anthropicKey) ? '준비' : '키 없음'));
  set('st-voice', SERVER && (SERVER.cartesiaKey || s.cartesiaKey), 'Cartesia ' + (SERVER && (SERVER.cartesiaKey || s.cartesiaKey) ? '준비' : '키 없음'));
  $('btn-script').disabled = !SERVER;
  $('btn-topics').disabled = !SERVER;
  $('btn-voice').disabled = !SERVER;
  $('btn-queue').disabled = !SERVER;
  $('queue-upload').disabled = !(SERVER && SERVER.youtube);
  $('queue-upload').title = SERVER && SERVER.youtube ? '' : '유튜브 업로드 설정(README 참고)을 하면 켤 수 있습니다';
  if (SERVER) { pollJobs(); refreshLedger(); }
  if ($('font-head') && userFontsPromise) userFontsPromise.then(renderFontSelects);
  if (!SERVER) status('script-status', '서버 없이 열렸습니다. "프롬프트 복사" → Claude 대화창에 붙여넣기 → 받은 JSON을 "JSON 붙여넣기"로 넣으면 됩니다. 음성 생성은 서버(npm start)가 필요합니다.');
}

function status(id, msg, err) { const el = $(id); el.textContent = msg || ''; el.classList.toggle('err', !!err); }

// ── 내 글꼴 ──
function currentFonts() {
  const f = store.get('fonts', {}) || {};
  return f.head || f.body ? { head: f.head || '', body: f.body || '' } : null;
}

function renderFontSelects() {
  const cur = store.get('fonts', {}) || {};
  const card = selectedCard();
  const fill = (id, toneDefault, val) => {
    const sel = $(id);
    sel.innerHTML = '';
    const d = document.createElement('option'); d.value = ''; d.textContent = `톤 기본 (${toneDefault})`; sel.appendChild(d);
    USER_FONTS.forEach((f) => { const o = document.createElement('option'); o.value = f.family; o.textContent = `${f.family}  · ${f.source}`; sel.appendChild(o); });
    sel.value = USER_FONTS.some((f) => f.family === val) ? val : '';
  };
  fill('font-head', card.engine.fontHead, cur.head);
  fill('font-body', card.engine.fontBody, cur.body);
  $('fp-head').style.fontFamily = `"${$('font-head').value || card.engine.fontHead}"`;
  $('fp-body').style.fontFamily = `"${$('font-body').value || card.engine.fontBody}"`;
  const bySrc = {};
  USER_FONTS.forEach((f) => { const k = f.source.split(' · ')[0]; bySrc[k] = (bySrc[k] || 0) + 1; });
  status('font-status', USER_FONTS.length
    ? `글꼴 ${USER_FONTS.length}개를 찾았습니다 (${Object.entries(bySrc).map(([k, v]) => `${k} ${v}`).join(', ')}).`
    : (SERVER ? '다운로드 폴더나 video-engine/fonts 폴더에서 글꼴을 찾지 못했습니다. 글꼴 파일을 넣고 "다시 찾기"를 누르거나 "글꼴 파일 추가"로 올리세요.' : '서버 없이 열어 다운로드 폴더를 볼 수 없습니다. "글꼴 파일 추가"로 고르면 이 화면에서만 쓸 수 있습니다.'));
}

async function chooseFonts() {
  const f = { head: $('font-head').value, body: $('font-body').value };
  store.set('fonts', f);
  status('font-status', '글꼴을 불러오는 중…');
  await ensureFonts([f.head, f.body]);
  const s = JSON.parse(JSON.stringify(SCRIPT));
  s.meta.fonts = currentFonts();
  if (!s.meta.fonts) delete s.meta.fonts;
  applyScript(s, { keepTime: true });
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
function promptInputs() {
  return {
    topic: $('topic').value.trim(), card: selectedCard(), length: $('length').value,
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
  obj.meta.voiceId = $('voice-id').value.trim();
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
      ...inp, voiceId: $('voice-id').value.trim(), fonts: currentFonts(),
      onStep: (n) => status('script-status', n ? '근거 없는 숫자나 형식 오류가 있어 한 번 더 쓰는 중…' : `"${inp.topic}" 대본을 쓰는 중… (톤: ${inp.card.name}, 보통 30초~2분)`),
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

// ── 3. 목소리 (Cartesia) ──
// 실패하면 예외를 던진다 (화면 버튼과 자동 제작이 같이 쓴다)
async function generateVoices({ voiceId, onProgress } = {}) {
  const s = settings();
  SCRIPT.meta.voiceId = voiceId || '';
  loadScript(SCRIPT); // voiceId가 바뀌면 장면 키도 바뀐다
  AE.init();
  const todo = TL.filter((e) => e.s.say && !VOICE[voiceKey(e.s)]);
  const total = todo.length;
  let done = 0; const notes = [];
  const worker = async () => {
    while (todo.length) {
      const e = todo.shift();
      const r = await api('/api/tts', { text: stripMarks(e.s.say), voiceId, model: s.cartesiaModel || undefined, version: s.cartesiaVersion || undefined });
      const buffer = await AE.ctx.decodeAudioData(base64ToArrayBuffer(r.audio));
      VOICE[voiceKey(e.s)] = { buffer, duration: buffer.duration, words: r.words || [], wav: r.audio };
      voiceDB.put(voiceKey(e.s), { audio: r.audio, words: r.words || [] });
      if (r.note) notes.push(r.note);
      addCost(r.cost);
      done++;
      if (onProgress) onProgress(done, total);
    }
  };
  try { await Promise.all([worker(), worker()]); }
  finally { loadScript(SCRIPT); }
  return { done, notes };
}

async function makeVoices() {
  const voiceId = $('voice-id').value.trim();
  if (!voiceId && !(SERVER && SERVER.voiceId)) return status('voice-status', 'Cartesia 목소리 ID를 넣어 주세요.', true);
  store.set('f.voice-id', voiceId);
  $('btn-voice').disabled = true;
  const bar = $('voice-bar');
  try {
    const { done, notes } = await generateVoices({
      voiceId,
      onProgress: (d, t) => { bar.style.width = `${(d / t) * 100}%`; status('voice-status', `${d}/${t} 장면 음성 생성 중…`); },
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
async function writeScript({ topic, card, length = 'standard', source = '', lessons = [], channel = '', url = '', voiceId = '', fonts = null, onStep }) {
  const log = [];
  const run = emptyCost();
  let issues = [], last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (onStep) onStep(attempt);
    const extra = attempt ? ['지난 시도에서 문제가 있었다: ' + issues.join(' / ') + ' → 형식을 지키고, 화면 숫자는 say와 참고 자료에 있는 것만 쓴다'] : [];
    const r = await api('/api/claude', { prompt: buildScriptPrompt({ topic, card, length, source, lessons: [...lessons, ...extra], channel, url }), maxTokens: 32000 }, topic);
    addCost(r.cost, run);
    let obj;
    try { obj = extractJSON(r.text); } catch (e) { issues = [e.message]; log.push(`대본 ${attempt + 1}차: JSON 오류`); continue; }
    const errs = validateScript(obj);
    if (errs.length) { issues = errs; log.push(`대본 ${attempt + 1}차: 형식 오류 ${errs.length}개`); continue; }
    obj.meta = Object.assign({}, obj.meta, { tone: card.id, topic, source, voiceId, cost: run });
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

// 화면 없이 주제 하나를 끝까지 만든다: 대본(재작성 포함) → 음성 → 검수
// 서버의 자동 제작 대기열이 헤드리스 브라우저에서 부른다.
async function autopilot({ topic, tone, length = 'standard', voiceId = '', source = '', channel = '', url = '', lessons = [], withVoice = true, fonts = null }) {
  if (fonts) { await loadUserFonts(); await ensureFonts([fonts.head, fonts.body]); }
  const card = TONE_CARDS.find((c) => c.id === tone) || TONE_CARDS[0];
  const { log } = await writeScript({ topic, card, length, source, lessons, channel, url, voiceId, fonts });
  if (withVoice) {
    const v = await generateVoices({ voiceId });
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
  const pend = pendingTtsChars() * cs.creditMult;
  const rows = [
    ['대본 (Claude)', c.claude.calls ? `${fmtNum(c.claude.input)} 입력 · ${fmtNum(c.claude.output)} 출력 토큰` : '아직 없음', fmtUsd(p.claudeUsd)],
    ['음성 (Cartesia)', c.tts.calls ? `${fmtNum(p.credits)} 크레딧` : '아직 없음', fmtUsd(p.ttsUsd)],
    ['렌더 · 검수', '내 컴퓨터에서 처리', '$0'],
  ];
  let html = '<table>' + rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') +
    `<tr class="sum"><td>이 영상 합계</td><td>${fmtKrw(p.krw)} (환율 ${fmtNum(cs.krw)}원 기준)</td><td>${fmtUsd(p.usd)}</td></tr></table>`;
  if (pend > 0) html += `<div class="hint" style="margin:8px 0 0">음성을 만들면 약 ${fmtNum(pend)}크레딧(${fmtUsd(pend * cs.usdPerCredit)}, ${fmtKrw(pend * cs.usdPerCredit * cs.krw)})이 더 듭니다.</div>`;
  if (ledgerCache) {
    const m = ledgerCache.month;
    const mUsd = m.claudeUsd + m.ttsChars * cs.creditMult * cs.usdPerCredit;
    html += `<div class="hint" style="margin:8px 0 0">이번 달(${ledgerCache.monthKey}) 누적: Claude ${fmtUsd(m.claudeUsd)} (${m.claudeCalls}회) · 음성 ${fmtNum(m.ttsChars * cs.creditMult)}크레딧 → 합계 ${fmtUsd(mUsd)} ≈ ${fmtKrw(mUsd * cs.krw)}</div>`;
  }
  box.innerHTML = html;
}

// ── 한 번에 완성: 주제 → 대본 → 내 목소리 → 검수 → MP4 ──
async function makeAll() {
  const inp = promptInputs();
  if (!inp.topic) return status('all-status', '주제를 적거나 아래 추천 주제를 눌러 고르세요.', true);
  if (!SERVER) return status('all-status', '한 번에 완성은 서버(npm start)에서 동작합니다. 지금은 "프롬프트 복사"를 쓰세요.', true);
  const voiceId = $('voice-id').value.trim();
  const btn = $('btn-all'); btn.disabled = true;
  const step = (n, msg) => status('all-status', `[${n}/4] ${msg}`);
  try {
    step(1, `"${inp.topic}" 대본을 쓰는 중… (${inp.card.name} 톤)`);
    const r = await writeScript({ ...inp, voiceId, fonts: currentFonts(), onStep: (a) => a && step(1, '근거 없는 숫자나 형식 오류가 있어 한 번 더 쓰는 중…') });
    curT = firstLook(); store.set('script', SCRIPT); renderCost();
    if (voiceId || (SERVER && SERVER.voiceId)) {
      await generateVoices({ voiceId, onProgress: (d, t) => { step(2, `내 목소리 ${d}/${t} 장면`); $('voice-bar').style.width = `${(d / t) * 100}%`; } });
      store.set('script', SCRIPT); renderCost();
    } else step(2, '목소리 ID가 없어 음성은 건너뜁니다');
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
  return Object.assign({ cartesiaModel: s.cartesiaModel || '', cartesiaVersion: s.cartesiaVersion || '' }, extra);
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
      topics, tone: selectedCard().id, length: $('length').value, voiceId: $('voice-id').value.trim(),
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
      pre.textContent = [`${(j.duration || 0).toFixed(1)}초`, j.qaSummary ? `검수 ${j.qaSummary}` : '', cp ? `비용 ${fmtUsd(cp.usd)} ≈ ${fmtKrw(cp.krw)} (Claude ${fmtUsd(cp.claudeUsd)} · 음성 ${fmtNum(cp.credits)}크레딧)` : '', ...(j.log || []).filter((l) => !l.startsWith('비용:'))].filter(Boolean).join('\n');
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
    $('length').value = store.get('length', 'standard');
    $('length').onchange = () => store.set('length', $('length').value);
    ['channel', 'url', 'voice-id', 'source', 'topic'].forEach((id) => {
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
    $('font-head').onchange = chooseFonts;
    $('font-body').onchange = chooseFonts;
    $('btn-fonts-rescan').onclick = async () => { status('font-status', '찾는 중…'); await loadUserFonts(true); renderFontSelects(); };
    $('font-file').onchange = (e) => { addFontFiles([...e.target.files]); e.target.value = ''; };
    loadUserFonts().then(async () => {
      renderFontSelects();
      const f = currentFonts();
      if (f) { await ensureFonts([f.head, f.body]); if (!META().fonts) { const s = JSON.parse(JSON.stringify(SCRIPT)); s.meta.fonts = f; loadScript(s); } }
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
