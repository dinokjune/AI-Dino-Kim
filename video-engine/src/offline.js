// 실시간보다 빠른 내보내기: 프레임을 시간 순서대로 직접 그리고, 소리는 OfflineAudioContext로 한 번에 믹스한다.
// 서버의 헤드리스 렌더(render.mjs)와 스튜디오가 같은 함수를 쓴다.

// 프레임 묶음을 JPEG(base64)로 돌려준다
function renderFrames(start, count, fps = 30, quality = 0.9) {
  const out = [];
  const cv = drawingContext.canvas;
  for (let i = 0; i < count; i++) {
    const T = (start + i) / fps;
    if (T >= TOTAL) break;
    renderAt(T);
    out.push(cv.toDataURL('image/jpeg', quality).slice('data:image/jpeg;base64,'.length));
  }
  return out;
}

// 효과음 + BGM + 내레이션을 영상 길이 그대로 믹스해 WAV(base64)로
async function renderAudioOffline(sr = 44100, withBgm = true) {
  AE.init();
  const dur = TOTAL + 0.3;
  const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const master = oc.createGain(); master.gain.value = 0.9;
  const comp = oc.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(oc.destination);
  const bus = oc.createGain(); bus.gain.value = 0.8; bus.connect(master);
  EVENTS.forEach((ev) => { const f = SFX[ev.name]; if (f) f(oc, bus, Math.max(0.001, ev.T), ev.vol); });
  const clips = voiceClips();
  if (withBgm) {
    const src = oc.createBufferSource();
    src.buffer = AE.bgm(TONE.engine.bgm); src.loop = true;
    const g = oc.createGain(), v = bgmVolume(clips.length > 0);
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(v, 0.6);
    g.gain.setValueAtTime(v, Math.max(0.7, TOTAL - 3));
    g.gain.linearRampToValueAtTime(0, TOTAL);
    src.connect(g); g.connect(master);
    src.start(0); src.stop(dur);
  }
  const vg = oc.createGain(); vg.connect(master);
  clips.forEach(({ buffer, at }) => { const s = oc.createBufferSource(); s.buffer = buffer; s.connect(vg); s.start(at); });
  const buf = await oc.startRendering();
  return audioBufferToWavBase64(buf);
}

function audioBufferToWavBase64(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  w(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { data.setInt16(o, Math.max(-1, Math.min(1, chans[c][i])) * 32767, true); o += 2; }
  return bytesToBase64(new Uint8Array(data.buffer));
}

function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// 내레이션을 다른 곳(서버 렌더, 저장 파일)으로 옮기기 위한 직렬화
function exportVoices() {
  const out = {};
  TL.forEach((e) => {
    const k = voiceKey(e.s), v = VOICE[k];
    if (v && v.wav) out[k] = { audio: v.wav, words: v.words || [] };
  });
  return out;
}
async function importVoices(map) {
  AE.init();
  for (const [k, v] of Object.entries(map || {})) {
    const buffer = await AE.ctx.decodeAudioData(base64ToArrayBuffer(v.audio));
    VOICE[k] = { buffer, duration: buffer.duration, words: v.words || [], wav: v.audio };
  }
}

// 영상 전체를 24장으로 펼친 컨택트시트 (그래픽 객체를 돌려준다)
function buildContactSheet(cols = ASPECT === '9:16' ? 8 : 6, rows = ASPECT === '9:16' ? 3 : 4) {
  const tw = ASPECT === '9:16' ? 180 : 320, th = ASPECT === '9:16' ? 320 : 180, pad = 8;
  const sheet = createGraphics(cols * (tw + pad) + pad, rows * (th + pad + 26) + pad);
  sheet.background('#1F2A30');
  sheet.textFont('Noto Sans KR'); sheet.textSize(16); sheet.fill(255);
  const was = curT;
  for (let i = 0; i < cols * rows; i++) {
    const T = ((i + 0.5) * TOTAL) / (cols * rows);
    renderAt(T);
    const x = pad + (i % cols) * (tw + pad), y = pad + Math.floor(i / cols) * (th + pad + 26);
    sheet.drawingContext.drawImage(drawingContext.canvas, x, y, tw, th);
    sheet.text(`#${sceneAt(T) + 1} ${TL[sceneAt(T)].s.type} · ${T.toFixed(1)}s`, x + 4, y + th + 18);
  }
  curT = was;
  return sheet;
}

// 유튜브 업로드 정보: 제목, 설명(챕터 포함), 태그
function youtubeMeta() {
  const m = META();
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  // 유튜브 챕터 규칙: 0:00으로 시작, 3개 이상, 각 10초 이상 → 짧은 장면은 앞 챕터에 합친다
  const ch = [];
  TL.forEach((e) => {
    const last = ch[ch.length - 1];
    if (!last || e.start - last.start < 10) { if (!last) ch.push({ start: 0, title: e.s.beat || '시작' }); return; }
    ch.push({ start: e.start, title: e.s.beat || e.s.type });
  });
  if (ch.length > 1 && TOTAL - ch[ch.length - 1].start < 10) ch.pop();
  const chapters = ch.length >= 3 ? '\n\n📌 목차\n' + ch.map((c) => `${fmt(c.start)} ${c.title}`).join('\n') : '';
  const summary = TL.filter((e) => e.s.type === 'cards' && e.s.stamp).flatMap((e) => (e.s.items || []).map((it) => `· ${it.title}${it.text ? ' – ' + it.text : ''}`)).join('\n');
  const desc = `${m.topic || m.title || ''}${summary ? '\n\n' + summary : ''}${chapters}${m.url ? '\n\n' + m.url : ''}\n\n※ 이 영상의 내레이션은 AI 음성 합성(본인 목소리 클론)으로 만들었습니다.`;
  const tags = Array.from(new Set([m.channel, m.topic, m.title, TONE.name].filter((t) => t && t.length >= 2))).slice(0, 15);
  return { title: (m.title || m.topic || '제목 없음').slice(0, 100), description: desc.slice(0, 4900), tags, duration: TOTAL };
}
