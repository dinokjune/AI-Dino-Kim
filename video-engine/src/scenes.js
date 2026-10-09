// 장면 타입 카탈로그.
// 각 타입: draw(s, t, d) 로 내용만 그린다(배경·마스코트·자막은 엔진 담당).
// cues(s, d) 는 장면 안 효과음 [{at, name, vol}], mascot 은 기본 마스코트 위치.
// 등장 시각은 revealTimes 로 계산해 그림과 소리가 같은 박자에 맞는다.

const SCENES = {};

// ── monitors: 훅. 천장에 매달린 모니터들이 서로 다른 톤을 동시에 재생 ──
SCENES.monitors = {
  mascot: { x: 250, y: FLOOR_Y + 40, s: 0.9, mood: 'wow' },
  layout(s) {
    const n = s.count || 6, cols = n <= 3 ? n : Math.ceil(n / 2), rows = n <= 3 ? 1 : 2;
    const mw = Math.min(400, 1300 / cols), mh = mw * 0.5625;
    return { n, cols, rows, mw, mh };
  },
  draw(s, t, d) {
    const { n, cols, mw, mh } = this.layout(s);
    const ts = revealTimes(n, d, 0.5, d * 0.55);
    const gx = mw + 50, ox = W / 2 + 60 - ((cols - 1) * gx) / 2;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const k = inK(t, ts[i], 0.55);
      if (k <= 0) continue;
      const cx = ox + c * gx, cy = 290 + r * (mh + 110);
      const drop = (1 - easeOutBack(k)) * -400;
      const swing = Math.sin(t * 2 + i) * 0.015 * (1 - k * 0.5);
      push(); translate(cx, cy + drop); rotate(swing);
      stroke(LINE()); strokeWeight(3);
      line(-mw * 0.3, -mh / 2 - 12, -mw * 0.3, -cy - drop);
      line(mw * 0.3, -mh / 2 - 12, mw * 0.3, -cy - drop);
      fill('#2E2A28'); strokeWeight(6); rect(-mw / 2 - 12, -mh / 2 - 12, mw + 24, mh + 24, 14);
      drawThumb(-mw / 2, -mh / 2, mw, mh, (s.seeds && s.seeds[i]) ?? i, t);
      if (s.labels && s.labels[i]) {
        card(0, mh / 2 + 46, 200, 50, { r: 25, sw: 4, shadow: false });
        txt(s.labels[i], 0, mh / 2 + 46, 28, cardInk());
      }
      pop();
    }
  },
  cues(s, d) {
    const { n } = this.layout(s);
    return revealTimes(n, d, 0.5, d * 0.55).map((at) => ({ at: at + 0.25, name: 'pop' }));
  },
};

// ── title: 크림색 라벨 카드 + 아이콘 (선언·비유·개념 소개) ──
SCENES.title = {
  mascot: { x: 330, y: FLOOR_Y + 40, s: 1, mood: 'point' },
  draw(s, t, d) {
    const cx = W / 2 + 120, cy = s.icon ? 560 : 470;
    if (s.icon) {
      const k = popK(t, 0.2);
      popAt(cx, 300 + Math.sin(t * 2) * 8, k, () => {
        noStroke(); fill(255, 255, 255, 120); circle(0, 0, 250);
        drawIcon(s.icon, 0, 0, 180, t);
      });
    }
    useFont(FONT_HEAD); textSize(96);
    const tw = Math.min(1300, textWidth(stripMarks(s.text || '')) + 140);
    popAt(cx, cy, popK(t, 0.45), () => {
      card(0, 0, tw, 170);
      markedLine(s.text || '', 0, 4, 96, cardInk());
    });
    if (s.sub) withAlpha(inK(t, 0.9), () => txt(s.sub, cx, cy + 150, 46, subInk(), { font: FONT_BODY }));
  },
  cues(s) { return [{ at: s.icon ? 0.25 : 0.45, name: 'pop' }, ...(s.icon ? [{ at: 0.5, name: 'pop' }] : []), ...(s.sub ? [{ at: 0.9, name: 'paper', vol: 0.6 }] : [])]; },
};

// ── bubble: 마스코트 말풍선 (문제 제기·반전·감정) ──
SCENES.bubble = {
  mascot: { x: 560, y: FLOOR_Y + 60, s: 1.45, mood: 'happy' },
  draw(s, t, d) {
    const str = stripMarks(s.text || '');
    const k = popK(t, 0.3);
    const bx = 1220, by = 400;
    popAt(bx, by, k, () => {
      useFont(FONT_HEAD); textSize(68);
      const bw = Math.min(980, textWidth(str) + 140), bh = str.length > 16 ? 290 : 200;
      noStroke(); fill(0, 0, 0, 40); rect(-bw / 2 + 10, -bh / 2 + 12, bw, bh, 60);
      fill(PAL.card); stroke(LINE()); strokeWeight(6);
      rect(-bw / 2, -bh / 2, bw, bh, 60);
      triangle(-bw / 2 + 120, bh / 2 - 4, -bw / 2 + 60, bh / 2 + 90, -bw / 2 + 200, bh / 2 - 4);
      noStroke(); fill(PAL.card); rect(-bw / 2 + 110, bh / 2 - 12, 100, 14);
      const n = Math.floor(clamp01((t - 0.45) / Math.max(0.4, str.length * 0.05)) * str.length);
      txt(str.slice(0, n), 0, 0, 68, cardInk(), { maxW: bw - 90, boxH: bh });
    });
  },
  cues(s) {
    const n = stripMarks(s.text || '').length, out = [{ at: 0.3, name: s.mood === 'sweat' ? 'boing' : 'pop' }];
    for (let i = 0; i < n; i += 2) out.push({ at: 0.45 + i * 0.05, name: 'tick', vol: 0.35 });
    return out;
  },
};

// ── compare: 이젤 두 개 좌우 비교 (A/B) ──
SCENES.compare = {
  mascot: { x: W - 150, y: FLOOR_Y + 30, s: 0.7, mood: 'think' },
  draw(s, t, d) {
    const sides = [s.left || {}, s.right || {}];
    const vt = d * 0.62;
    sides.forEach((side, i) => {
      const cx = i ? W * 0.72 : W * 0.28, k = popK(t, 0.3 + i * 0.35);
      popAt(cx, 520, k, () => {
        stroke(LINE()); strokeWeight(8); fill(PAL.wood);
        line(-170, 200, -230, 380); line(170, 200, 230, 380); line(0, 200, 0, 360);
        card(0, 0, 640, 440, { fill: PAL.paper });
        const mode = side.mode || (i ? 'smooth' : 'choppy');
        easelScreen(-280, -170, 560, 315, mode, side.seed ?? i * 3, t);
        if (side.text) txt(side.text, 0, 185, 36, cardInk(), { font: FONT_BODY });
        if (side.label) {
          const tag = i ? PAL.green : PAL.red;
          fill(side.tagColor || tag); stroke(LINE()); strokeWeight(5);
          rect(-120, -262, 240, 64, 32);
          txt(side.label, 0, -229, 38, '#fff');
        }
      });
      const good = s.verdict === (i ? 'right' : 'left');
      if (s.verdict && s.verdict !== 'none') {
        popAt(cx + 240, 330, popK(t, vt + i * 0.25), () => drawIcon(good ? 'check' : 'x', 0, 0, 130));
      }
    });
  },
  cues(s, d) {
    const out = [{ at: 0.3, name: 'whoosh', vol: 0.5 }, { at: 0.65, name: 'whoosh', vol: 0.5 }];
    if (s.verdict && s.verdict !== 'none') {
      out.push({ at: d * 0.62 + (s.verdict === 'left' ? 0 : 0.25), name: 'ding' });
      out.push({ at: d * 0.62 + (s.verdict === 'left' ? 0.25 : 0), name: 'buzz' });
    }
    return out;
  },
};

function easelScreen(x, y, w, h, mode, seed, t) {
  if (mode === 'choppy') {
    // 뚝뚝 끊기는 장면 전환: 0.6초마다 다른 톤으로 하드컷
    drawThumb(x, y, w, h, seed + Math.floor(t / 0.6) * 7, t);
  } else if (mode === 'smooth') {
    // 하나로 흐르는 전환: 같은 도형이 화면을 가로지르며 배경만 바뀐다
    const p = (t * 0.25) % 1;
    clipRect(x, y, w, h, 10, () => {
      noStroke();
      fill(lerpColor(color('#F2E6CF'), color('#CFE3F2'), (Math.sin(t) + 1) / 2)); rect(x, y, w, h);
      fill(PAL.yellow); stroke(LINE()); strokeWeight(4);
      circle(x + w * p, y + h * 0.5 + Math.sin(p * TWO_PI) * h * 0.2, h * 0.28);
      noStroke(); fill(0, 0, 0, 30);
      for (let i = 0; i < 6; i++) circle(x + w * ((p - i * 0.04 + 1) % 1), y + h * 0.5 + Math.sin((p - i * 0.04) * TWO_PI) * h * 0.2, h * 0.28 * (1 - i * 0.14));
    });
    noFill(); stroke(LINE()); strokeWeight(4); rect(x, y, w, h, 10);
  } else drawThumb(x, y, w, h, seed, t);
}

// ── number: 큰 숫자 + 스톱워치 (실험·근거 수치) ──
SCENES.number = {
  mascot: { x: W - 260, y: FLOOR_Y + 40, s: 0.85, mood: 'wow' },
  parse(s) {
    const raw = String(s.value ?? '0');
    const num = parseFloat(raw.replace(/,/g, ''));
    const dec = (raw.split('.')[1] || '').length;
    return { raw, num, dec, comma: raw.includes(',') };
  },
  draw(s, t, d) {
    const icon = s.icon || 'clock';
    popAt(560, 470, popK(t, 0.2), () => {
      noStroke(); fill(255, 255, 255, 110); circle(0, 0, 400);
      drawIcon(icon, 0, 0, 300, t);
    });
    const { raw, num, dec, comma } = this.parse(s);
    // countUp:false 면 처음부터 최종값을 보여 준다 (중간 가짜값 방지)
    const p = s.countUp === false || isNaN(num) ? 1 : easeOut(clamp01((t - 0.5) / 1.2));
    let shown = raw;
    if (!isNaN(num) && p < 1) {
      shown = (num * p).toFixed(dec);
      if (comma) shown = Number(shown).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    const k = popK(t, 0.45);
    popAt(1180, 430, k, () => {
      useFont(FONT_HEAD); textSize(260);
      const vw = textWidth(raw + (s.suffix || ''));
      noStroke(); fill(PAL.yellow); rect(-vw / 2 - 50, -150, vw + 100, 290, 60);
      stroke(LINE()); strokeWeight(6); noFill(); rect(-vw / 2 - 50, -150, vw + 100, 290, 60);
      txt(shown + (s.suffix || ''), 0, 0, 260, PAL.ink);
    });
    if (s.label) withAlpha(inK(t, 1.0), () => txt(s.label, 1180, 680, 52, subInk(), { font: FONT_BODY }));
  },
  cues(s) {
    const out = [{ at: 0.2, name: 'pop' }];
    if (s.countUp !== false) for (let i = 0; i < 10; i++) out.push({ at: 0.5 + i * 0.12, name: 'tick', vol: 0.45 });
    out.push({ at: 1.7, name: 'ding' });
    return out;
  },
};

// ── funnel: 수치가 걸러지는 흐름 (수집 → 정리 → 분류) ──
SCENES.funnel = {
  mascot: { x: 200, y: FLOOR_Y + 40, s: 0.8, mood: 'point' },
  draw(s, t, d) {
    const steps = s.steps || [];
    const n = steps.length, ts = revealTimes(n, d, 0.4, 1.2);
    const gx = 1400 / Math.max(1, n - 1 || 1), ox = n === 1 ? W / 2 : W / 2 + 80 - 700;
    steps.forEach((st, i) => {
      const cx = ox + i * gx, cy = 470;
      if (i > 0) {
        const ak = inK(t, ts[i] - 0.3, 0.4);
        stroke(LINE()); strokeWeight(8);
        const x0 = cx - gx + 170, x1 = lerp(x0, cx - 170, ak);
        if (ak > 0) { line(x0, cy, x1, cy); if (ak > 0.95) { line(x1, cy, x1 - 24, cy - 18); line(x1, cy, x1 - 24, cy + 18); } }
      }
      popAt(cx, cy, popK(t, ts[i]), () => {
        fill(PAL.card); stroke(LINE()); strokeWeight(6); circle(0, 0, 300);
        const dots = Math.max(1, Math.min(90, Math.round(st.dots ?? 90 / Math.pow(2.2, i))));
        noStroke();
        for (let j = 0; j < dots; j++) {
          const a = rnd(j * 3.1 + i) * TWO_PI, r = Math.sqrt(rnd(j * 7.7 + i)) * 115;
          fill([PAL.blue, PAL.red, PAL.green, PAL.yellow][j % 4]);
          circle(Math.cos(a + t * 0.2) * r, Math.sin(a + t * 0.2) * r, dots > 40 ? 12 : 22);
        }
      });
      withAlpha(inK(t, ts[i] + 0.2), () => {
        txt(st.value, cx, cy - 230, 90, titleInk(), { outline: titleOutline(), ow: 12 });
        txt(st.label || '', cx, cy + 210, 44, subInk(), { font: FONT_BODY });
      });
    });
  },
  cues(s, d) {
    const n = (s.steps || []).length;
    return revealTimes(n, d, 0.4, 1.2).flatMap((at, i) => [{ at, name: 'pop' }, ...(i ? [{ at: at - 0.3, name: 'whoosh', vol: 0.35 }] : [])]);
  },
};

// ── typing: SNS 게시물 목업에 프롬프트가 타이핑되고 좋아요가 올라감 ──
SCENES.typing = {
  mascot: { x: W - 230, y: FLOOR_Y + 40, s: 0.8, mood: 'think' },
  draw(s, t, d) {
    const str = s.text || '';
    const typeEnd = Math.min(d * 0.6, 0.8 + str.length * 0.045);
    popAt(W / 2 - 40, 470, popK(t, 0.2), () => {
      card(0, 0, 1180, 560, { fill: '#FFFFFF' });
      fill(PAL.blue); stroke(LINE()); strokeWeight(5); circle(-490, -200, 84);
      txt(s.name || 'prompt_master', -430, -215, 40, PAL.ink, { align: LEFT });
      txt(s.handle || '@someone · 1d', -430, -175, 28, '#7A7A7A', { align: LEFT, font: FONT_BODY });
      const n = Math.floor(clamp01((t - 0.8) / (typeEnd - 0.8)) * str.length);
      const caret = t < typeEnd + 0.6 && (t * 2) % 1 < 0.6 ? '|' : '';
      txt(str.slice(0, n) + caret, -530, 20, 48, PAL.ink, { align: LEFT, maxW: 1060, boxH: 300, font: FONT_BODY, lead: 1.4 });
      stroke('#E3E3E3'); strokeWeight(3); line(-540, 190, 540, 190);
      if (s.likes) {
        const lk = popK(t, typeEnd + 0.2);
        popAt(-470, 235, lk, () => drawIcon('heart', 0, 0, 56));
        const v = Math.round(Number(s.likes) * easeOut(clamp01((t - typeEnd - 0.2) / 1)));
        if (lk > 0) txt(v.toLocaleString('en-US'), -420, 235, 40, PAL.red, { align: LEFT });
      }
    });
  },
  cues(s, d) {
    const str = s.text || '', typeEnd = Math.min(d * 0.6, 0.8 + str.length * 0.045);
    const out = [{ at: 0.2, name: 'pop' }];
    for (let x = 0.8; x < typeEnd; x += 0.09) out.push({ at: x, name: 'tick', vol: 0.3 });
    if (s.likes) out.push({ at: typeEnd + 0.2, name: 'notify' });
    return out;
  },
};

// ── line: 빨랫줄에 카드가 하나씩 집게로 걸림 (공통점·요소 나열) ──
SCENES.line = {
  mascot: { x: W - 200, y: FLOOR_Y + 40, s: 0.8, mood: 'happy' },
  draw(s, t, d) {
    const items = s.items || [], n = items.length, ts = revealTimes(n, d, 0.5, 1.2);
    const x0 = 140, x1 = W - 140, sag = 70;
    const ropeY = (x) => 230 + sag * (1 - Math.pow((2 * (x - x0)) / (x1 - x0) - 1, 2));
    noFill(); stroke(LINE()); strokeWeight(5);
    beginShape(); for (let x = x0; x <= x1; x += 20) vertex(x, ropeY(x)); endShape();
    if (s.title) txt(s.title, W / 2, 140, 60, titleInk(), { outline: titleOutline(), ow: 12 });
    const cw = Math.min(300, 1500 / Math.max(1, n));
    items.forEach((it, i) => {
      const cx = x0 + ((i + 0.5) * (x1 - x0)) / n, ry = ropeY(cx);
      const k = inK(t, ts[i], 0.45);
      if (k <= 0) return;
      const dt = t - ts[i];
      const sw = Math.sin(dt * 7) * Math.exp(-dt * 2.2) * 0.25;
      push(); translate(cx, ry + (1 - k) * -300); rotate(sw);
      card(0, 190, cw - 30, 330, { r: 14 });
      drawIcon(it.icon || 'star', 0, 120, 110, t);
      txt(it.text || '', 0, 265, 40, cardInk(), { maxW: cw - 60, boxH: 140 });
      fill(PAL.wood); stroke(LINE()); strokeWeight(4); rect(-12, -14, 24, 54, 6);
      pop();
    });
  },
  cues(s, d) { return revealTimes((s.items || []).length, d, 0.5, 1.2).map((at) => ({ at: at + 0.3, name: 'snap' })); },
};

// ── cards: 액자 카드 n장 + 도장 (프레임워크·요약) ──
SCENES.cards = {
  mascot: false,
  draw(s, t, d) {
    const items = s.items || [], n = items.length, ts = revealTimes(n, d, 0.5, s.stamp ? 1.6 : 1);
    const cw = Math.min(480, 1560 / n), gx = cw + 50, ox = W / 2 - ((n - 1) * gx) / 2;
    if (s.title) withAlpha(inK(t, 0.1), () => txt(s.title, W / 2, 150, 66, titleInk(), { outline: titleOutline(), ow: 12 }));
    items.forEach((it, i) => {
      const cx = ox + i * gx, cy = 540;
      popAt(cx, cy, popK(t, ts[i]), () => {
        noStroke(); fill(0, 0, 0, 40); rect(-cw / 2 + 12, -290 + 14, cw, 580, 10);
        fill(PAL.wood); stroke(LINE()); strokeWeight(6); rect(-cw / 2, -290, cw, 580, 10);
        fill(PAL.card); rect(-cw / 2 + 26, -264, cw - 52, 528, 6);
        if (it.icon) drawIcon(it.icon, 0, -150, 120, t);
        const head = it.num ? `${it.num}` : null;
        if (head) txt(head, 0, it.icon ? -150 : -170, 110, PAL.red);
        txt(it.title || '', 0, -20, 60, cardInk(), { maxW: cw - 80, boxH: 150 });
        txt(it.text || '', 0, 140, 36, subInkCard(), { maxW: cw - 90, boxH: 220, font: FONT_BODY, lead: 1.35 });
      });
      if (s.stamp) {
        const st = ts[i] + 0.7;
        const sk = clamp01((t - st) / 0.18);
        if (sk > 0) {
          push(); translate(cx + cw / 2 - 70, cy - 230); rotate(-0.25); scale(lerp(2.2, 1, sk));
          withAlpha(sk, () => {
            noFill(); stroke(PAL.red); strokeWeight(8); circle(0, 0, 120);
            txt(s.stampText || 'OK', 0, 2, 44, PAL.red);
          });
          pop();
        }
      }
    });
  },
  cues(s, d) {
    const ts = revealTimes((s.items || []).length, d, 0.5, s.stamp ? 1.6 : 1);
    return ts.flatMap((at) => [{ at, name: 'pop' }, ...(s.stamp ? [{ at: at + 0.75, name: 'stamp' }] : [])]);
  },
};

// ── step: 단계 배지 + 중앙 스테이션 + 하단 진행 바 (프로세스 설명) ──
SCENES.step = {
  mascot: { x: W - 270, y: FLOOR_Y + 40, s: 0.9, mood: 'point' },
  draw(s, t, d) {
    const n = s.n || 1, total = s.total || 5;
    // 좌상단 배지
    const bk = inK(t, 0.05, 0.4);
    push(); translate(lerp(-300, 0, bk), 0);
    fill(PAL.yellow); stroke(LINE()); strokeWeight(6); rect(90, 110, 330, 100, 50);
    txt(s.badge || `STEP ${n}`, 255, 160, 58, PAL.ink);
    pop();
    // 스테이션
    popAt(W / 2, 400 + Math.sin(t * 2) * 6, popK(t, 0.35), () => {
      fill(PAL.wood); stroke(LINE()); strokeWeight(6); ellipse(0, 150, 420, 90);
      noStroke(); fill(255, 255, 255, 130); circle(0, 0, 320);
      drawIcon(s.icon || 'gear', 0, 0, 230, t);
    });
    popAt(W / 2, 680, popK(t, 0.6), () => {
      useFont(FONT_HEAD); textSize(70);
      const tw = Math.min(1200, textWidth(stripMarks(s.text || '')) + 120);
      card(0, 0, tw, 130);
      markedLine(s.text || '', 0, 4, 70, cardInk());
    });
    // 진행 바
    const by = 830, bw = 900, bx = W / 2 - bw / 2;
    stroke(LINE()); strokeWeight(6); line(bx, by, bx + bw, by);
    for (let i = 0; i < total; i++) {
      const x = bx + (bw * i) / Math.max(1, total - 1), cur = i === n - 1, done = i < n - 1;
      const k = cur ? 1 + 0.15 * Math.sin(t * 5) : 1;
      fill(done ? PAL.green : cur ? PAL.yellow : PAL.card); stroke(LINE()); strokeWeight(5);
      circle(x, by, 46 * k);
      txt(String(i + 1), x, by + 1, 26, PAL.ink);
    }
  },
  cues() { return [{ at: 0.05, name: 'whoosh', vol: 0.4 }, { at: 0.35, name: 'pop' }, { at: 0.6, name: 'chime', vol: 0.6 }]; },
};

// ── grid: 컨택트 시트 + 스캐너 (눈 검수) ──
SCENES.grid = {
  mascot: { x: 230, y: FLOOR_Y + 40, s: 0.8, mood: 'think' },
  geo(s) { const cols = s.cols || 6, rows = s.rows || 4; const tw = 1300 / cols, th = tw * 0.5625; return { cols, rows, tw, th, ox: W / 2 + 80 - 650, oy: 230 }; },
  draw(s, t, d) {
    const { cols, rows, tw, th, ox, oy } = this.geo(s);
    const gh = rows * (th + 14);
    card(W / 2 + 80, oy + gh / 2 - 7, 1360, gh + 50, { fill: '#1F2A30', r: 16 });
    const beamA = d * 0.35, beamB = d * 0.8;
    const beamY = oy + gh * clamp01((t - beamA) / (beamB - beamA));
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const k = inK(t, 0.2 + i * 0.025, 0.3);
      if (k <= 0) continue;
      const x = ox + c * tw + 6, y = oy + r * (th + 14);
      withAlpha(k, () => drawThumb(x, y, tw - 12, th, (s.seed || 0) + i, 0.5 + i * 0.37));
      if ((s.flags || []).includes(i) && beamY > y + th) {
        const fk = popK(t, beamA + (beamB - beamA) * ((y + th - oy) / gh));
        noFill(); stroke(PAL.red); strokeWeight(8); rect(x - 4, y - 4, tw - 4, th + 8, 8);
        popAt(x + tw - 24, y + 10, fk, () => drawIcon('warn', 0, 0, 56));
      }
    }
    if (t > beamA && t < beamB + 0.3) {
      noStroke(); fill(0, 229, 255, 60); rect(ox - 20, beamY - 30, 1340, 60);
      fill(PAL.cyan); rect(ox - 20, beamY - 3, 1340, 6);
    }
    if (s.title) txt(s.title, W / 2 + 80, 150, 56, titleInk(), { outline: titleOutline(), ow: 12 });
  },
  cues(s, d) {
    const { rows, th, oy } = this.geo(s), gh = rows * (th + 14), beamA = d * 0.35, beamB = d * 0.8;
    const out = [{ at: 0.2, name: 'paper' }, { at: beamA, name: 'scan' }];
    (s.flags || []).forEach((i) => {
      const r = Math.floor(i / (s.cols || 6)), y = oy + r * (th + 14);
      out.push({ at: beamA + (beamB - beamA) * ((y + th - oy) / gh), name: 'buzz', vol: 0.7 });
    });
    return out;
  },
};

// ── meters: 게이지가 목표 구간과 비교 (숫자 검수) ──
SCENES.meters = {
  mascot: { x: 170, y: FLOOR_Y + 30, s: 0.7, mood: 'happy' },
  draw(s, t, d) {
    const items = s.items || [], n = items.length, ts = revealTimes(n, d, 0.4, 1.6);
    const gx = Math.min(560, 1600 / n), ox = W / 2 - ((n - 1) * gx) / 2;
    if (s.title) txt(s.title, W / 2, 150, 60, titleInk(), { outline: titleOutline(), ow: 12 });
    items.forEach((it, i) => {
      const cx = ox + i * gx, cy = 520;
      popAt(cx, cy, popK(t, ts[i]), () => {
        const R = Math.min(200, gx * 0.38);
        card(0, 40, R * 2 + 90, R + 260, { r: 26 });
        strokeCap(SQUARE); noFill();
        stroke('#D9D2C3'); strokeWeight(34); arc(0, 40, R * 2, R * 2, PI, TWO_PI);
        const [a0, a1] = it.target || [0.4, 0.7];
        stroke(PAL.green); arc(0, 40, R * 2, R * 2, PI + PI * a0, PI + PI * a1);
        strokeCap(ROUND);
        const p = easeOutBack(clamp01((t - ts[i] - 0.3) / 1.0)) * (it.value ?? 0.5);
        const ang = PI + PI * clamp01(p);
        stroke(LINE()); strokeWeight(10); line(0, 40, Math.cos(ang) * (R - 20), 40 + Math.sin(ang) * (R - 20));
        fill(PAL.ink); noStroke(); circle(0, 40, 30);
        txt(it.label || '', 0, 120, 44, cardInk());
        if (it.note) txt(it.note, 0, 175, 30, subInkCard(), { font: FONT_BODY });
        const ok = (it.value ?? 0) >= a0 && (it.value ?? 0) <= a1;
        popAt(R - 10, -R + 20, popK(t, ts[i] + 1.4), () => drawIcon(ok ? 'check' : 'warn', 0, 0, 80));
      });
    });
  },
  cues(s, d) {
    const items = s.items || [];
    return revealTimes(items.length, d, 0.4, 1.6).flatMap((at, i) => {
      const it = items[i], [a0, a1] = it.target || [0.4, 0.7], ok = it.value >= a0 && it.value <= a1;
      return [{ at, name: 'pop' }, { at: at + 0.3, name: 'sweep', vol: 0.6 }, { at: at + 1.4, name: ok ? 'ding' : 'buzz', vol: 0.7 }];
    });
  },
};

// ── checklist: 클립보드 체크리스트 ──
SCENES.checklist = {
  mascot: { x: W - 300, y: FLOOR_Y + 50, s: 1.0, mood: 'point' },
  draw(s, t, d) {
    const items = s.items || [], n = items.length, ts = revealTimes(n, d, 0.7, 1.0);
    const cx = W / 2 - 160, h = 200 + n * 110;
    popAt(cx, 140 + h / 2, popK(t, 0.15, 0.5), () => {
      card(0, 0, 1060, h, { r: 26 });
      fill(PAL.wood); stroke(LINE()); strokeWeight(6); rect(-140, -h / 2 - 30, 280, 70, 18);
      txt(s.title || '체크리스트', 0, -h / 2 + 90, 60, cardInk());
      items.forEach((it, i) => {
        const y = -h / 2 + 200 + i * 110;
        const k = inK(t, ts[i] - 0.3, 0.3);
        withAlpha(0.35 + 0.65 * k, () => {
          fill('#fff'); stroke(LINE()); strokeWeight(5); rect(-450, y - 30, 60, 60, 12);
          txt(it, -360, y, 50, cardInk(), { align: LEFT, font: FONT_HEAD });
        });
        const ck = clamp01((t - ts[i]) / 0.25);
        if (ck > 0) {
          stroke(PAL.green); strokeWeight(12); noFill();
          beginShape(); vertex(-440, y); vertex(-420, y + 18);
          vertex(lerp(-420, -380, ck), lerp(y + 18, y - 32, ck)); endShape();
        }
      });
    });
  },
  cues(s, d) { return [{ at: 0.15, name: 'paper' }, ...revealTimes((s.items || []).length, d, 0.7, 1.0).map((at) => ({ at, name: 'check' }))]; },
};

// ── endcard: 채널명 + 링크, 마지막에 커튼이 닫힘 ──
SCENES.endcard = {
  mascot: { x: W / 2, y: FLOOR_Y + 40, s: 1.1, mood: 'wave' },
  draw(s, t, d) {
    popAt(W / 2, 330, popK(t, 0.3), () => {
      card(0, 0, 1100, 260, { r: 40 });
      txt(s.channel || META().channel || '채널 이름', 0, -30, 100, cardInk());
      txt(s.url || META().url || '', 0, 70, 42, subInkCard(), { font: FONT_BODY });
    });
    popAt(W / 2, 560, popK(t, 0.8), () => {
      fill(PAL.red); stroke(LINE()); strokeWeight(6); rect(-170, -50, 340, 100, 50);
      txt(s.button || '구독', 0, 2, 54, '#fff');
    });
  },
  cues(s, d) { return [{ at: 0.3, name: 'chime' }, { at: 0.8, name: 'pop' }, { at: d - 1.4, name: 'curtain' }]; },
};

// ── 텍스트 색 헬퍼 ──
let CURRENT_WALL = '#E1D3B7';
function titleInk() { return isDark(CURRENT_WALL) ? '#FFFFFF' : PAL.ink; }
function titleOutline() { return isDark(CURRENT_WALL) ? PAL.ink : PAL.card; }
function subInk() { return isDark(CURRENT_WALL) ? '#E8E2D6' : '#5A4E44'; }
function subInkCard() { return PAL.cardText ? '#B8B8C8' : '#6A5E52'; }

// *강조* 표시가 있는 한 줄을 중앙 정렬로 그린다
function markedLine(str, x, y, size, col, hiCol) {
  const toks = parseMarked(str);
  useFont(FONT_HEAD); textSize(size);
  const tw = toks.reduce((a, k) => a + textWidth(k.w), 0);
  let cx = x - tw / 2;
  textAlign(LEFT, CENTER); noStroke();
  toks.forEach((k) => {
    fill(k.hi ? (hiCol || PAL.red) : col);
    text(k.w, cx, y);
    cx += textWidth(k.w);
  });
}
