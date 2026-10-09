// 오리지널 마스코트 "디노" (둥근 아기 공룡 퍼펫). 원점은 발밑.
// mood: happy | think | sweat | wow | point | wave | sad
function drawDino(x, y, s, mood, t, walking = false) {
  const ink = PAL.ink;
  push();
  translate(x, y);
  scale(s);

  // 그림자는 지면에 고정
  noStroke(); fill(0, 0, 0, 45);
  const hop = walking ? Math.abs(Math.sin(t * 11)) : 0;
  ellipse(0, 6, 170 - hop * 40, 26);

  const bob = Math.sin(t * 3) * 4;
  const sq = walking ? 1 + 0.07 * Math.cos(t * 22) : 1 + 0.02 * Math.sin(t * 3);
  translate(0, bob - hop * 34);
  scale(1 / sq, sq);

  stroke(ink); strokeWeight(6); strokeJoin(ROUND);

  // 꼬리
  fill(PAL.dino);
  beginShape();
  vertex(-60, -60); bezierVertex(-120, -60, -150, -40, -170, -10);
  bezierVertex(-130, -20, -90, -20, -50, -30);
  endShape(CLOSE);

  // 등 가시 (머리 위 3개)
  fill(PAL.dinoDark);
  for (let i = 0; i < 3; i++) {
    const a = -2.1 + i * 0.42;
    const bx = Math.cos(a) * 92, by = -125 + Math.sin(a) * 100;
    push(); translate(bx, by); rotate(a + HALF_PI);
    triangle(-16, 8, 16, 8, 0, -26);
    pop();
  }

  // 발
  fill(PAL.dino);
  const step = walking ? Math.sin(t * 11) * 10 : 0;
  ellipse(-36 + step, -8, 54, 30);
  ellipse(36 - step, -8, 54, 30);

  // 몸통(머리 겸)
  ellipse(0, -110, 190, 200);
  noStroke(); fill(PAL.belly);
  ellipse(0, -72, 118, 110);
  stroke(ink); noFill(); strokeWeight(4);
  arc(0, -72, 118, 110, 0.2, PI - 0.2);
  strokeWeight(6);

  // 팔
  const armL = mood === 'think' ? -1.9 : mood === 'wave' ? 0 : 0.5;
  const armR = mood === 'point' ? -2.4 : mood === 'wave' ? -2.6 + Math.sin(t * 9) * 0.5 : mood === 'wow' ? -2.2 : 0.6;
  limb(-80, -95, armL + PI, ink);
  limb(80, -95, -armR, ink, true);

  // 눈
  const blink = (t % 3.7) < 0.12 ? 0.15 : 1;
  const look = mood === 'think' ? -10 : 4;
  for (const ex of [-36, 36]) {
    fill('#FFFFFF'); ellipse(ex, -140, 50, 56 * blink);
    if (blink > 0.5) {
      noStroke(); fill(ink); ellipse(ex + look * 0.6, -137, 22, 26);
      fill('#FFFFFF'); ellipse(ex + look * 0.6 + 5, -143, 7, 8);
      stroke(ink);
    }
  }
  // 볼
  noStroke(); fill(255, 130, 130, 120);
  ellipse(-62, -108, 26, 14); ellipse(62, -108, 26, 14);
  stroke(ink); strokeWeight(5); noFill();

  // 입
  if (mood === 'wow') { fill('#8A2E2E'); ellipse(0, -100, 30, 34); }
  else if (mood === 'sweat' || mood === 'sad') {
    beginShape(); for (let i = 0; i <= 6; i++) vertex(-22 + i * 7.3, -98 + (i % 2 ? -4 : 3)); endShape();
  } else if (mood === 'think') line(-12, -100, 14, -104);
  else arc(0, -108, 46, 34, 0.15, PI - 0.15);

  // 감정 표식
  if (mood === 'sweat') {
    for (let i = 0; i < 2; i++) {
      const p = ((t * 0.9 + i * 0.5) % 1);
      noStroke(); fill(120, 190, 255, 255 * (1 - p));
      const dx = 96 + i * 18, dy = -170 + p * 40;
      ellipse(dx, dy, 16, 22); triangle(dx - 7, dy - 4, dx + 7, dy - 4, dx, dy - 20);
    }
  }
  if (mood === 'think') {
    noStroke(); fill(ink); textFont(FONT_HEAD); textSize(70); textAlign(CENTER, CENTER);
    text('?', 100, -250 + Math.sin(t * 4) * 6);
  }
  if (mood === 'wow') {
    for (let i = 0; i < 3; i++) sparkle(-110 + i * 110, -260 - (i % 2) * 30, 18 + 6 * Math.sin(t * 6 + i));
  }
  pop();
}

function limb(x, y, a, ink, right) {
  push(); translate(x, y); rotate(a);
  stroke(ink); strokeWeight(6); fill(PAL.dino);
  rect(-14, -2, 28, 62, 14);
  pop();
}

function sparkle(x, y, r) {
  push(); translate(x, y); noStroke(); fill(PAL.yellow);
  beginShape();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.35 : r, a = i * QUARTER_PI;
    vertex(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  endShape(CLOSE); pop();
}
