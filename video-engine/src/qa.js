// 두 겹 검수: 사실·숫자는 기계로, 느낌은 컨택트시트로 눈으로.
// 만든 AI에게 "잘 됐어?"라고 묻지 않고, 화면을 직접 재서 톤 카드 목표와 비교한다.

function numbersIn(str) {
  return (String(str || '').match(/\d[\d,]*(?:\.\d+)?/g) || []).map((n) => n.replace(/,/g, ''));
}

function onScreenStrings(s) {
  const out = [];
  const add = (v, where) => { if (v !== undefined && v !== null && v !== '') out.push({ v: String(v), where }); };
  add(s.text, 'text'); add(s.sub, 'sub'); add(s.label, 'label'); add(s.title, 'title');
  if (s.value !== undefined) add(String(s.value) + (s.suffix || ''), 'value');
  if (s.likes) add(s.likes, 'likes');
  (s.items || []).forEach((it, i) => {
    if (typeof it === 'string') add(it, `items[${i}]`);
    else ['text', 'title', 'label', 'note', 'num'].forEach((k) => add(it[k], `items[${i}].${k}`));
  });
  (s.steps || []).forEach((st, i) => { add(st.value, `steps[${i}].value`); add(st.label, `steps[${i}].label`); });
  ['left', 'right'].forEach((k) => s[k] && ['label', 'text'].forEach((f) => add(s[k][f], `${k}.${f}`)));
  (s.labels || []).forEach((l, i) => add(l, `labels[${i}]`));
  return out;
}

// 화면 숫자 중 내레이션·주제·참고 자료에 없는 것 (렌더 없이 대본만으로 검사 → 음성 만들기 전에 걸러 낸다)
function numberIssues(source = '') {
  const allowed = new Set();
  [source, META().topic, META().title, META().source, ...TL.map((e) => e.s.say)].forEach((t) => numbersIn(t).forEach((n) => allowed.add(n)));
  const bad = [];
  TL.forEach((e) => {
    const s = e.s;
    onScreenStrings(s).forEach(({ v, where }) => numbersIn(v).forEach((n) => {
      if (allowed.has(n)) return;
      if (s.type === 'step' || (s.type === 'cards' && where.endsWith('.num'))) return; // 단계 번호
      if (/^[0-9]$/.test(n) && where.startsWith('labels')) return;
      bad.push(`${e.i + 1}번(${s.type}) ${where}: "${v}"`);
    }));
  });
  return bad;
}

// 캔버스를 작게 줄여 밝기와 움직임을 잰다
const QA_CANVAS = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 36; return c; })();
function sampleFrame(T) {
  renderAt(T);
  const g = QA_CANVAS.getContext('2d', { willReadFrequently: true });
  g.drawImage(drawingContext.canvas, 0, 0, 64, 36);
  return g.getImageData(0, 0, 64, 36).data;
}
function lumaOf(px) {
  let s = 0;
  for (let i = 0; i < px.length; i += 4) s += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
  return s / (px.length / 4);
}
function diffOf(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return s / (a.length / 4) / 3;
}

async function runQA({ source = '' } = {}) {
  const res = [];
  const R = (level, title, detail) => res.push({ level, title, detail });
  const card = TONE, tg = card.targets;
  const wasT = curT, wasPlaying = playing;
  if (wasPlaying) pause();

  // 1) 숫자 검문: 화면 숫자가 내레이션·주제·참고 자료에 실제로 있는가
  const bad = numberIssues(source);
  if (bad.length) R('fail', '숫자 검문: 근거 없는 숫자', `내레이션·주제·참고 자료에 없는 숫자가 화면에 있습니다. 출처를 확인하거나 say에 같은 숫자를 넣으세요.\n· ${bad.join('\n· ')}`);
  else R('pass', '숫자 검문', '화면에 나오는 숫자가 모두 내레이션이나 참고 자료에 있습니다.');

  // 2) 장면 속도: 평균 장면 길이가 목표의 ±30% 안인가
  const avg = TOTAL / Math.max(1, TL.length);
  const ratio = avg / tg.cutSec;
  if (ratio < 0.7) R('warn', '장면 속도: 너무 급함', `평균 ${avg.toFixed(1)}초 (목표 ${tg.cutSec}초의 ${(ratio * 100).toFixed(0)}%). 대사를 조금 늘리거나 장면을 합치세요.`);
  else if (ratio > 1.3) R('warn', '장면 속도: 너무 느림', `평균 ${avg.toFixed(1)}초 (목표 ${tg.cutSec}초의 ${(ratio * 100).toFixed(0)}%). 긴 장면을 둘로 나누세요.`);
  else R('pass', '장면 속도', `평균 ${avg.toFixed(1)}초 / 목표 ${tg.cutSec}초 (±30% 안)`);

  // 3) 밝기 + 4) 움직임·정지 화면: 0.5초 간격으로 재기
  const step = 0.5, lumas = [], diffs = [];
  let prev = null, still = 0, flagged = false;
  const stillAt = [];
  for (let T = 0.05; T < TOTAL; T += step) {
    const px = sampleFrame(T);
    lumas.push(lumaOf(px));
    if (prev) {
      const d = diffOf(prev, px);
      diffs.push(d);
      if (d < 0.25) { still += step; if (still >= 1.0 && !flagged) { stillAt.push(T - still); flagged = true; } }
      else { still = 0; flagged = false; }
    }
    prev = px;
    if (lumas.length % 20 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  const L = lumas.reduce((a, b) => a + b, 0) / lumas.length;
  if (L < tg.brightness[0] || L > tg.brightness[1]) R('warn', '톤 이탈: 밝기', `평균 밝기 ${L.toFixed(0)} / 목표 ${tg.brightness[0]}~${tg.brightness[1]}. 장면 wall 색이 톤과 맞는지 보세요.`);
  else R('pass', '밝기', `평균 ${L.toFixed(0)} / 목표 ${tg.brightness[0]}~${tg.brightness[1]}`);
  const M = diffs.reduce((a, b) => a + b, 0) / Math.max(1, diffs.length);
  if (M < tg.motion[0] || M > tg.motion[1]) R('warn', '톤 이탈: 움직임 양', `평균 변화량 ${M.toFixed(2)} / 목표 ${tg.motion[0]}~${tg.motion[1]}`);
  else R('pass', '움직임 양', `평균 변화량 ${M.toFixed(2)} / 목표 ${tg.motion[0]}~${tg.motion[1]}`);
  if (stillAt.length) R('warn', '1초 넘게 멈춘 화면', stillAt.map((t) => `${t.toFixed(1)}초 부근`).join(', ') + ' – 작은 움직임을 넣거나 장면을 줄이세요.');
  else R('pass', '정지 화면 없음', '1초 넘게 아무것도 움직이지 않는 구간이 없습니다.');

  // 5) 자막: 읽는 속도와 줄 수
  const fast = [];
  TL.forEach((e) => e.caps.forEach((c) => {
    const n = stripMarks(c.text).replace(/\s/g, '').length, sec = c.b - c.a;
    if (n / Math.max(0.3, sec) > 9) fast.push(`${e.i + 1}번: "${stripMarks(c.text).slice(0, 18)}…" (${(n / sec).toFixed(1)}자/초)`);
  }));
  if (fast.length) R('warn', '자막이 너무 빠름', '초당 9자를 넘으면 휴대폰에서 읽기 어렵습니다.\n· ' + fast.join('\n· '));
  else R('pass', '자막 속도', '모든 자막이 초당 9자 이하입니다.');

  // 6) 내레이션 음량: 장면끼리 6dB 넘게 차이 나는가
  const voiced = TL.filter((e) => e.voice && e.voice.buffer);
  if (voiced.length) {
    const db = voiced.map((e) => {
      const d = e.voice.buffer.getChannelData(0); let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i] * d[i];
      return { i: e.i, db: 10 * Math.log10(s / (d.length / 4) + 1e-9) };
    });
    const med = db.map((x) => x.db).sort((a, b) => a - b)[Math.floor(db.length / 2)];
    const off = db.filter((x) => Math.abs(x.db - med) > 6);
    if (off.length) R('warn', '내레이션 음량 차이', off.map((x) => `${x.i + 1}번 장면 ${(x.db - med).toFixed(1)}dB`).join(', '));
    else R('pass', '내레이션 음량', `장면 간 차이 6dB 이내 (중앙값 ${med.toFixed(1)}dBFS)`);
    const missing = TL.filter((e) => e.s.say && !e.voice).length;
    if (missing) R('warn', '음성 없는 장면', `${missing}개 장면에 아직 음성이 없습니다.`);
  } else R('info', '내레이션', '아직 생성된 음성이 없습니다. 음성을 만든 뒤 다시 검수하면 음량도 확인합니다.');

  curT = wasT;
  if (wasPlaying) play();
  return res;
}
