// 무대 배경 · 커튼 · 아이콘 · 미니 화면(썸네일)

let GRAIN = null;
function buildGrain() {
  GRAIN = createGraphics(W / 2, H / 2);
  GRAIN.pixelDensity(1);
  GRAIN.loadPixels();
  for (let i = 0; i < GRAIN.pixels.length; i += 4) {
    const v = Math.random() * 255;
    GRAIN.pixels[i] = GRAIN.pixels[i + 1] = GRAIN.pixels[i + 2] = v;
    GRAIN.pixels[i + 3] = 255;
  }
  GRAIN.updatePixels();
}

function drawStageClassic(wallHex) {
  background(wallHex);
  // 벽지 세로 줄무늬
  const dark = isDark(wallHex);
  noStroke(); fill(dark ? 255 : 0, dark ? 8 : 10);
  for (let x = 0; x < W; x += 120) rect(x, 0, 60, FLOOR_Y);
  // 바닥
  fill(PAL.floor); rect(0, FLOOR_Y, W, H - FLOOR_Y);
  fill(PAL.floorEdge); rect(0, FLOOR_Y, W, 14);
  stroke(0, 0, 0, 22); strokeWeight(3);
  for (let x = -200; x < W + 200; x += 160) line(x, FLOOR_Y + 14, x + (x - W / 2) * 0.35, H);
  noStroke();
}

function drawGrainAndVignette() {
  if (PAL.grain > 0 && GRAIN) {
    push(); blendMode(OVERLAY); tint(255, PAL.grain);
    image(GRAIN, 0, 0, W, H);
    pop();
  }
  // 비네트 (밝고 깨끗해야 하는 톤은 생략)
  if (['flat', 'ui', 'pastel'].includes(TONE.engine.bg)) return;
  const g = drawingContext.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, W, H);
}

// amount: 0 = 열림(양옆에 묶임), 1 = 완전히 닫힘
function drawCurtains(amount) {
  if (!PAL.curtains && amount <= 0.001) return;
  const a = easeInOut(clamp01(amount));
  const minW = PAL.curtains ? W * 0.055 : 0;
  const cw = lerp(minW, W / 2 + 30, a);
  if (cw > 1) {
    for (const side of [0, 1]) {
      push();
      if (side) { translate(W, 0); scale(-1, 1); }
      const folds = Math.max(3, Math.round(cw / 70));
      const fw = cw / folds;
      for (let i = 0; i < folds; i++) {
        fill(i % 2 ? PAL.curtain : PAL.curtainHi); noStroke();
        const sway = Math.sin(i * 1.3 + a * 4) * 6;
        rect(i * fw, 0, fw + 1, H + sway, 0, 0, 30, 30);
      }
      // 커튼 끝단 그림자
      fill(0, 0, 0, 50); rect(cw - 18, 0, 18, H);
      pop();
    }
  }
  if (PAL.curtains) {
    // 상단 밸런스 + 금색 장식
    noStroke(); fill(PAL.curtain); rect(0, 0, W, 64);
    for (let x = 0; x < W; x += 96) {
      fill(PAL.curtainHi); arc(x + 48, 64, 96, 64, 0, PI);
    }
    fill(PAL.trim); rect(0, 58, W, 8);
    for (let x = 0; x < W; x += 96) ellipse(x + 48, 98, 14, 14);
  }
}

// ── 아이콘 (단위 공간 -50..50) ─────────────────────────────
function drawIcon(name, x, y, size, t = 0) {
  push(); translate(x, y); scale(size / 100);
  stroke(LINE()); strokeWeight(6); strokeJoin(ROUND); strokeCap(ROUND);
  const I = ICONS[name] || ICONS.star;
  I(t);
  pop();
}

const ICONS = {
  check() { fill(PAL.green); circle(0, 0, 96); stroke('#fff'); strokeWeight(11); noFill(); beginShape(); vertex(-24, 2); vertex(-6, 20); vertex(26, -16); endShape(); },
  x() { fill(PAL.red); circle(0, 0, 96); stroke('#fff'); strokeWeight(11); line(-20, -20, 20, 20); line(20, -20, -20, 20); },
  key() { fill(PAL.trim); circle(-22, 0, 46); fill(PAL.card); circle(-22, 0, 16); fill(PAL.trim); rect(-2, -7, 50, 14, 4); rect(30, 4, 8, 16); rect(42, 4, 8, 12); },
  clock(t) { fill('#fff'); circle(0, 0, 96); push(); rotate(t * 2); line(0, 0, 0, -32); pop(); push(); rotate(t * 0.3); line(0, 0, 22, 0); pop(); fill(PAL.ink); circle(0, 0, 8); fill(PAL.red); rect(-8, -62, 16, 12, 3); },
  bulb() { fill(PAL.yellow); circle(0, -10, 72); fill('#cfc6b8'); rect(-16, 22, 32, 22, 4); line(-14, 32, 14, 32); },
  folder() { fill('#E8B85C'); beginShape(); vertex(-46, -30); vertex(-12, -30); vertex(-4, -20); vertex(46, -20); vertex(46, 34); vertex(-46, 34); endShape(CLOSE); line(-46, -8, 46, -8); },
  eye() { fill('#fff'); beginShape(); vertex(-48, 0); bezierVertex(-20, -36, 20, -36, 48, 0); bezierVertex(20, 36, -20, 36, -48, 0); endShape(CLOSE); fill(PAL.blue); circle(0, 0, 34); fill(PAL.ink); circle(0, 0, 14); },
  ruler() { fill(PAL.yellow); rect(-48, -16, 96, 32, 4); for (let i = -36; i <= 36; i += 12) line(i, -16, i, i % 24 === 0 ? 2 : -4); },
  palette() { fill(PAL.card); beginShape(); vertex(0, -44); bezierVertex(46, -44, 52, 20, 24, 38); bezierVertex(6, 48, 4, 24, -12, 34); bezierVertex(-44, 50, -50, -44, 0, -44); endShape(CLOSE); noStroke(); [[PAL.red, -18, -20], [PAL.blue, 6, -26], [PAL.green, 24, -6], [PAL.yellow, -24, 6]].forEach(([c, a, b]) => { fill(c); circle(a, b, 16); }); },
  speaker(t) { fill(PAL.ink); rect(-40, -14, 20, 28); beginShape(); vertex(-20, -14); vertex(4, -34); vertex(4, 34); vertex(-20, 14); endShape(CLOSE); noFill(); for (let i = 0; i < 3; i++) { const k = (Math.sin(t * 5 - i) + 1) / 2; stroke(0, 0, 0, 80 + 175 * k); arc(10, 0, 30 + i * 22, 30 + i * 22, -0.8, 0.8); } },
  camera() { fill('#555'); rect(-46, -26, 72, 52, 8); fill(PAL.ink); triangle(26, -10, 48, -24, 48, 24); fill(PAL.red); circle(-30, -14, 10); },
  chef() { fill('#fff'); circle(-20, -16, 44); circle(20, -16, 44); circle(0, -30, 48); rect(-30, -6, 60, 38, 4); line(-30, 16, 30, 16); },
  star() { fill(PAL.yellow); beginShape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 20 : 48, a = -HALF_PI + i * PI / 5; vertex(Math.cos(a) * r, Math.sin(a) * r); } endShape(CLOSE); },
  gear(t) { push(); rotate(t * 0.8); fill('#9AA5B1'); for (let i = 0; i < 8; i++) { push(); rotate(i * QUARTER_PI); rect(-9, -50, 18, 20, 3); pop(); } circle(0, 0, 76); fill(PAL.card); circle(0, 0, 26); pop(); },
  doc() { fill('#fff'); beginShape(); vertex(-34, -46); vertex(18, -46); vertex(34, -30); vertex(34, 46); vertex(-34, 46); endShape(CLOSE); for (let i = -22; i <= 26; i += 14) line(-20, i, 20, i); },
  search() { fill('#DDF3FF'); circle(-8, -8, 64); strokeWeight(12); line(16, 16, 42, 42); },
  warn() { fill(PAL.yellow); triangle(0, -46, 48, 40, -48, 40); noStroke(); fill(PAL.ink); rect(-5, -16, 10, 34, 4); circle(0, 28, 11); },
  film() { fill(PAL.ink); rect(-48, -32, 96, 64, 6); fill('#fff'); noStroke(); for (let i = -40; i <= 32; i += 16) { rect(i, -28, 8, 8); rect(i, 20, 8, 8); } fill(PAL.blue); rect(-30, -14, 26, 28); fill(PAL.red); rect(4, -14, 26, 28); },
  robot(t) { line(0, -46, 0, -32); fill(PAL.red); circle(0, -48, 12); fill('#CFE3F2'); rect(-40, -32, 80, 66, 14); fill(PAL.ink); const b = (t % 3) < 0.15 ? 2 : 14; ellipse(-16, -2, 14, b); ellipse(16, -2, 14, b); line(-12, 18, 12, 18); },
  chart(t) { fill('#fff'); rect(-46, -42, 92, 84, 8); const hs = [0.4, 0.7, 0.55, 0.9]; noStroke(); hs.forEach((h, i) => { fill(i === 3 ? PAL.green : PAL.blue); const hh = 60 * h * clamp01(t * 1.5 - i * 0.2); rect(-34 + i * 20, 32 - hh, 14, hh); }); },
  heart() { fill(PAL.red); beginShape(); vertex(0, 40); bezierVertex(-60, 0, -40, -46, 0, -20); bezierVertex(40, -46, 60, 0, 0, 40); endShape(CLOSE); },
  mic() { fill('#9AA5B1'); rect(-16, -46, 32, 56, 16); noFill(); arc(0, 0, 56, 50, 0, PI); line(0, 26, 0, 42); line(-18, 44, 18, 44); },
  stamp() { fill(PAL.red); rect(-30, 10, 60, 16, 4); fill(PAL.wood); rect(-12, -40, 24, 50, 8); circle(0, -44, 30); },
  book() { fill('#fff'); beginShape(); vertex(0, -30); bezierVertex(-20, -42, -40, -40, -48, -34); vertex(-48, 36); bezierVertex(-36, 30, -16, 30, 0, 40); bezierVertex(16, 30, 36, 30, 48, 36); vertex(48, -34); bezierVertex(40, -40, 20, -42, 0, -30); endShape(CLOSE); line(0, -30, 0, 40); strokeWeight(4); for (let i = -14; i <= 14; i += 14) { line(-38, i, -10, i + 2); line(10, i + 2, 38, i); } },
  calendar() { fill('#fff'); rect(-44, -36, 88, 80, 10); fill(PAL.red); rect(-44, -36, 88, 22, 10, 10, 0, 0); line(-24, -48, -24, -28); line(24, -48, 24, -28); noStroke(); fill(PAL.ink); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rect(-32 + c * 18, -4 + r * 14, 10, 8, 2); },
  target() { fill('#fff'); circle(0, 0, 96); fill(PAL.red); circle(0, 0, 64); fill('#fff'); circle(0, 0, 34); fill(PAL.red); circle(0, 0, 12); },
};

// ── 미니 화면 (모니터·썸네일 안에 들어가는 서로 다른 톤 샘플) ──
const THUMB_STYLES = 6;
function drawThumb(x, y, w, h, seed, t) {
  clipRect(x, y, w, h, 10, () => {
    const v = ((seed % THUMB_STYLES) + THUMB_STYLES) % THUMB_STYLES;
    const r = (k) => rnd(seed * 13 + k);
    noStroke();
    if (v === 0) { // 어두운 네온
      fill('#14141F'); rect(x, y, w, h);
      stroke(255, 0, 85, 60); strokeWeight(2);
      for (let i = 1; i < 6; i++) line(x, y + (h * i) / 6, x + w, y + (h * i) / 6);
      noStroke();
      for (let i = 0; i < 3; i++) {
        fill(i % 2 ? '#00E5FF' : '#FF0055');
        circle(x + w * (0.5 + 0.35 * Math.sin(t * (1 + i * 0.4) + r(i) * 6)), y + h * (0.5 + 0.25 * Math.cos(t * 1.3 + i)), h * 0.18);
      }
    } else if (v === 1) { // 볼드 플랫: 원색 면이 1.2초마다 교체
      const cols = ['#FF5A36', '#2D5BFF', '#FFD23F', '#1B1B1B'];
      const k = Math.floor(t / 1.2 + r(1) * 4) % 4;
      fill(cols[k]); rect(x, y, w, h);
      fill(cols[(k + 2) % 4]); rect(x + w * 0.15, y + h * 0.3, w * 0.5 * (0.6 + 0.4 * Math.sin(t * 3)), h * 0.4);
    } else if (v === 2) { // 종이 질감
      fill('#F2E6CF'); rect(x, y, w, h);
      fill('#E9A88F'); ellipse(x + w * 0.3, y + h * (0.55 + 0.05 * Math.sin(t * 2)), w * 0.35, h * 0.45);
      fill('#9CC5A1'); ellipse(x + w * 0.68, y + h * 0.45, w * 0.3, h * 0.38);
      fill('#7A6A58'); rect(x + w * 0.1, y + h * 0.82, w * 0.8, h * 0.05, 4);
    } else if (v === 3) { // 미니멀 UI: 커서가 버튼을 누른다
      fill('#FFFFFF'); rect(x, y, w, h);
      fill('#E9EEF6'); rect(x + w * 0.08, y + h * 0.14, w * 0.84, h * 0.12, 4);
      const press = (t % 2) > 1.5;
      fill(press ? '#2563EB' : '#3B82F6'); rect(x + w * 0.3, y + h * 0.5, w * 0.4, h * 0.18, 8);
      const cx = x + w * (0.5 + 0.25 * Math.cos(t * 1.4)), cy = y + h * (0.6 + 0.15 * Math.sin(t * 1.4));
      fill('#111'); triangle(cx, cy, cx + 10, cy + 22, cx + 18, cy + 12);
    } else if (v === 4) { // 시네마틱 3D: 원근 격자 위로 카메라 비행
      fill('#0B1020'); rect(x, y, w, h);
      stroke(80, 140, 255, 120); strokeWeight(1.5);
      const hy = y + h * 0.45;
      for (let i = -8; i <= 8; i++) line(x + w / 2 + i * 6, hy, x + w / 2 + i * w * 0.18, y + h);
      for (let i = 0; i < 6; i++) { const p = ((i / 6 + t * 0.25) % 1); const yy = hy + (y + h - hy) * p * p; line(x, yy, x + w, yy); }
      noStroke(); fill('#FFB547');
      push(); translate(x + w / 2, y + h * 0.32); rotate(t); rectMode(CENTER); rect(0, 0, h * 0.18, h * 0.18, 3); rectMode(CORNER); pop();
    } else { // 파스텔
      fill('#FCE1E4'); rect(x, y, w, h);
      for (let i = 0; i < 4; i++) {
        fill(['#A0C4FF', '#FFC6FF', '#CAFFBF', '#FFD6A5'][i]);
        const bx = x + w * (0.2 + i * 0.2), by = y + h * (0.7 - 0.35 * Math.abs(Math.sin(t * 2.2 + i)));
        circle(bx, by, h * 0.16);
      }
    }
  });
  noFill(); stroke(LINE()); strokeWeight(4); rect(x, y, w, h, 10);
}
