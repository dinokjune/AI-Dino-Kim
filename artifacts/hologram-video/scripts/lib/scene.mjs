// storyboard.mjs / qa.mjs 가 함께 쓰는 scene 로딩·번들·브라우저 설정.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const FPS = 30;

/** scene JSON 을 읽고, wordsFile 을 펼치고, 영상 길이를 채운다. */
export const loadScene = (path) => {
  const scene = JSON.parse(readFileSync(path, "utf8"));
  if (scene.wordsFile) {
    scene.words = JSON.parse(
      readFileSync(resolve(dirname(path), scene.wordsFile), "utf8"),
    );
    delete scene.wordsFile;
  }
  if (scene.videoSrc && !scene.duration) {
    const out = execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      resolve(ROOT, "public", scene.videoSrc),
    ]).toString();
    scene.duration = Number(out.trim());
  }
  scene.layers ??= [];
  return scene;
};

export const sceneDuration = (scene) => {
  if (scene.duration) return scene.duration;
  const wordEnd = (scene.words ?? []).reduce((m, w) => Math.max(m, w.end), 0);
  const layerEnd = scene.layers.reduce((m, l) => Math.max(m, l.to), 0);
  return Math.max(wordEnd, layerEnd, 1) + 0.5;
};

/** 스토리보드 칸. scene.segments 가 없으면 자막 문장(문장부호·0.6초 이상 쉼) 단위로 나눈다. */
export const segmentsFor = (scene) => {
  if (scene.segments?.length) return scene.segments;
  const total = sceneDuration(scene);
  const words = scene.words ?? [];
  if (words.length === 0) {
    const segs = [];
    for (let s = 0; s < total; s += 3)
      segs.push({ start: s, end: Math.min(total, s + 3) });
    return segs;
  }
  const bounds = [0];
  words.forEach((w, i) => {
    const next = words[i + 1];
    if (!next) return;
    if (/[.!?…]$/.test(w.text) || next.start - w.end >= 0.6) {
      bounds.push((w.end + next.start) / 2);
    }
  });
  bounds.push(total);
  return bounds.slice(0, -1).map((start, i) => ({ start, end: bounds[i + 1] }));
};

/** 이미 설치된 Chromium 을 쓰려면 REMOTION_BROWSER_EXECUTABLE 을 지정한다. */
export const browserOptions = () =>
  process.env.REMOTION_BROWSER_EXECUTABLE
    ? {
        browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE,
        chromeMode: process.env.REMOTION_CHROME_MODE ?? "headless-shell",
      }
    : {};

export const bundleProject = () =>
  bundle({
    entryPoint: resolve(ROOT, "src/index.ts"),
    publicDir: resolve(ROOT, "public"),
  });

/** 레이어 한 줄 요약(스토리보드 표시용) */
export const describeLayer = (layer) => {
  const p = layer.props ?? {};
  const detail =
    p.text ??
    p.lines?.map((l) => l.text).join(" / ") ??
    p.chips?.map((c) => c.text).join(" ") ??
    p.metrics?.map((m) => `${m.label} ${m.value}`).join(", ") ??
    p.sites?.map((s) => s.name).join(" → ") ??
    p.title ??
    "";
  return detail ? `${layer.type} · ${detail}` : layer.type;
};

export const fmt = (s) =>
  `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
