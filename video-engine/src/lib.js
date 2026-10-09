// 공용 상수·이징·그리기 헬퍼
const W = 1920, H = 1080;
const FLOOR_Y = H * 0.84;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
// 탄성 팝인 (0 → 1, 살짝 넘쳤다 돌아옴)
const popK = (t, at, dur = 0.45) => {
  const x = clamp01((t - at) / dur);
  return x <= 0 ? 0 : easeOutBack(x);
};
const inK = (t, at, dur = 0.6) => easeOut(clamp01((t - at) / dur));
const rnd = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const stripMarks = (s) => (s || '').replace(/\*/g, '');

// n개 요소의 등장 시각. 그리기와 효과음이 같은 값을 쓰므로 소리와 화면이 맞는다.
function revealTimes(n, d, start = 0.6, tail = 1.4) {
  if (n <= 1) return [start];
  const span = Math.max(0.3, d - start - tail);
  const gap = Math.min(1.1, span / (n - 1));
  return Array.from({ length: n }, (_, i) => start + i * gap);
}

function withAlpha(a, fn) {
  const ctx = drawingContext, prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * clamp01(a);
  fn();
  ctx.globalAlpha = prev;
}

function clipRect(x, y, w, h, r, fn) {
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.clip();
  fn();
  ctx.restore();
}

// 중앙 기준 카드 (종이 카드 + 그림자)
function card(x, y, w, h, opt = {}) {
  const r = opt.r ?? 22;
  rectMode(CENTER);
  if (opt.shadow !== false) {
    noStroke(); fill(0, 0, 0, 40);
    rect(x + 10, y + 12, w, h, r);
  }
  fill(opt.fill || PAL.card);
  stroke(opt.stroke || PAL.ink); strokeWeight(opt.sw ?? 6);
  rect(x, y, w, h, r);
  rectMode(CORNER);
}

function txt(str, x, y, size, col, opt = {}) {
  textFont(opt.font || FONT_HEAD);
  textSize(size);
  textAlign(opt.align ?? CENTER, opt.valign ?? CENTER);
  textLeading(size * (opt.lead ?? 1.25));
  noStroke();
  if (opt.outline) { stroke(opt.outline); strokeWeight(opt.ow ?? size * 0.16); strokeJoin(ROUND); }
  fill(col);
  if (opt.maxW) {
    const bh = opt.boxH ?? size * 4;
    const bx = (opt.align ?? CENTER) === LEFT ? x : x - opt.maxW / 2;
    text(str, bx, y - bh / 2, opt.maxW, bh);
  } else text(str, x, y);
}

// 위치·크기 중앙 기준으로 팝 스케일 적용
function popAt(x, y, k, fn) {
  if (k <= 0.001) return;
  push(); translate(x, y); scale(k); fn(); pop();
}

// 하이라이트(*단어*)를 포함한 한 줄 문장을 토큰으로
function parseMarked(s) {
  const out = [];
  s.split(/(\*[^*]+\*)/).forEach((part) => {
    if (!part) return;
    const hi = part.startsWith('*') && part.endsWith('*');
    const body = hi ? part.slice(1, -1) : part;
    body.split(/(\s+)/).forEach((w) => {
      if (!w) return;
      // 문장부호만 남은 토큰은 앞 단어에 붙여 줄 끝에 홀로 떨어지지 않게 한다
      const prev = out[out.length - 1];
      if (/^[.,!?…·)\]"'”’]+$/.test(w) && prev && prev.w.trim()) prev.w += w;
      else out.push({ w, hi });
    });
  });
  return out;
}
