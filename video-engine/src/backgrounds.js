// 톤별 배경 · 주인공(hero) · 자막 스타일 · 특수 전환
// 엔진이 그리기 직전에 NOW(전체 시각)와 SCENE_T(장면 안 시각), SCENE_I(장면 번호)를 맞춰 둔다.
let NOW = 0, SCENE_T = 0, SCENE_I = 0;

// 플랫 톤은 박자마다 바탕색이 바뀌므로 실제 바탕색을 계산해 자막·제목 색 판단에 쓴다
function effectiveWall(wallHex, sceneI, t) {
  if (TONE.engine.bg === 'flat' && PAL.cycle) {
    const beat = TONE.engine.beat || 1.2;
    const base = Math.max(0, PAL.cycle.indexOf(wallHex));
    return PAL.cycle[(base + sceneI + Math.floor(t / beat)) % PAL.cycle.length];
  }
  return wallHex;
}

function drawStage(wallHex) {
  const bg = TONE.engine.bg;
  if (bg === 'stage') return drawStageClassic(wallHex);
  const wall = effectiveWall(wallHex, SCENE_I, SCENE_T);
  background(wall);
  noStroke();
  ({ neon: bgNeon, flat: bgFlat, ui: bgUI, space: bgSpace, chalk: bgChalk, blueprint: bgBlueprint,
    pastel: bgPastel, news: bgNews, docu: bgDocu, terminal: bgTerminal }[bg] || (() => {}))(wall);
}

function bgNeon(wall) {
  // 얇은 격자 + 수평선 아래 원근 바닥
  stroke(255, 0, 85, 26); strokeWeight(1.5);
  for (let x = 0; x < W; x += 80) line(x, 0, x, FLOOR_Y);
  for (let y = 0; y < FLOOR_Y; y += 80) line(0, y, W, y);
  stroke(0, 229, 255, 70);
  for (let i = -12; i <= 12; i++) line(W / 2 + i * 30, FLOOR_Y, W / 2 + i * 260, H);
  for (let i = 0; i < 6; i++) { const p = ((i / 6 + NOW * 0.15) % 1); const y = FLOOR_Y + (H - FLOOR_Y) * p * p; line(0, y, W, y); }
  stroke(255, 0, 85, 200); strokeWeight(3); line(0, FLOOR_Y, W, FLOOR_Y);
  noStroke(); fill(255, 255, 255, 10);
  for (let y = 0; y < H; y += 4) rect(0, y, W, 1);
}

function bgFlat(wall) {
  // 대각선 띠 하나로 깊이감
  const next = PAL.cycle[(PAL.cycle.indexOf(wall) + 1) % PAL.cycle.length];
  fill(next); noStroke();
  const off = ((NOW * 60) % 400);
  quad(W * 0.62 + off * 0.1, 0, W, 0, W, H, W * 0.42 + off * 0.1, H);
  fill(0, 0, 0, 30); rect(0, H - 18, W, 18);
}

function bgUI(wall) {
  // 앱 창: 제목 표시줄 + 점 세 개 + 주소창
  const x = 70, y = 40, w = W - 140, h = H - 170;
  fill(0, 0, 0, 22); rect(x + 6, y + 14, w, h, 26);
  fill('#FFFFFF'); stroke('#DCE1EA'); strokeWeight(2); rect(x, y, w, h, 26);
  noStroke(); fill('#F1F3F8'); rect(x, y, w, 64, 26, 26, 0, 0);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { fill(c); circle(x + 40 + i * 30, y + 32, 16); });
  fill('#FFFFFF'); stroke('#DCE1EA'); rect(W / 2 - 300, y + 14, 600, 36, 18);
  noStroke(); fill('#9AA3B2'); textFont(FONT_BODY); textStyle(NORMAL); textSize(20); textAlign(CENTER, CENTER);
  text((META().channel || 'studio') + ' · ' + (META().title || ''), W / 2, y + 33);
}

let STARS = null;
function bgSpace(wall) {
  const g = drawingContext.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, wall); g.addColorStop(1, '#000000');
  drawingContext.fillStyle = g; drawingContext.fillRect(0, 0, W, H);
  if (!STARS) STARS = Array.from({ length: 160 }, (_, i) => [rnd(i) * W, rnd(i + 99) * FLOOR_Y, 0.3 + rnd(i + 7) * 1.7]);
  noStroke();
  STARS.forEach(([x, y, z]) => { fill(255, 255, 255, 60 + z * 90); circle((x - NOW * z * 6 + W * 10) % W, y, z * 2.2); });
  stroke(80, 120, 255, 60); strokeWeight(1.5);
  const hy = H * 0.66;
  for (let i = -20; i <= 20; i++) line(W / 2 + i * 22, hy, W / 2 + i * 180, H);
  for (let i = 0; i < 10; i++) { const p = ((i / 10 + NOW * 0.08) % 1); const y = hy + (H - hy) * p * p; line(0, y, W, y); }
  noStroke();
  const glow = drawingContext.createRadialGradient(W / 2, hy, 10, W / 2, hy, 700);
  glow.addColorStop(0, 'rgba(255,181,71,0.22)'); glow.addColorStop(1, 'rgba(255,181,71,0)');
  drawingContext.fillStyle = glow; drawingContext.fillRect(0, 0, W, H);
}

let SMUDGE = null;
function bgChalk(wall) {
  if (!SMUDGE) {
    SMUDGE = createGraphics(W / 4, H / 4); SMUDGE.noStroke();
    for (let i = 0; i < 260; i++) { SMUDGE.fill(255, 255, 255, 4 + rnd(i) * 8); SMUDGE.ellipse(rnd(i + 1) * W / 4, rnd(i + 2) * H / 4, 20 + rnd(i + 3) * 120, 6 + rnd(i + 4) * 30); }
  }
  image(SMUDGE, 0, 0, W, H);
  // 나무 틀 + 분필 받침
  noFill(); stroke(PAL.wood); strokeWeight(44); rect(0, 0, W, H);
  stroke('#6B4421'); strokeWeight(4); rect(22, 22, W - 44, H - 44);
  noStroke(); fill(PAL.wood); rect(0, H - 60, W, 60);
  fill('#F2F0E6'); rect(W - 160, H - 74, 70, 14, 7);
  fill(PAL.yellow); rect(W - 80, H - 74, 40, 14, 7);
}

function bgBlueprint(wall) {
  stroke(255, 255, 255, 22); strokeWeight(1);
  for (let x = 0; x < W; x += 30) line(x, 0, x, H);
  for (let y = 0; y < H; y += 30) line(0, y, W, y);
  stroke(255, 255, 255, 50); strokeWeight(2);
  for (let x = 0; x < W; x += 150) line(x, 0, x, H);
  for (let y = 0; y < H; y += 150) line(0, y, W, y);
  // 우하단 표제란
  noFill(); stroke(255, 255, 255, 140); strokeWeight(3);
  rect(W - 470, 30, 430, 110);
  line(W - 470, 80, W - 40, 80);
  noStroke(); fill(255, 255, 255, 170); textFont(FONT_BODY); textStyle(NORMAL); textSize(22); textAlign(LEFT, CENTER);
  text('DWG. ' + String(SCENE_I + 1).padStart(2, '0') + ' / ' + (META().title || ''), W - 450, 55);
}

let BLOBS = null;
function bgPastel(wall) {
  if (!BLOBS) BLOBS = Array.from({ length: 7 }, (_, i) => [rnd(i) * W, rnd(i + 11) * H, 120 + rnd(i + 5) * 220, i]);
  noStroke();
  BLOBS.forEach(([x, y, r, i]) => {
    fill(['#FFFFFF', '#A0C4FF', '#FFC6FF', '#CAFFBF', '#FFD6A5'][i % 5] + '66');
    circle(x + Math.sin(NOW * 0.4 + i) * 40, y + Math.cos(NOW * 0.35 + i) * 30, r);
  });
  fill(PAL.floor); rect(0, FLOOR_Y + 30, W, H, 60, 60, 0, 0);
}

let HALFTONE = null;
function bgNews(wall) {
  if (!HALFTONE) {
    HALFTONE = createGraphics(600, 600); HALFTONE.noStroke(); HALFTONE.fill(26, 26, 26, 40);
    for (let y = 0; y < 600; y += 14) for (let x = 0; x < 600; x += 14) { const d = 1 - Math.hypot(x, y) / 700; if (d > 0) HALFTONE.circle(x + (y / 14 % 2) * 7, y, 10 * d); }
  }
  image(HALFTONE, 0, 0); push(); translate(W, H); rotate(PI); image(HALFTONE, 0, 0); pop();
  stroke(26, 26, 26, 40); strokeWeight(2);
  for (let x = 320; x < W; x += 320) line(x, 150, x, H - 40);
  stroke(26); strokeWeight(5); line(60, 120, W - 60, 120); strokeWeight(2); line(60, 132, W - 60, 132);
  noStroke(); fill(26); textFont(FONT_HEAD); textStyle(NORMAL); textSize(56); textAlign(CENTER, CENTER);
  text(META().channel || '데일리 브리핑', W / 2, 70);
  textFont(FONT_BODY); textSize(20); textAlign(LEFT, CENTER); text('제' + (SCENE_I + 1) + '면', 70, 70);
}

function bgDocu(wall) {
  const glow = drawingContext.createRadialGradient(W * 0.35, H * 0.3, 20, W * 0.35, H * 0.3, 1100);
  glow.addColorStop(0, 'rgba(217,178,111,0.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  drawingContext.fillStyle = glow; drawingContext.fillRect(0, 0, W, H);
  noStroke(); fill(255, 240, 210, 8);
  for (let i = 0; i < 40; i++) circle((rnd(i) * W + NOW * 12 * (0.5 + rnd(i + 3))) % W, (rnd(i + 9) * H - NOW * 6) % H + (NOW * 6 > rnd(i + 9) * H ? H : 0), 3 + rnd(i + 2) * 5);
}

function bgTerminal(wall) {
  const x = 50, y = 40, w = W - 100, h = H - 170;
  fill('#0D170D'); stroke(57, 255, 122, 90); strokeWeight(2); rect(x, y, w, h, 14);
  noStroke(); fill('#132313'); rect(x, y, w, 52, 14, 14, 0, 0);
  fill(182, 255, 207, 160); textFont('Nanum Gothic Coding'); textStyle(NORMAL); textSize(22); textAlign(CENTER, CENTER);
  text('~/' + (META().title || 'video') + ' — zsh', W / 2, y + 26);
  fill(57, 255, 122, 12);
  for (let yy = y + 52; yy < y + h; yy += 4) rect(x, yy, w, 1);
}

// ── 주인공(hero): 커서 · 빛나는 점 ──
const HERO_SPOTS = {
  monitors: [1100, 560], title: [1180, 590], bubble: [1300, 470], compare: [1340, 640], number: [1320, 520],
  funnel: [1100, 560], typing: [1000, 620], line: [960, 460], cards: [960, 620], step: [960, 700],
  grid: [1100, 560], meters: [960, 600], checklist: [800, 560], endcard: [960, 610],
};
function heroSpot(e) {
  if (!e) return null;
  const s = e.s.hotspot || HERO_SPOTS[e.s.type] || [W / 2, 540];
  return { x: s[0] + Math.sin(e.i * 1.7) * 40, y: s[1] + Math.cos(e.i * 1.3) * 30 };
}

function drawCursor(x, y, clickK) {
  if (clickK > 0 && clickK < 1) {
    noFill(); stroke(59, 130, 246, 255 * (1 - clickK)); strokeWeight(5);
    circle(x, y, 30 + clickK * 90);
  }
  push(); translate(x, y); scale(clickK > 0 && clickK < 0.3 ? 0.88 : 1);
  noStroke(); fill(0, 0, 0, 50);
  beginShape(); vertex(4, 6); vertex(4, 62); vertex(18, 49); vertex(28, 72); vertex(39, 67); vertex(29, 45); vertex(48, 45); endShape(CLOSE);
  fill('#111'); stroke('#fff'); strokeWeight(4); strokeJoin(ROUND);
  beginShape(); vertex(0, 0); vertex(0, 56); vertex(14, 43); vertex(24, 66); vertex(35, 61); vertex(25, 39); vertex(44, 39); endShape(CLOSE);
  pop();
}

let ORB_TRAIL = [];
function drawOrb(x, y) {
  const ox = x + Math.sin(NOW * 2.1) * 60, oy = y + Math.cos(NOW * 1.7) * 40;
  ORB_TRAIL.push([ox, oy]); if (ORB_TRAIL.length > 18) ORB_TRAIL.shift();
  noStroke();
  ORB_TRAIL.forEach(([tx, ty], i) => { fill(0, 229, 255, (i / ORB_TRAIL.length) * 70); circle(tx, ty, 6 + i * 1.2); });
  drawingContext.shadowBlur = 40; drawingContext.shadowColor = '#00E5FF';
  fill('#E6FFFF'); circle(ox, oy, 26);
  drawingContext.shadowBlur = 0;
}

// ── 자막 스타일 ──
// lines: [[{w, hi}]], k: 등장 진행도(0~1)
function drawCaptionStyled(lines, k, size) {
  const style = TONE.engine.caption;
  const lh = size * 1.25;
  let baseY = H - 70 - (lines.length - 1) * lh;
  if (style === 'cinema') {
    noStroke(); fill(0); rect(0, 0, W, 90); rect(0, H - 150, W, 150);
    size *= 0.78; baseY = H - 75 - (lines.length - 1) * size * 1.25;
  }
  const font = style === 'mono' ? 'Nanum Gothic Coding' : style === 'cinema' ? FONT_BODY : FONT_HEAD;
  textFont(font); textStyle(HEAD_BOLD.includes(font) ? BOLD : NORMAL); textSize(size);
  textAlign(LEFT, CENTER); strokeJoin(ROUND);
  if (style === 'mono') lines = lines.map((ln, i) => (i === 0 ? [{ w: '> ', hi: false }, ...ln] : ln));
  const widths = lines.map((ln) => ln.reduce((a, tk) => a + textWidth(tk.w), 0));
  const maxW = Math.max(...widths);
  const lhh = size * 1.25;

  if (style === 'pill') {
    const ph = lines.length * lhh + 40;
    noStroke(); fill(0, 0, 0, 30); rect(W / 2 - maxW / 2 - 46, baseY - lhh / 2 - 14 + 6, maxW + 92, ph, ph / 2);
    fill('#FFFFFF'); stroke('#DCE1EA'); strokeWeight(2); rect(W / 2 - maxW / 2 - 46, baseY - lhh / 2 - 20, maxW + 92, ph, Math.min(ph / 2, 40));
  }
  lines.forEach((ln, li) => {
    const tw = widths[li];
    let x = W / 2 - tw / 2;
    const y = baseY + li * lhh + (1 - k) * 12;
    if (style === 'block') {
      noStroke(); fill(TONE.engine.captionColor || '#111111');
      rect(x - 24, y - lhh / 2 - 4, tw + 48, lhh + 8, 6);
    }
    withAlpha(k, () => {
      ln.forEach((tk) => {
        noStroke();
        if (style === 'outline') { stroke('#222222'); strokeWeight(size * 0.2); fill(tk.hi ? PAL.yellow : '#FFFFFF'); }
        else if (style === 'block') fill(tk.hi ? PAL.yellow : '#FFFFFF');
        else if (style === 'glow') { drawingContext.shadowBlur = 22; drawingContext.shadowColor = tk.hi ? '#FF0055' : '#00E5FF'; fill(tk.hi ? '#FFD1E0' : '#FFFFFF'); }
        else if (style === 'pill') fill(tk.hi ? PAL.blue : PAL.ink);
        else if (style === 'cinema') fill(tk.hi ? PAL.yellow : '#F4F1EA');
        else if (style === 'chalk') fill(tk.hi ? PAL.yellow : 'rgba(242,240,230,0.92)');
        else if (style === 'mono') fill(tk.hi ? '#FFFFFF' : PAL.green);
        text(tk.w, x + (style === 'chalk' ? Math.sin(x) * 1.2 : 0), y);
        drawingContext.shadowBlur = 0;
        x += textWidth(tk.w);
      });
      if (style === 'mono' && li === lines.length - 1 && (NOW * 2) % 1 < 0.6) { noStroke(); fill(PAL.green); rect(x + 6, y - size * 0.45, size * 0.55, size * 0.9); }
    });
  });
  noStroke();
}

// ── 특수 전환 ──
// 색 면이 화면을 덮었다가 걷히는 와이프 (erase 는 칠판 지우개 버전)
function drawWipe(p, colorHex, eraser) {
  const k = easeInOut(p);
  const x0 = k < 0.5 ? 0 : W * (k - 0.5) * 2, x1 = k < 0.5 ? W * k * 2 : W;
  noStroke(); fill(colorHex); rect(x0, 0, x1 - x0, H);
  if (eraser) {
    fill(255, 255, 255, 30);
    for (let i = 0; i < 9; i++) rect(x0, 60 + i * 110, x1 - x0, 18 + (i % 3) * 6);
    const ex = k < 0.5 ? x1 : x0;
    fill('#C8B79A'); stroke('#6B4421'); strokeWeight(4); rect(ex - 70, H / 2 - 60, 140, 120, 14);
    noStroke(); fill('#3A3A3A'); rect(ex - 70, H / 2 + 30, 140, 30, 0, 0, 14, 14);
  }
}

// 글리치: 가로 띠를 어긋나게 복사하고 색 번짐을 얹는다
function drawGlitch(p) {
  const strength = Math.sin(p * PI);
  const cv = drawingContext.canvas;
  for (let i = 0; i < 9; i++) {
    const y = rnd(i * 7 + Math.floor(p * 12)) * H, h = 20 + rnd(i * 3 + Math.floor(p * 12)) * 90;
    const dx = (rnd(i * 5 + Math.floor(p * 20)) - 0.5) * 160 * strength;
    drawingContext.drawImage(cv, 0, y, cv.width, h, dx, y, cv.width, h);
  }
  noStroke();
  fill(255, 0, 85, 70 * strength); rect(0, 0, W, H);
  fill(0, 229, 255, 40 * strength); rect(8 * strength, 0, W, H);
}
