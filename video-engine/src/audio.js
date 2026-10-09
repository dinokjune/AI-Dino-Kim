// 효과음과 BGM을 Web Audio로 직접 합성한다(외부 음원 없음 → 저작권 걱정 없음).
const AE = {
  ctx: null, master: null, sfxBus: null, bgmGain: null, bgmSrc: null, bgmBuf: null,
  recDest: null, noise: null, voiceEl: null, voiceNode: null,

  init() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.recDest = ctx.createMediaStreamDestination();
    comp.connect(this.recDest);
    this.bgmGain = ctx.createGain(); this.bgmGain.gain.value = 0; this.bgmGain.connect(this.master);
    const len = ctx.sampleRate * 2, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;
    this.bgmBuf = renderBGM(ctx);
    this.newBus();
  },

  newBus() {
    if (this.sfxBus) this.sfxBus.disconnect();
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);
  },

  play(name, when, vol = 1) {
    const f = SFX[name];
    if (f) f(this.ctx, this.sfxBus, when, vol);
  },

  startBGM(offset, volume) {
    this.stopBGM();
    const src = this.ctx.createBufferSource();
    src.buffer = this.bgmBuf; src.loop = true;
    src.connect(this.bgmGain);
    src.start(this.ctx.currentTime + 0.03, offset % this.bgmBuf.duration);
    this.bgmSrc = src;
    this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bgmGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.3);
  },
  stopBGM() {
    if (this.bgmSrc) { try { this.bgmSrc.stop(); } catch (e) {} this.bgmSrc.disconnect(); this.bgmSrc = null; }
  },
  setBGMVolume(v) { this.bgmGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.15); },

  attachVoice(url) {
    if (!url) { this.voiceEl = null; return; }
    const el = new Audio(url); el.crossOrigin = 'anonymous'; el.preload = 'auto';
    this.voiceEl = el;
    this.voiceNode = this.ctx.createMediaElementSource(el);
    this.voiceNode.connect(this.master);
  },
};

// ── 신스 부품 ──
function envGain(ctx, out, when, a, peak, dcy) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + a);
  g.gain.exponentialRampToValueAtTime(0.0001, when + a + dcy);
  g.connect(out);
  return g;
}
function osc(ctx, type, f0, f1, when, dur, dest) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, when);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, when + dur);
  o.connect(dest); o.start(when); o.stop(when + dur + 0.05);
  return o;
}
function noiseSrc(ctx, when, dur, dest) {
  const s = ctx.createBufferSource(); s.buffer = AE.noise;
  s.connect(dest); s.start(when, Math.random()); s.stop(when + dur + 0.05);
  return s;
}
function filt(ctx, type, f, q, dest) {
  const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
  b.connect(dest); return b;
}

const SFX = {
  pop(ctx, out, w, v) { osc(ctx, 'sine', 420, 1150, w, 0.07, envGain(ctx, out, w, 0.004, 0.55 * v, 0.11)); },
  tick(ctx, out, w, v) { noiseSrc(ctx, w, 0.02, filt(ctx, 'highpass', 3500, 0.7, envGain(ctx, out, w, 0.001, 0.35 * v, 0.02))); },
  check(ctx, out, w, v) { osc(ctx, 'triangle', 880, 1320, w, 0.08, envGain(ctx, out, w, 0.004, 0.35 * v, 0.16)); },
  whoosh(ctx, out, w, v) {
    const g = envGain(ctx, out, w, 0.14, 0.45 * v, 0.28);
    const b = filt(ctx, 'bandpass', 400, 1.3, g);
    b.frequency.setValueAtTime(350, w); b.frequency.exponentialRampToValueAtTime(2600, w + 0.18);
    b.frequency.exponentialRampToValueAtTime(600, w + 0.42);
    noiseSrc(ctx, w, 0.45, b);
  },
  ding(ctx, out, w, v) {
    osc(ctx, 'sine', 1568, 1568, w, 1.0, envGain(ctx, out, w, 0.004, 0.28 * v, 0.9));
    osc(ctx, 'sine', 2349, 2349, w, 0.7, envGain(ctx, out, w, 0.004, 0.12 * v, 0.6));
  },
  chime(ctx, out, w, v) {
    [1047, 1319, 1568].forEach((f, i) => osc(ctx, 'triangle', f, f, w + i * 0.09, 0.8, envGain(ctx, out, w + i * 0.09, 0.005, 0.22 * v, 0.7)));
  },
  notify(ctx, out, w, v) {
    [988, 1480].forEach((f, i) => osc(ctx, 'sine', f, f, w + i * 0.08, 0.3, envGain(ctx, out, w + i * 0.08, 0.004, 0.3 * v, 0.25)));
  },
  stamp(ctx, out, w, v) {
    osc(ctx, 'sine', 150, 45, w, 0.2, envGain(ctx, out, w, 0.003, 0.9 * v, 0.22));
    noiseSrc(ctx, w, 0.08, filt(ctx, 'lowpass', 900, 0.7, envGain(ctx, out, w, 0.002, 0.45 * v, 0.07)));
  },
  snap(ctx, out, w, v) {
    noiseSrc(ctx, w, 0.03, filt(ctx, 'highpass', 2500, 0.7, envGain(ctx, out, w, 0.001, 0.4 * v, 0.03)));
    osc(ctx, 'square', 1700, 1200, w, 0.04, filt(ctx, 'lowpass', 3000, 0.7, envGain(ctx, out, w, 0.001, 0.08 * v, 0.04)));
  },
  curtain(ctx, out, w, v) {
    const g = envGain(ctx, out, w, 0.35, 0.3 * v, 0.9);
    const b = filt(ctx, 'lowpass', 700, 0.5, g);
    b.frequency.setValueAtTime(500, w); b.frequency.linearRampToValueAtTime(1400, w + 0.5); b.frequency.linearRampToValueAtTime(500, w + 1.2);
    noiseSrc(ctx, w, 1.3, b);
  },
  boing(ctx, out, w, v) {
    const g = envGain(ctx, out, w, 0.01, 0.35 * v, 0.45);
    const o = osc(ctx, 'sine', 240, 460, w, 0.45, g);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 14; lg.gain.value = 45; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(w); lfo.stop(w + 0.5);
  },
  paper(ctx, out, w, v) {
    const g = ctx.createGain(); g.connect(out);
    g.gain.setValueAtTime(0.0001, w);
    for (let i = 0; i < 8; i++) g.gain.setValueAtTime((0.1 + Math.random() * 0.25) * v, w + i * 0.03);
    g.gain.setValueAtTime(0.0001, w + 0.26);
    noiseSrc(ctx, w, 0.27, filt(ctx, 'bandpass', 2600, 0.8, g));
  },
  scan(ctx, out, w, v) {
    osc(ctx, 'sawtooth', 160, 1400, w, 0.9, filt(ctx, 'lowpass', 1800, 2, envGain(ctx, out, w, 0.1, 0.09 * v, 0.8)));
  },
  sweep(ctx, out, w, v) { osc(ctx, 'triangle', 300, 900, w, 0.5, envGain(ctx, out, w, 0.05, 0.12 * v, 0.45)); },
  buzz(ctx, out, w, v) { osc(ctx, 'square', 120, 110, w, 0.28, filt(ctx, 'lowpass', 1100, 0.7, envGain(ctx, out, w, 0.005, 0.18 * v, 0.28))); },
  riser(ctx, out, w, v) {
    const g = envGain(ctx, out, w, 0.9, 0.22 * v, 0.15);
    const b = filt(ctx, 'bandpass', 300, 2, g);
    b.frequency.setValueAtTime(250, w); b.frequency.exponentialRampToValueAtTime(4000, w + 1.0);
    noiseSrc(ctx, w, 1.1, b);
  },
};

// ── BGM: 어쿠스틱 기타 스트럼(카플러스-스트롱) + 베이스 + 셰이커, 8마디 루프 ──
function renderBGM(ctx) {
  const sr = ctx.sampleRate, bpm = 92, beat = 60 / bpm, bars = 8;
  const len = Math.ceil(bars * 4 * beat * sr);
  const L = new Float32Array(len), R = new Float32Array(len);
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const chords = {
    C: [48, 52, 55, 60, 64], G: [43, 47, 50, 55, 59, 67],
    Am: [45, 52, 57, 60, 64], F: [41, 48, 53, 57, 60],
  };
  const prog = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'];
  const roots = { C: 36, G: 31, Am: 33, F: 29 };
  // 8분음표 단위 스트럼 패턴: [박 위치, 방향(1=다운,-1=업), 세기]
  const pattern = [[0, 1, 1], [1, 1, 0.75], [1.5, -1, 0.5], [2.5, -1, 0.55], [3, 1, 0.8], [3.5, -1, 0.5]];

  function pluck(m, start, amp, pan) {
    const f = mtof(m), N = Math.max(2, Math.round(sr / f));
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
    for (let i = 1; i < N; i++) buf[i] = (buf[i] + buf[i - 1]) * 0.5; // 부드러운 음색
    const dur = Math.floor(sr * 1.3), s0 = Math.floor(start * sr);
    let idx = 0;
    for (let i = 0; i < dur && s0 + i < len; i++) {
      const cur = buf[idx], nxt = buf[(idx + 1) % N];
      buf[idx] = 0.993 * 0.5 * (cur + nxt);
      const v = cur * amp * (i < 40 ? i / 40 : 1);
      L[s0 + i] += v * (1 - pan); R[s0 + i] += v * pan;
      idx = (idx + 1) % N;
    }
  }

  for (let b = 0; b < bars; b++) {
    const ch = prog[b], notes = chords[ch], t0 = b * 4 * beat;
    pattern.forEach(([pos, dir, amp]) => {
      const ns = dir > 0 ? notes : notes.slice(-3).reverse();
      ns.forEach((m, i) => pluck(m, t0 + pos * beat + i * 0.013, 0.16 * amp, 0.3 + (i / ns.length) * 0.4));
    });
    // 베이스(1·3박) + 킥
    [0, 2].forEach((pos) => {
      const s0 = Math.floor((t0 + pos * beat) * sr), f = mtof(roots[ch]);
      for (let i = 0; i < sr * 0.6 && s0 + i < len; i++) {
        const tt = i / sr, e = Math.exp(-tt * 4);
        const v = (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(4 * Math.PI * f * tt)) * 0.22 * e;
        const kf = 50 + 70 * Math.exp(-tt * 30), kick = Math.sin(2 * Math.PI * kf * tt) * 0.35 * Math.exp(-tt * 14);
        L[s0 + i] += v + kick; R[s0 + i] += v + kick;
      }
    });
    // 셰이커 8분음표
    for (let e8 = 0; e8 < 8; e8++) {
      const s0 = Math.floor((t0 + e8 * beat * 0.5) * sr), amp = e8 % 2 ? 0.05 : 0.03;
      let prev = 0;
      for (let i = 0; i < sr * 0.07 && s0 + i < len; i++) {
        const n = Math.random() * 2 - 1, hp = n - prev; prev = n;
        const v = hp * amp * Math.exp(-i / (sr * 0.018));
        L[s0 + i] += v * 0.8; R[s0 + i] += v;
      }
    }
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = 0.8 / (peak || 1);
  const out = ctx.createBuffer(2, len, sr);
  const oL = out.getChannelData(0), oR = out.getChannelData(1);
  for (let i = 0; i < len; i++) { oL[i] = L[i] * k; oR[i] = R[i] * k; }
  return out;
}
