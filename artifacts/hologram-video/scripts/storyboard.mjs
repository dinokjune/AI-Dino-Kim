#!/usr/bin/env node
// 렌더 전에 구간별 시간·대사·화면 요소·스틸을 한 페이지로 정리하고, OK 하면 렌더한다.
//
// 사용법:
//   node scripts/storyboard.mjs scene.json [--out out/storyboard] [--render out/reel.mp4] [--yes]
//
// --yes 를 주면 묻지 않고 바로 렌더한다. 터미널이 아니면(예: 다른 도구에서 실행) 스토리보드만 만들고 멈춘다.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  openBrowser,
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  ROOT,
  browserOptions,
  bundleProject,
  describeLayer,
  fmt,
  loadScene,
  segmentsFor,
  FPS,
} from "./lib/scene.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value =
    args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
  args.splice(i, value === true ? 1 : 2);
  return value;
};
const outDir = resolve(flag("out") ?? resolve(ROOT, "out/storyboard"));
const renderOut = resolve(flag("render") ?? resolve(ROOT, "out/reel.mp4"));
const yes = Boolean(flag("yes"));
const scenePath = args[0];
if (!scenePath) {
  console.error(
    "사용법: node scripts/storyboard.mjs scene.json [--out dir] [--render out.mp4] [--yes]",
  );
  process.exit(1);
}

const scene = loadScene(scenePath);
const segments = segmentsFor(scene);
mkdirSync(outDir, { recursive: true });

console.log("번들링…");
const serveUrl = await bundleProject();
const browser = await openBrowser("chrome", browserOptions());
const composition = await selectComposition({
  serveUrl,
  id: "Reel",
  inputProps: scene,
  puppeteerInstance: browser,
  ...browserOptions(),
});

const rows = [];
for (const [i, seg] of segments.entries()) {
  const mid = (seg.start + seg.end) / 2;
  const file = `seg-${String(i + 1).padStart(2, "0")}.jpg`;
  await renderStill({
    serveUrl,
    composition,
    inputProps: scene,
    frame: Math.min(composition.durationInFrames - 1, Math.round(mid * FPS)),
    output: resolve(outDir, file),
    imageFormat: "jpeg",
    jpegQuality: 80,
    puppeteerInstance: browser,
    ...browserOptions(),
  });
  const words = (scene.words ?? []).filter(
    (w) => w.start >= seg.start && w.start < seg.end,
  );
  const layers = scene.layers.filter(
    (l) => l.from < seg.end && l.to > seg.start,
  );
  rows.push({
    i: i + 1,
    seg,
    file,
    line: words.map((w) => w.text).join(" "),
    layers,
  });
  console.log(
    `  ${i + 1}/${segments.length} ${fmt(seg.start)}–${fmt(seg.end)}`,
  );
}

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>스토리보드</title>
<style>
  body{margin:0;padding:24px;background:#0b0f19;color:#e8f6ff;font-family:Pretendard,'Noto Sans KR',sans-serif}
  h1{font-size:22px;margin:0 0 4px} p.meta{color:#8fb3c9;margin:0 0 20px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
  .card{background:#131a2a;border:1px solid #23314d;border-radius:12px;overflow:hidden}
  .card img{width:100%;display:block;aspect-ratio:9/16;object-fit:cover;background:#000}
  .body{padding:10px 12px;font-size:14px;line-height:1.45}
  .time{color:#38d3ff;font-weight:700} .line{margin:6px 0;font-weight:600}
  ul{margin:4px 0 0;padding-left:16px;color:#b9cde0} .note{color:#ffd84d}
</style></head><body>
<h1>스토리보드</h1>
<p class="meta">${esc(scenePath)} · 총 ${fmt(composition.durationInFrames / FPS)} · ${rows.length}개 구간</p>
<div class="grid">
${rows
  .map(
    (r) => `<div class="card"><img src="${r.file}" alt="구간 ${r.i}">
<div class="body"><div class="time">#${r.i} ${fmt(r.seg.start)} – ${fmt(r.seg.end)}</div>
<div class="line">${esc(r.line || "(대사 없음)")}</div>
${r.seg.note ? `<div class="note">${esc(r.seg.note)}</div>` : ""}
<ul>${r.layers.map((l) => `<li>${esc(describeLayer(l))}</li>`).join("") || "<li>그래픽 없음</li>"}${scene.captions !== false && r.line ? "<li>자막</li>" : ""}</ul>
</div></div>`,
  )
  .join("\n")}
</div></body></html>`;
writeFileSync(resolve(outDir, "index.html"), html);
console.log(`\n스토리보드: ${resolve(outDir, "index.html")}`);

let go = yes;
if (!yes && process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  go = /^y(es)?$/i.test(
    (await rl.question("이대로 렌더할까요? [y/N] ")).trim(),
  );
  rl.close();
}
if (!go) {
  console.log(
    "렌더하지 않았습니다. scene 을 고친 뒤 다시 실행하거나 --yes 로 렌더하세요.",
  );
  await browser.close({ silent: true });
  process.exit(0);
}

console.log("렌더 중…");
await renderMedia({
  serveUrl,
  composition,
  inputProps: scene,
  codec: "h264",
  outputLocation: renderOut,
  puppeteerInstance: browser,
  ...browserOptions(),
  onProgress: ({ progress }) =>
    process.stdout.write(`\r  ${Math.round(progress * 100)}%`),
});
await browser.close({ silent: true });
console.log(
  `\n완료: ${renderOut}\n다음: node scripts/qa.mjs ${scenePath} --video ${renderOut}`,
);
