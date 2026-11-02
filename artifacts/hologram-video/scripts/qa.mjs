#!/usr/bin/env node
// 렌더 후 자가 검수: 1초마다 프레임을 뽑아 한 장에 모으고, 얼굴 가림·자막 겹침·잘림·안전 영역 침범을 찾는다.
//
// 사용법:
//   node scripts/qa.mjs scene.json [--video out/reel.mp4] [--out out/qa] [--every 1]
//
// 결과: out/qa/sheet.jpg(문제 칸은 빨간 테두리) 와 out/qa/report.json. 문제가 있으면 종료 코드 1.
// 얼굴 검출은 Python(OpenCV)으로 한다. 다른 파이썬을 쓰려면 QA_PYTHON 을 지정한다.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  FPS,
  ROOT,
  browserOptions,
  bundleProject,
  loadScene,
} from "./lib/scene.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return value;
};
const video = opt("video");
const outDir = resolve(opt("out", resolve(ROOT, "out/qa")));
const every = Number(opt("every", "1"));
const scenePath = args[0];
if (!scenePath) {
  console.error(
    "사용법: node scripts/qa.mjs scene.json [--video out.mp4] [--out dir] [--every 1]",
  );
  process.exit(1);
}

const scene = loadScene(scenePath);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// 그래픽만 / 자막만 따로 투명 배경으로 그려서 어디를 덮는지 픽셀 단위로 본다.
// TextBehind 는 원래 사람 뒤로 들어가는 글자라 얼굴 가림 검사에서 뺀다.
const graphicsOnly = {
  ...scene,
  overlayOnly: true,
  captions: false,
  layers: scene.layers.filter((l) => l.type !== "TextBehind"),
};
const captionsOnly = { ...scene, overlayOnly: true, layers: [] };

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
const total = composition.durationInFrames / FPS;

// renderStill 은 inputProps 가 아니라 composition.props 로 컴포넌트를 그리므로 변형마다 바꿔 넣는다
const still = (props, frame, file, format) =>
  renderStill({
    serveUrl,
    composition: { ...composition, props },
    inputProps: props,
    frame,
    output: resolve(outDir, file),
    imageFormat: format,
    puppeteerInstance: browser,
    ...browserOptions(),
  });

const grab = (src, t, file) =>
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-ss",
    t.toFixed(3),
    "-i",
    src,
    "-frames:v",
    "1",
    resolve(outDir, file),
  ]);

const samples = [];
for (let t = Math.min(0.5, total / 2); t < total; t += every) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * FPS));
  const id = String(samples.length).padStart(3, "0");
  const s = {
    t: Number(t.toFixed(2)),
    full: `full-${id}.jpg`,
    graphics: `gfx-${id}.png`,
    captions: `cap-${id}.png`,
  };
  if (video) grab(video, t, s.full);
  else await still(scene, frame, s.full, "jpeg");
  await still(graphicsOnly, frame, s.graphics, "png");
  await still(captionsOnly, frame, s.captions, "png");
  if (scene.videoSrc) {
    s.base = `base-${id}.jpg`;
    grab(resolve(ROOT, "public", scene.videoSrc), t, s.base);
  }
  samples.push(s);
  process.stdout.write(`\r  ${samples.length}개 프레임`);
}
await browser.close({ silent: true });
console.log();

writeFileSync(
  resolve(outDir, "manifest.json"),
  JSON.stringify({ samples }, null, 2),
);
const python = process.env.QA_PYTHON ?? "python3";
const res = spawnSync(python, [resolve(ROOT, "scripts/qa_check.py"), outDir], {
  stdio: "inherit",
});
process.exit(res.status ?? 1);
