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
    this.bgmCache = {};
    this.voiceGain = ctx.createGain(); this.voiceGain.gain.value = 1; this.voiceGain.connect(this.master);
    this.voiceSrcs = [];
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

  bgm(preset) {
    if (!this.bgmCache[preset]) this.bgmCache[preset] = renderBGM(this.ctx, preset);
    return this.bgmCache[preset];
  },

  startBGM(offset, volume, preset = 'acoustic') {
    this.stopBGM();
    const src = this.ctx.createBufferSource();
    this.bgmBuf = this.bgm(preset);
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

  // 장면별 내레이션(AudioBuffer)을 타임라인에 맞춰 예약한다
  startVoices(clips, fromT, ctxAt) {
    this.stopVoices();
    clips.forEach(({ buffer, at }) => {
      const end = at + buffer.duration;
      if (end <= fromT) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer; src.connect(this.voiceGain);
      const delay = Math.max(0, at - fromT), offset = Math.max(0, fromT - at);
      src.start(ctxAt + delay, offset);
      this.voiceSrcs.push(src);
    });
  },
  stopVoices() {
    this.voiceSrcs.forEach((s) => { try { s.stop(); } catch (e) {} s.disconnect(); });
    this.voiceSrcs = [];
  },

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
  click(ctx, out, w, v) {
    noiseSrc(ctx, w, 0.012, filt(ctx, 'bandpass', 3200, 2, envGain(ctx, out, w, 0.001, 0.5 * v, 0.02)));
    osc(ctx, 'sine', 1800, 900, w, 0.03, envGain(ctx, out, w, 0.001, 0.15 * v, 0.03));
  },
  glitch(ctx, out, w, v) {
    for (let i = 0; i < 5; i++) osc(ctx, 'square', 200 + Math.random() * 1800, 100 + Math.random() * 400, w + i * 0.035, 0.03, envGain(ctx, out, w + i * 0.035, 0.001, 0.12 * v, 0.03));
    noiseSrc(ctx, w, 0.2, filt(ctx, 'highpass', 1500, 0.7, envGain(ctx, out, w, 0.005, 0.18 * v, 0.18)));
  },
  boom(ctx, out, w, v) {
    osc(ctx, 'sine', 90, 32, w, 1.2, envGain(ctx, out, w, 0.01, 0.7 * v, 1.2));
    noiseSrc(ctx, w, 0.6, filt(ctx, 'lowpass', 300, 0.7, envGain(ctx, out, w, 0.02, 0.25 * v, 0.6)));
  },
  riser(ctx, out, w, v) {
    const g = envGain(ctx, out, w, 0.9, 0.22 * v, 0.15);
    const b = filt(ctx, 'bandpass', 300, 2, g);
    b.frequency.setValueAtTime(250, w); b.frequency.exponentialRampToValueAtTime(4000, w + 1.0);
    noiseSrc(ctx, w, 1.1, b);
  },
};

// ── BGM: 톤별 프리셋을 코드로 합성한 8마디 루프 (외부 음원 없음) ──
const BGM_PRESETS = {
  acoustic: { bpm: 92, prog: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], inst: 'strum', drums: 'soft' },
  ukulele: { bpm: 112, prog: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'], inst: 'strum', oct: 12, drums: 'soft' },
  synth: { bpm: 110, prog: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'], inst: 'arp', drums: 'four' },
  bouncy: { bpm: 120, prog: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G'], inst: 'stab', drums: 'clap' },
  ambient: { bpm: 72, prog: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'], inst: 'pad', drums: 'none', bell: true },
  pad: { bpm: 60, prog: ['Am', 'F', 'C', 'Em', 'Am', 'F', 'Dm', 'Em'], inst: 'pad', drums: 'none', low: true },
  lofi: { bpm: 80, prog: ['Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'Em', 'Am'], inst: 'ep', drums: 'lofi' },
};
const CHORDS = {
  C: [48, 52, 55, 60, 64], G: [43, 47, 50, 55, 59, 67], Am: [45, 52, 57, 60, 64], F: [41, 48, 53, 57, 60],
  Dm: [50, 57, 62, 65], Em: [40, 47, 52, 55, 59, 64], Bb: [46, 53, 58, 62, 65],
};
const ROOTS = { C: 36, G: 31, Am: 33, F: 29, Dm: 38, Em: 28, Bb: 34 };

function renderBGM(ctx, presetName = 'acoustic') {
  const P = BGM_PRESETS[presetName] || BGM_PRESETS.acoustic;
  const sr = ctx.sampleRate, beat = 60 / P.bpm, bars = P.prog.length;
  const len = Math.ceil(bars * 4 * beat * sr);
  const L = new Float32Array(len), R = new Float32Array(len);
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const put = (i, v, pan = 0.5) => { if (i >= 0 && i < len) { L[i] += v * (1.5 - pan); R[i] += v * (0.5 + pan); } };

  function pluck(m, start, amp, pan, decay = 0.993, dur = 1.3) {
    const f = mtof(m), N = Math.max(2, Math.round(sr / f));
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
    for (let i = 1; i < N; i++) buf[i] = (buf[i] + buf[i - 1]) * 0.5;
    const s0 = Math.floor(start * sr);
    let idx = 0;
    for (let i = 0; i < sr * dur && s0 + i < len; i++) {
      const cur = buf[idx], nxt = buf[(idx + 1) % N];
      buf[idx] = decay * 0.5 * (cur + nxt);
      put(s0 + i, cur * amp * (i < 40 ? i / 40 : 1), pan);
      idx = (idx + 1) % N;
    }
  }
  // 범용 신스 음: saw | square | sine | ep(전자피아노) | bell, 1차 저역통과 포함
  function tone(m, start, dur, amp, type, { a = 0.005, r = 0.2, cutoff = 4000, pan = 0.5, det = 0 } = {}) {
    const f = mtof(m) * (1 + det), s0 = Math.floor(start * sr), n = Math.floor((dur + r) * sr);
    const kLP = 1 - Math.exp(-2 * Math.PI * cutoff / sr);
    let ph = 0, lp = 0;
    for (let i = 0; i < n && s0 + i < len; i++) {
      const t = i / sr;
      ph += f / sr; ph -= Math.floor(ph);
      let v;
      if (type === 'saw') v = 2 * ph - 1;
      else if (type === 'square') v = ph < 0.5 ? 0.7 : -0.7;
      else if (type === 'ep') v = Math.sin(2 * Math.PI * ph) * (1 + 0.15 * Math.sin(2 * Math.PI * 5 * t)) + 0.25 * Math.sin(4 * Math.PI * ph) * Math.exp(-t * 6);
      else if (type === 'bell') v = Math.sin(2 * Math.PI * ph) + 0.4 * Math.sin(2 * Math.PI * ph * 2.76) * Math.exp(-t * 4);
      else v = Math.sin(2 * Math.PI * ph);
      lp += (v - lp) * kLP;
      const env = t < a ? t / a : t < dur ? 1 : Math.max(0, 1 - (t - dur) / r);
      const dec = type === 'ep' || type === 'bell' ? Math.exp(-t * 1.6) : 1;
      put(s0 + i, lp * amp * env * dec, pan);
    }
  }
  function noiseHit(start, dur, amp, hp = true, pan = 0.5, tau = 0.02) {
    const s0 = Math.floor(start * sr); let prev = 0, lp = 0;
    for (let i = 0; i < sr * dur && s0 + i < len; i++) {
      const n = Math.random() * 2 - 1;
      let v;
      if (hp) { v = n - prev; prev = n; } else { lp += (n - lp) * 0.08; v = lp * 3; }
      put(s0 + i, v * amp * Math.exp(-i / (sr * tau)), pan);
    }
  }
  function kick(start, amp) {
    const s0 = Math.floor(start * sr);
    for (let i = 0; i < sr * 0.35 && s0 + i < len; i++) {
      const t = i / sr, kf = 48 + 80 * Math.exp(-t * 32);
      put(s0 + i, Math.sin(2 * Math.PI * kf * t) * amp * Math.exp(-t * 11));
    }
  }

  const oct = P.oct || 0;
  for (let b = 0; b < bars; b++) {
    const ch = P.prog[b], notes = CHORDS[ch], t0 = b * 4 * beat, root = ROOTS[ch];
    if (P.inst === 'strum') {
      [[0, 1, 1], [1, 1, 0.75], [1.5, -1, 0.5], [2.5, -1, 0.55], [3, 1, 0.8], [3.5, -1, 0.5]].forEach(([pos, dir, amp]) => {
        const ns = dir > 0 ? notes : notes.slice(-3).reverse();
        ns.forEach((m, i) => pluck(m + oct, t0 + pos * beat + i * 0.013, 0.16 * amp, 0.3 + (i / ns.length) * 0.4, oct ? 0.985 : 0.993));
      });
    } else if (P.inst === 'arp') {
      const arp = [...notes.slice(1), notes[2] + 12];
      for (let k = 0; k < 16; k++) tone(arp[k % arp.length] + 12, t0 + k * beat / 4, beat / 4 * 0.8, 0.09, 'saw', { cutoff: 1800 + 1400 * Math.sin(b + k / 4), r: 0.08, pan: k % 2 ? 0.35 : 0.65 });
      notes.slice(1, 4).forEach((m, i) => tone(m, t0, 4 * beat, 0.035, 'saw', { a: 0.3, r: 0.6, cutoff: 900, det: (i - 1) * 0.004 }));
    } else if (P.inst === 'stab') {
      [0.5, 1.5, 2.5, 3.5].forEach((pos) => notes.slice(1, 4).forEach((m, i) => tone(m + 12, t0 + pos * beat, beat * 0.25, 0.06, 'square', { cutoff: 2600, r: 0.05, pan: 0.4 + i * 0.1 })));
      tone(notes[notes.length - 1] + 12 + (b % 2 ? 2 : 0), t0, beat * 0.5, 0.05, 'square', { cutoff: 3000, r: 0.1 });
    } else if (P.inst === 'pad') {
      notes.slice(0, 4).forEach((m, i) => [-0.006, 0, 0.006].forEach((d) => tone(m + (P.low ? -12 : 0), t0, 4 * beat, 0.03, 'saw', { a: 1.2, r: 1.5, cutoff: P.low ? 600 : 1100, det: d, pan: 0.3 + i * 0.13 })));
      if (P.bell) [0, 1.5, 3].forEach((pos, k) => tone(notes[(k + b) % notes.length] + 24, t0 + pos * beat, 0.3, 0.05, 'bell', { r: 1.2, pan: 0.3 + k * 0.2 }));
    } else if (P.inst === 'ep') {
      [0, 1.5, 2.5].forEach((pos, k) => notes.slice(1, 4).forEach((m, i) => tone(m, t0 + pos * beat + (k % 2) * beat * 0.12, beat * 0.9, 0.07, 'ep', { cutoff: 1600, r: 0.4, pan: 0.35 + i * 0.15 })));
    }
    // 베이스
    if (P.inst !== 'pad') [0, 2].forEach((pos) => tone(root + (P.inst === 'arp' ? 12 : 0), t0 + pos * beat, beat * 1.4, 0.16, 'sine', { r: 0.2, cutoff: 600 }));
    else tone(root - 12, t0, 4 * beat, 0.12, 'sine', { a: 0.8, r: 1, cutoff: 300 });
    // 드럼
    if (P.drums === 'soft') {
      [0, 2].forEach((p) => kick(t0 + p * beat, 0.32));
      for (let e = 0; e < 8; e++) noiseHit(t0 + e * beat / 2, 0.07, e % 2 ? 0.05 : 0.03, true, 0.55, 0.018);
    } else if (P.drums === 'four') {
      for (let q = 0; q < 4; q++) { kick(t0 + q * beat, 0.42); noiseHit(t0 + q * beat + beat / 2, 0.06, 0.06, true, 0.6, 0.012); }
      [1, 3].forEach((q) => noiseHit(t0 + q * beat, 0.18, 0.12, false, 0.5, 0.05));
    } else if (P.drums === 'clap') {
      for (let q = 0; q < 4; q++) kick(t0 + q * beat, q % 2 ? 0.25 : 0.4);
      [1, 3].forEach((q) => [0, 0.012, 0.024].forEach((d) => noiseHit(t0 + q * beat + d, 0.12, 0.09, true, 0.5, 0.03)));
      for (let e = 0; e < 8; e++) noiseHit(t0 + e * beat / 2, 0.04, 0.03, true, 0.65, 0.01);
    } else if (P.drums === 'lofi') {
      kick(t0, 0.38); kick(t0 + 2.5 * beat, 0.3);
      [1, 3].forEach((q) => noiseHit(t0 + q * beat, 0.2, 0.1, false, 0.5, 0.06));
      for (let e = 0; e < 8; e++) noiseHit(t0 + e * beat / 2 + (e % 2 ? beat * 0.08 : 0), 0.05, 0.035, true, 0.6, 0.015);
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
