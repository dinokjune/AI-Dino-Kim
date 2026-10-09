// 스튜디오 화면 로직: 톤 카드 → 주제/대본 → 목소리 → 미리보기 → 검수

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('studio.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('studio.' + k, JSON.stringify(v)); } catch (e) {} },
};
const settings = () => store.get('settings', {});
let SERVER = null; // /api/status 결과, 없으면 오프라인

// ── 서버 호출 ──
async function api(path, body) {
  const s = settings();
  const headers = { 'Content-Type': 'application/json' };
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
  if (!SERVER) status('script-status', '서버 없이 열렸습니다. "프롬프트 복사" → Claude 대화창에 붙여넣기 → 받은 JSON을 "JSON 붙여넣기"로 넣으면 됩니다. 음성 생성은 서버(npm start)가 필요합니다.');
}

function status(id, msg, err) { const el = $(id); el.textContent = msg || ''; el.classList.toggle('err', !!err); }

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
  status('script-status', `"${inp.topic}" 대본을 쓰는 중… (톤: ${inp.card.name}, 보통 30초~2분)`);
  try {
    const r = await api('/api/claude', { prompt: buildScriptPrompt(inp), maxTokens: 32000 });
    const obj = extractJSON(r.text);
    obj.meta = Object.assign({ tone: inp.card.id, topic: inp.topic }, obj.meta || {}, { tone: inp.card.id });
    applyScript(obj);
    status('script-status', `완료: 장면 ${obj.scenes.length}개, 약 ${TOTAL.toFixed(0)}초. 다음은 목소리 입히기입니다.`);
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

// ── 3. 목소리 (Cartesia) ──
function b64ToArrayBuffer(b64) {
  const bin = atob(b64), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function makeVoices() {
  const voiceId = $('voice-id').value.trim();
  if (!voiceId && !(SERVER && SERVER.voiceId)) return status('voice-status', 'Cartesia 목소리 ID를 넣어 주세요.', true);
  store.set('voiceId', voiceId);
  SCRIPT.meta.voiceId = voiceId;
  AE.init();
  const s = settings();
  const todo = TL.filter((e) => e.s.say && !VOICE[voiceKey(e.s)]);
  if (!todo.length) return status('voice-status', '모든 장면에 이미 음성이 있습니다.');
  $('btn-voice').disabled = true;
  let done = 0, notes = [];
  const bar = $('voice-bar');
  const worker = async () => {
    while (todo.length) {
      const e = todo.shift();
      status('voice-status', `${done + 1}/${done + todo.length + 1} 장면 음성 생성 중…`);
      const r = await api('/api/tts', { text: stripMarks(e.s.say), voiceId, model: s.cartesiaModel || undefined, version: s.cartesiaVersion || undefined });
      const buffer = await AE.ctx.decodeAudioData(b64ToArrayBuffer(r.audio));
      VOICE[voiceKey(e.s)] = { buffer, duration: buffer.duration, words: r.words || [] };
      if (r.note) notes.push(r.note);
      done++;
      bar.style.width = `${(done / (done + todo.length)) * 100}%`;
    }
  };
  try {
    await Promise.all([worker(), worker()]);
    loadScript(SCRIPT);
    status('voice-status', `완료: ${done}개 장면. 영상 길이 ${TOTAL.toFixed(1)}초로 맞췄습니다.` + (notes.length ? `\n참고: ${notes[0]}` : ''));
  } catch (e) {
    loadScript(SCRIPT);
    status('voice-status', '음성 생성 실패: ' + e.message, true);
  } finally { $('btn-voice').disabled = !SERVER; }
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
    $('btn-voice-clear').onclick = () => { Object.keys(VOICE).forEach((k) => delete VOICE[k]); loadScript(SCRIPT); $('voice-bar').style.width = '0'; status('voice-status', '음성을 지웠습니다.'); };
    $('btn-qa').onclick = doQA;
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
      dlg.showModal();
    };
    $('settings-close').onclick = () => dlg.close();
    $('settings-save').onclick = () => {
      store.set('settings', { anthropicKey: $('k-anthropic').value.trim(), cartesiaKey: $('k-cartesia').value.trim(), cartesiaModel: $('c-model').value.trim(), cartesiaVersion: $('c-version').value.trim() });
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
