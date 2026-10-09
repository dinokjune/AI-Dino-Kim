// 타임라인 · 전환 · 마스코트 연속성 · 자막 · 재생/녹화/컨택트시트

let SCRIPT = null, TL = [], TOTAL = 0, EVENTS = [], evIdx = 0;
let curT = 0, playing = false, ctxStart = 0, tStart = 0, lastSceneIdx = -1;
let recorder = null, recChunks = [];
const META = () => (SCRIPT && SCRIPT.meta) || {};

// 장면 전환 기본값 (톤 카드의 "연결 방식"):
//   open    첫 장면 – 커튼이 열림
//   flow    기본 – 배우(디노)가 걸어가는 사이 무대가 바뀌는 연속 전환
//   slide   화면 전체 밀기, curtain 막 내렸다 올리기, zoom 밀고 들어가기, cut 하드컷
const TR_DUR = { open: 1.3, flow: 0.8, slide: 0.6, curtain: 1.4, zoom: 0.7, cut: 0 };
const TR_SFX = { open: 'curtain', flow: 'whoosh', slide: 'whoosh', curtain: 'curtain', zoom: 'riser' };

function autoDur(s) {
  const n = stripMarks(s.say || '').replace(/\s/g, '').length;
  return Math.max(3, n / (META().cps || 6.2) + 1.0);
}

function buildCaps(s, d) {
  if (s.caption === false || !s.say) return [];
  const parts = (s.caption || s.say).split(/(?<=[.?!。…])\s+/).map((x) => x.trim()).filter(Boolean);
  const w = parts.map((p) => Math.max(4, stripMarks(p).length));
  const sum = w.reduce((a, b) => a + b, 0), a0 = 0.15, span = d - 0.25;
  let acc = a0;
  return parts.map((p, i) => { const len = (span * w[i]) / sum; const c = { a: acc, b: acc + len, text: p }; acc += len; return c; });
}

function loadScript(obj) {
  SCRIPT = obj;
  PAL = TONES[META().tone] || TONES.stage;
  let acc = 0;
  TL = SCRIPT.scenes.map((s, i) => {
    const def = SCENES[s.type];
    if (!def) console.warn('알 수 없는 장면 타입:', s.type);
    const d = s.dur || autoDur(s);
    const tr = s.transition || (i === 0 ? 'open' : s.type === 'endcard' ? 'curtain' : META().transition || 'flow');
    const trd = s.trDur ?? TR_DUR[tr] ?? 0.7;
    const e = { s, i, def, start: acc, d, tr, trd, wall: wallColor(s.wall || 'cream'), caps: buildCaps(s, d) };
    acc += d;
    return e;
  });
  TOTAL = acc;
  // 효과음 이벤트 목록 (전환음 + 장면 cues + 사용자 지정 sfx)
  EVENTS = [];
  TL.forEach((e) => {
    if (e.trd > 0 && TR_SFX[e.tr]) EVENTS.push({ T: e.start + (e.tr === 'curtain' ? e.trd * 0.1 : 0), name: TR_SFX[e.tr], vol: e.tr === 'flow' ? 0.45 : 0.7 });
    const cues = e.def && e.def.cues ? e.def.cues(e.s, e.d) : [];
    const shift = e.tr === 'curtain' ? e.trd * 0.5 : 0;
    cues.forEach((c) => EVENTS.push({ T: e.start + shift + c.at, name: c.name, vol: c.vol ?? 1 }));
    (e.s.sfx || []).forEach((c) => EVENTS.push({ T: e.start + c.at, name: c.name, vol: c.vol ?? 1 }));
  });
  EVENTS.sort((a, b) => a.T - b.T);
  if (AE.ctx) AE.attachVoice(META().voice);
  curT = 0;
  UI.rebuild();
}

function sceneAt(T) {
  let i = TL.findIndex((e) => T < e.start + e.d);
  if (i < 0) i = TL.length - 1;
  return i;
}

function mascotOf(e) {
  if (!e || e.s.mascot === false) return null;
  const base = (e.def && e.def.mascot) || null;
  if (!base && !e.s.mascot) return null;
  return Object.assign({}, base || { x: 300, y: FLOOR_Y + 40, s: 1, mood: 'happy' }, e.s.mood ? { mood: e.s.mood } : {}, e.s.mascot || {});
}

// 장면 내용: 커튼 전환 중간 이후에 장면 시간이 시작되도록 보정
function contentTime(e, t) { return e.tr === 'curtain' ? t - e.trd * 0.5 : t; }

function drawContent(e, t) {
  CURRENT_WALL = e.wall;
  if (e.def) { push(); e.def.draw(e.s, Math.max(0, contentTime(e, t)), e.d); pop(); }
}

function renderAt(T) {
  const i = sceneAt(T), e = TL[i], prev = TL[i - 1];
  const t = T - e.start;
  const inTr = e.trd > 0 && t < e.trd && (prev || e.tr === 'open');
  const p = inTr ? clamp01(t / e.trd) : 1, k = easeInOut(p);
  let curtain = 0, mascot = null;

  const mNow = mascotOf(e), mPrev = mascotOf(prev);

  if (!inTr || e.tr === 'cut' || (e.tr === 'open' && !prev)) {
    drawStage(e.wall); drawContent(e, t);
    if (inTr && e.tr === 'open') curtain = 1 - k;
    mascot = mNow && { ...mNow };
  } else if (e.tr === 'curtain') {
    const closing = p < 0.5;
    const src = closing ? prev : e;
    drawStage(src.wall);
    drawContent(src, closing ? prev.d + t : t);
    curtain = closing ? p * 2 : (1 - p) * 2;
    curtain = Math.min(1, curtain * 1.15);
    const m = closing ? mPrev : mNow;
    mascot = m && { ...m };
  } else if (e.tr === 'zoom') {
    drawStage(lerpColor(color(prev.wall), color(e.wall), k).toString('#rrggbb'));
    push(); translate(W / 2, H / 2); scale(1 + k * 0.6); translate(-W / 2, -H / 2);
    withAlpha(1 - k, () => drawContent(prev, prev.d + t)); pop();
    push(); translate(W / 2, H / 2); scale(0.85 + 0.15 * k); translate(-W / 2, -H / 2);
    withAlpha(k, () => drawContent(e, t)); pop();
    mascot = blendMascot(mPrev, mNow, k, false);
  } else {
    // flow / slide
    const full = e.tr === 'slide';
    const dist = full ? W : W * 0.45;
    if (full) {
      push(); translate(-W * k, 0); drawStage(prev.wall); drawContent(prev, prev.d + t); pop();
      push(); translate(W * (1 - k), 0); drawStage(e.wall); drawContent(e, t); pop();
    } else {
      drawStage(lerpColor(color(prev.wall), color(e.wall), k).toString('#rrggbb'));
      push(); translate(-dist * k, 0); withAlpha(1 - Math.min(1, k * 1.6), () => drawContent(prev, prev.d + t)); pop();
      push(); translate(dist * (1 - k), 0); withAlpha(Math.min(1, k * 1.4), () => drawContent(e, t)); pop();
    }
    mascot = blendMascot(mPrev, mNow, k, true);
  }

  if (mascot && mascot.k !== 0) {
    const ks = mascot.k ?? 1;
    drawDino(mascot.x, mascot.y, mascot.s * ks, mascot.mood, T, mascot.walking);
  }

  // 엔드카드는 끝에서 막을 내린다
  if (e.s.type === 'endcard' && e.s.closeCurtain !== false) curtain = Math.max(curtain, inK(t, e.d - 1.4, 1.2));
  drawCurtains(curtain);
  drawGrainAndVignette();
  drawCaption(e, t);
}

function blendMascot(a, b, k, walk) {
  if (a && b) {
    const moving = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 4;
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k), mood: k < 0.5 ? a.mood : b.mood, walking: walk && moving && k < 0.98 };
  }
  if (b) return { ...b, k: popK(k, 0, 1) };
  if (a) return { ...a, k: 1 - easeOut(k) };
  return null;
}

// ── 자막: 흰 글자 + 진한 외곽선, 하단 중앙, *강조*는 노랑 ──
function drawCaption(e, t) {
  const c = e.caps.find((c) => t >= c.a && t < c.b);
  if (!c) return;
  const size = META().captionSize || 64, maxW = 1580;
  textFont(FONT_HEAD); textSize(size);
  const toks = parseMarked(c.text), lines = [[]];
  let lw = 0;
  toks.forEach((tk) => {
    const w = textWidth(tk.w);
    if (lw + w > maxW && lines[lines.length - 1].length && tk.w.trim()) { lines.push([]); lw = 0; }
    if (!lines[lines.length - 1].length && !tk.w.trim()) return;
    lines[lines.length - 1].push(tk); lw += w;
  });
  const k = inK(t, c.a, 0.15);
  const baseY = H - 70 - (lines.length - 1) * size * 1.2;
  textAlign(LEFT, CENTER); strokeJoin(ROUND);
  lines.forEach((ln, li) => {
    const tw = ln.reduce((a, tk) => a + textWidth(tk.w), 0);
    let x = W / 2 - tw / 2;
    const y = baseY + li * size * 1.2 + (1 - k) * 12;
    ln.forEach((tk) => {
      stroke('#222222'); strokeWeight(size * 0.2);
      fill(tk.hi ? PAL.yellow : '#FFFFFF');
      withAlpha(k, () => text(tk.w, x, y));
      x += textWidth(tk.w);
    });
  });
  noStroke();
}

// ── 재생 제어 ──
function play() {
  AE.init();
  if (AE.ctx.state === 'suspended') AE.ctx.resume();
  if (!AE.voiceEl && META().voice) AE.attachVoice(META().voice);
  if (curT >= TOTAL - 0.05) curT = 0;
  playing = true;
  ctxStart = AE.ctx.currentTime; tStart = curT;
  evIdx = EVENTS.findIndex((ev) => ev.T >= curT - 0.01); if (evIdx < 0) evIdx = EVENTS.length;
  AE.newBus();
  if (UI.bgmOn()) AE.startBGM(curT, META().bgmVolume ?? 0.22);
  if (AE.voiceEl) { AE.voiceEl.currentTime = curT; AE.voiceEl.play(); }
  lastSceneIdx = -1;
  UI.sync();
}

function pause() {
  playing = false;
  if (AE.ctx) { AE.newBus(); AE.stopBGM(); }
  if (AE.voiceEl) AE.voiceEl.pause();
  if (window.speechSynthesis) speechSynthesis.cancel();
  UI.sync();
}

function seek(T) {
  const was = playing;
  if (was) pause();
  curT = Math.max(0, Math.min(TOTAL - 0.001, T));
  if (was) play();
}

function tick() {
  if (!playing) return;
  curT = tStart + (AE.ctx.currentTime - ctxStart);
  // 효과음 룩어헤드 스케줄링
  while (evIdx < EVENTS.length && EVENTS[evIdx].T < curT + 0.25) {
    const ev = EVENTS[evIdx++];
    const when = ctxStart + (ev.T - tStart);
    if (when >= AE.ctx.currentTime - 0.02) AE.play(ev.name, Math.max(AE.ctx.currentTime, when), ev.vol);
  }
  // BGM 마지막 3초 페이드아웃
  if (AE.bgmSrc) AE.setBGMVolume((META().bgmVolume ?? 0.22) * clamp01((TOTAL - curT) / 3));
  // 미리보기용 TTS (녹화에는 포함되지 않음)
  const si = sceneAt(curT);
  if (si !== lastSceneIdx) {
    lastSceneIdx = si;
    if (UI.ttsOn() && window.speechSynthesis && TL[si].s.say) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(stripMarks(TL[si].s.say));
      u.lang = 'ko-KR'; u.rate = META().ttsRate || 1.1;
      speechSynthesis.speak(u);
    }
  }
  if (curT >= TOTAL) {
    curT = TOTAL - 0.001;
    pause();
    if (recorder) recorder.stop();
  }
}

// ── 녹화: 캔버스 + 합성 오디오를 WebM으로 ──
function record() {
  AE.init();
  const stream = document.querySelector('#stage canvas').captureStream(META().fps || 30);
  AE.recDest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
  recChunks = [];
  recorder.ondataavailable = (ev) => ev.data.size && recChunks.push(ev.data);
  recorder.onstop = () => {
    const blob = new Blob(recChunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (META().title || 'video') + '.webm';
    a.click();
    recorder = null; UI.sync();
  };
  pause(); curT = 0;
  recorder.start(500);
  play();
}

// ── 컨택트 시트: 영상 전체를 24장으로 펼쳐 1분 안에 눈으로 검수 ──
function contactSheet() {
  const cols = 6, rows = 4, tw = 320, th = 180, pad = 8;
  const sheet = createGraphics(cols * (tw + pad) + pad, rows * (th + pad + 26) + pad);
  sheet.background('#1F2A30');
  sheet.textFont(FONT_BODY); sheet.textSize(16); sheet.fill(255);
  const was = curT;
  for (let i = 0; i < cols * rows; i++) {
    const T = ((i + 0.5) * TOTAL) / (cols * rows);
    renderAt(T);
    const img = get();
    const x = pad + (i % cols) * (tw + pad), y = pad + Math.floor(i / cols) * (th + pad + 26);
    sheet.image(img, x, y, tw, th);
    sheet.text(`#${sceneAt(T) + 1} ${TL[sceneAt(T)].s.type} · ${T.toFixed(1)}s`, x + 4, y + th + 18);
  }
  saveCanvas(sheet, (META().title || 'video') + '-contact-sheet', 'png');
  sheet.remove();
  curT = was;
}

// ── p5 ──
function setup() {
  const c = createCanvas(W, H);
  c.parent('stage');
  pixelDensity(1);
  frameRate(30);
  buildGrain();
  loadScript(window.SCRIPT_DATA);
  UI.init();
}

function draw() {
  tick();
  renderAt(curT);
  UI.frame();
}

function keyPressed() {
  if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
  if (key === ' ') { playing ? pause() : play(); return false; }
  if (keyCode === LEFT_ARROW) seek(curT - 2);
  if (keyCode === RIGHT_ARROW) seek(curT + 2);
}
