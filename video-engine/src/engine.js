// 타임라인 · 전환 · 주인공 연속성 · 자막 · 내레이션 · 재생/녹화/컨택트시트 · 검수

let SCRIPT = null, TL = [], TOTAL = 0, EVENTS = [], evIdx = 0;
let curT = 0, playing = false, ctxStart = 0, tStart = 0, lastSceneIdx = -1;
let recorder = null, recChunks = [];
const META = () => (SCRIPT && SCRIPT.meta) || {};
const HEADLESS = /[?&]headless=1/.test(location.search);

// 장면별 내레이션: key(대사 해시) → { buffer, duration, words:[{w,start,end}], wav(base64) }
const VOICE = {};
const VOICE_LEAD = 0.3;  // 장면 시작 후 말 시작까지
const VOICE_TAIL = 0.5;  // 말 끝난 뒤 장면 여유
function voiceKey(s) {
  const str = stripMarks(s.say || '') + '|' + (META().voiceId || '');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return 'v' + (h >>> 0).toString(36);
}

// 전환 (톤 카드의 "연결 방식"):
//   open 첫 장면 커튼, flow 배우가 걷는 동안 무대가 바뀜, slide 밀기, curtain 막 내렸다 올림,
//   zoom 밀고 들어가기, wipe 색 면 덮기, erase 칠판 지우기, glitch 지직 하드컷, cut 하드컷
const TR_DUR = { open: 1.3, flow: 0.8, slide: 0.6, curtain: 1.4, zoom: 0.9, wipe: 0.55, erase: 0.8, glitch: 0.3, cut: 0 };
const TR_SFX = { open: 'curtain', flow: 'whoosh', slide: 'whoosh', curtain: 'curtain', zoom: 'riser', wipe: 'whoosh', erase: 'paper', glitch: 'glitch' };

function autoDur(s) {
  const n = stripMarks(s.say || '').replace(/\s/g, '').length;
  return Math.max(3, n / (META().cps || 6.2) + 1.0);
}

// 자막 구간. 음성 단어 타임스탬프가 있으면 그대로 따르고, 없으면 글자 수 비례로 나눈다.
function buildCaps(s, d, voice, lead) {
  if (s.caption === false || !s.say) return [];
  const parts = (s.caption || s.say).split(/(?<=[.?!。…])\s+/).map((x) => x.trim()).filter(Boolean);
  if (voice && voice.words && voice.words.length) {
    const ws = voice.words;
    let wi = 0;
    return parts.map((p, i) => {
      const n = stripMarks(p).split(/\s+/).filter(Boolean).length;
      const first = ws[Math.min(wi, ws.length - 1)], last = ws[Math.min(wi + n - 1, ws.length - 1)];
      wi += n;
      const a = lead + (i === 0 ? 0 : first.start) - 0.05;
      return { a: Math.max(0, a), b: lead + last.end + 0.25, text: p };
    }).map((c, i, arr) => ({ ...c, b: i < arr.length - 1 ? arr[i + 1].a : Math.max(c.b, d - 0.1) }));
  }
  const w = parts.map((p) => Math.max(4, stripMarks(p).length));
  const sum = w.reduce((a, b) => a + b, 0);
  const a0 = voice ? lead : 0.15, span = (voice ? voice.duration : d - 0.25) || d - 0.25;
  let acc = a0;
  return parts.map((p, i) => { const len = (span * w[i]) / sum; const c = { a: acc, b: acc + len, text: p }; acc += len; return c; })
    .map((c, i, arr) => (i === arr.length - 1 ? { ...c, b: Math.max(c.b, d - 0.1) } : c));
}

function defaultTransition(i, s) {
  if (i === 0) return TONE.engine.curtains ? 'open' : 'cut';
  if (s.type === 'endcard' && TONE.engine.curtains) return 'curtain';
  return META().transition || TONE.engine.transition;
}

function loadScript(obj) {
  SCRIPT = obj;
  setTone(META().tone || 'stage');
  applyFontOverride(META().fonts);
  if (document.fonts) { document.fonts.load(`64px "${FONT_HEAD}"`); document.fonts.load(`40px "${FONT_BODY}"`); }
  let acc = 0;
  TL = SCRIPT.scenes.map((s, i) => {
    const def = SCENES[s.type];
    if (!def) console.warn('알 수 없는 장면 타입:', s.type);
    let tr = s.transition || defaultTransition(i, s);
    // 커튼이 없는 톤에서는 커튼 전환을 그 톤의 기본 전환으로 바꾼다
    if (!TONE.engine.curtains && (tr === 'curtain' || tr === 'open')) tr = i === 0 ? 'cut' : TONE.engine.transition;
    const trd = s.trDur ?? TR_DUR[tr] ?? 0.7;
    const voice = VOICE[voiceKey(s)];
    const lead = (tr === 'curtain' ? trd * 0.5 : 0) + VOICE_LEAD;
    let d = s.dur || autoDur(s);
    if (voice) d = Math.max(s.dur || 0, lead + voice.duration + VOICE_TAIL, 2.5);
    const e = { s, i, def, start: acc, d, tr, trd, lead, voice, wall: wallColor(s.wall || 'cream') };
    e.caps = buildCaps(s, d, voice, lead);
    acc += d;
    return e;
  });
  TOTAL = acc;
  const quiet = TONE.engine.quietSfx ? 0.35 : 1;
  EVENTS = [];
  TL.forEach((e) => {
    if (e.trd > 0 && TR_SFX[e.tr]) EVENTS.push({ T: e.start + (e.tr === 'curtain' ? e.trd * 0.1 : 0), name: TONE.engine.quietSfx && e.tr === 'zoom' ? 'boom' : TR_SFX[e.tr], vol: (e.tr === 'flow' ? 0.45 : 0.7) * quiet });
    if (TONE.engine.hero === 'cursor' && e.i > 0) EVENTS.push({ T: e.start + Math.max(0.05, e.trd - 0.1), name: 'click', vol: 0.8 });
    const cues = e.def && e.def.cues ? e.def.cues(e.s, e.d) : [];
    const shift = e.tr === 'curtain' ? e.trd * 0.5 : 0;
    cues.forEach((c) => EVENTS.push({ T: e.start + shift + c.at, name: c.name, vol: (c.vol ?? 1) * quiet }));
    (e.s.sfx || []).forEach((c) => EVENTS.push({ T: e.start + c.at, name: c.name, vol: c.vol ?? 1 }));
  });
  EVENTS.sort((a, b) => a.T - b.T);
  if (AE.ctx && META().voice) AE.attachVoice(META().voice);
  curT = Math.min(curT, Math.max(0, TOTAL - 0.01));
  UI.rebuild();
}

function sceneAt(T) {
  let i = TL.findIndex((e) => T < e.start + e.d);
  if (i < 0) i = TL.length - 1;
  return i;
}

function mascotOf(e) {
  if (!e || e.s.mascot === false || TONE.engine.hero !== 'dino') return null;
  const base = (e.def && e.def.mascot) || null;
  if (!base && !e.s.mascot) return null;
  return Object.assign({}, base || { x: 300, y: FLOOR_Y + 40, s: 1, mood: 'happy' }, e.s.mood ? { mood: e.s.mood } : {}, e.s.mascot || {});
}

function contentTime(e, t) { return e.tr === 'curtain' ? t - e.trd * 0.5 : t; }

function drawContent(e, t) {
  const ct = Math.max(0, contentTime(e, t));
  SCENE_I = e.i; SCENE_T = ct;
  CURRENT_WALL = effectiveWall(e.wall, e.i, ct);
  if (!e.def) return;
  push();
  // 카메라: 시네마·다큐는 느린 전진, 플랫은 박자마다 펀치 줌
  if (TONE.engine.drift) {
    const z = 1 + 0.035 * (ct / Math.max(1, e.d)) + 0.006 * Math.sin(NOW * 0.5);
    translate(W / 2 + Math.sin(NOW * 0.21) * 10, H / 2 + Math.cos(NOW * 0.17) * 6); scale(z); translate(-W / 2, -H / 2);
  } else if (TONE.engine.beat) {
    const b = TONE.engine.beat, z = 1 + 0.018 * Math.exp(-((ct % b) * 9));
    translate(W / 2, H / 2); scale(z); translate(-W / 2, -H / 2);
  }
  e.def.draw(e.s, ct, e.d);
  pop();
}

function drawBgFor(e, t) {
  SCENE_I = e.i; SCENE_T = Math.max(0, contentTime(e, t));
  drawStage(e.wall);
}

function renderAt(T) {
  NOW = T;
  const i = sceneAt(T), e = TL[i], prev = TL[i - 1];
  const t = T - e.start;
  const inTr = e.trd > 0 && t < e.trd && (prev || e.tr === 'open');
  const p = inTr ? clamp01(t / e.trd) : 1, k = easeInOut(p);
  let curtain = 0, mascot = null, post = null;
  const mNow = mascotOf(e), mPrev = mascotOf(prev);

  if (!inTr || e.tr === 'cut' || (e.tr === 'open' && !prev)) {
    drawBgFor(e, t); drawContent(e, t);
    if (inTr && e.tr === 'open') curtain = 1 - k;
    mascot = mNow && { ...mNow };
  } else if (e.tr === 'curtain') {
    const closing = p < 0.5, src = closing ? prev : e;
    drawBgFor(src, closing ? prev.d + t : t);
    drawContent(src, closing ? prev.d + t : t);
    curtain = Math.min(1, (closing ? p * 2 : (1 - p) * 2) * 1.15);
    const m = closing ? mPrev : mNow;
    mascot = m && { ...m };
  } else if (e.tr === 'wipe' || e.tr === 'erase' || e.tr === 'glitch') {
    const early = e.tr === 'glitch' ? p < 0.4 : p < 0.5;
    const src = early ? prev : e, st = early ? prev.d + t : t;
    drawBgFor(src, st); drawContent(src, st);
    mascot = blendMascot(mPrev, mNow, k, false);
    post = () => {
      if (e.tr === 'glitch') drawGlitch(p);
      else drawWipe(p, e.tr === 'erase' ? e.wall : (e.wall === prev.wall ? PAL.yellow : effectiveWall(e.wall, e.i, 0)), e.tr === 'erase');
    };
  } else if (e.tr === 'zoom') {
    drawBgFor(e, t);
    push(); translate(W / 2, H / 2); scale(1 + k * 0.6); translate(-W / 2, -H / 2);
    withAlpha(1 - k, () => drawContent(prev, prev.d + t)); pop();
    push(); translate(W / 2, H / 2); scale(0.85 + 0.15 * k); translate(-W / 2, -H / 2);
    withAlpha(k, () => drawContent(e, t)); pop();
    mascot = blendMascot(mPrev, mNow, k, false);
  } else {
    // flow / slide
    if (e.tr === 'slide') {
      push(); translate(-W * k, 0); drawBgFor(prev, prev.d + t); drawContent(prev, prev.d + t); pop();
      push(); translate(W * (1 - k), 0); drawBgFor(e, t); drawContent(e, t); pop();
    } else {
      const dist = W * 0.45;
      SCENE_I = e.i; SCENE_T = t;
      drawStage(lerpColor(color(effectiveWall(prev.wall, prev.i, prev.d)), color(effectiveWall(e.wall, e.i, 0)), k).toString('#rrggbb'));
      push(); translate(-dist * k, 0); withAlpha(1 - Math.min(1, k * 1.6), () => drawContent(prev, prev.d + t)); pop();
      push(); translate(dist * (1 - k), 0); withAlpha(Math.min(1, k * 1.4), () => drawContent(e, t)); pop();
    }
    mascot = blendMascot(mPrev, mNow, k, true);
  }

  // 주인공
  if (mascot && mascot.k !== 0) drawDino(mascot.x, mascot.y, mascot.s * (mascot.k ?? 1), mascot.mood, T, mascot.walking);
  if (TONE.engine.hero === 'cursor' || TONE.engine.hero === 'orb') {
    const a = heroSpot(prev), b = heroSpot(e);
    const hk = inTr && a ? easeInOut(clamp01(t / Math.max(0.01, e.trd - 0.15))) : 1;
    const pos = a && inTr ? { x: lerp(a.x, b.x, hk), y: lerp(a.y, b.y, hk) - Math.sin(hk * PI) * 80 } : b;
    if (TONE.engine.hero === 'cursor') drawCursor(pos.x, pos.y, i > 0 ? clamp01((t - (e.trd - 0.1)) / 0.45) : 0);
    else drawOrb(pos.x, pos.y);
  }

  if (post) post();
  if (e.s.type === 'endcard' && e.s.closeCurtain !== false && TONE.engine.curtains) curtain = Math.max(curtain, inK(t, e.d - 1.4, 1.2));
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

// ── 자막: 줄바꿈 계산 후 톤별 스타일로 그린다 ──
function drawCaption(e, t) {
  const c = e.caps.find((c) => t >= c.a && t < c.b);
  if (!c) return;
  const size = META().captionSize || 64, maxW = 1580;
  const font = TONE.engine.caption === 'mono' ? 'Nanum Gothic Coding' : FONT_HEAD;
  textFont(font); textStyle(HEAD_BOLD.includes(font) ? BOLD : NORMAL); textSize(size);
  const toks = parseMarked(c.text), lines = [[]];
  let lw = 0;
  toks.forEach((tk) => {
    const w = textWidth(tk.w);
    if (lw + w > maxW && lines[lines.length - 1].length && tk.w.trim()) { lines.push([]); lw = 0; }
    if (!lines[lines.length - 1].length && !tk.w.trim()) return;
    lines[lines.length - 1].push(tk); lw += w;
  });
  drawCaptionStyled(lines, inK(t, c.a, 0.15), size);
}

// ── 재생 제어 ──
function voiceClips() {
  return TL.filter((e) => e.voice && e.voice.buffer).map((e) => ({ buffer: e.voice.buffer, at: e.start + e.lead }));
}

function play() {
  AE.init();
  if (AE.ctx.state === 'suspended') AE.ctx.resume();
  if (!AE.voiceEl && META().voice) AE.attachVoice(META().voice);
  if (curT >= TOTAL - 0.05) curT = 0;
  playing = true;
  ctxStart = AE.ctx.currentTime + 0.05; tStart = curT;
  evIdx = EVENTS.findIndex((ev) => ev.T >= curT - 0.01); if (evIdx < 0) evIdx = EVENTS.length;
  AE.newBus();
  const clips = voiceClips();
  if (UI.bgmOn()) AE.startBGM(curT, bgmVolume(clips.length > 0), TONE.engine.bgm);
  AE.startVoices(clips, curT, ctxStart);
  if (AE.voiceEl) { AE.voiceEl.currentTime = curT; AE.voiceEl.play(); }
  lastSceneIdx = -1;
  UI.sync();
}

// 내레이션이 있으면 음악을 한 단계 낮춘다 (목소리가 묻히지 않게)
function bgmVolume(hasVoice) { return (META().bgmVolume ?? 0.22) * (hasVoice ? 0.55 : 1); }

function pause() {
  playing = false;
  if (AE.ctx) { AE.newBus(); AE.stopBGM(); AE.stopVoices(); }
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
  if (curT < tStart) curT = tStart;
  while (evIdx < EVENTS.length && EVENTS[evIdx].T < curT + 0.25) {
    const ev = EVENTS[evIdx++];
    const when = ctxStart + (ev.T - tStart);
    if (when >= AE.ctx.currentTime - 0.02) AE.play(ev.name, Math.max(AE.ctx.currentTime, when), ev.vol);
  }
  if (AE.bgmSrc) AE.setBGMVolume(bgmVolume(AE.voiceSrcs.length > 0) * clamp01((TOTAL - curT) / 3));
  const si = sceneAt(curT);
  if (si !== lastSceneIdx) {
    lastSceneIdx = si;
    if (UI.ttsOn() && !TL[si].voice && window.speechSynthesis && TL[si].s.say) {
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

// ── 녹화: 캔버스 + 효과음 + BGM + 내레이션을 WebM으로 ──
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
  const sheet = buildContactSheet();
  saveCanvas(sheet, (META().title || 'video') + '-contact-sheet', 'png');
  sheet.remove();
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
  if (HEADLESS) noLoop();
}

function draw() {
  tick();
  renderAt(curT);
  UI.frame();
}

function keyPressed() {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
  if (key === ' ') { playing ? pause() : play(); return false; }
  if (keyCode === LEFT_ARROW) seek(curT - 2);
  if (keyCode === RIGHT_ARROW) seek(curT + 2);
}
