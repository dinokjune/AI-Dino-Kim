#!/usr/bin/env node
// 사이트를 Playwright로 열어 천천히 스크롤하며 녹화한다. 결과는 SiteHoloCards 의 src 로 쓴다.
//
// 사용법:
//   node scripts/capture-sites.mjs https://example.com https://my.site [--seconds 6] [--out public/sites]
//
// 브라우저가 없으면: npx playwright install chromium
// 이미 설치된 Chromium을 쓰려면 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome 를 지정한다.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return value;
};
const seconds = Number(opt("seconds", "6"));
const outDir = resolve(opt("out", "public/sites"));
const urls = args;

if (urls.length === 0) {
  console.error(
    "사용법: node scripts/capture-sites.mjs <url...> [--seconds 6] [--out public/sites]",
  );
  process.exit(1);
}

// SiteHoloCards 카드 비율(860x506)에 맞춘 데스크톱 화면
const VIEWPORT = { width: 1280, height: 752 };

const slug = (url) => {
  try {
    const u = new URL(url);
    const base =
      u.protocol === "file:" ? u.pathname.split("/").pop() : u.hostname;
    return base.replace(/^www\./, "").replace(/[^a-z0-9.-]+/gi, "-");
  } catch {
    return url.replace(/[^a-z0-9.-]+/gi, "-");
  }
};

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});

for (const url of urls) {
  const tmp = mkdtempSync(join(tmpdir(), "capture-"));
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: VIEWPORT },
  });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(500);
  // 로딩 화면은 잘라내고 스크롤 구간만 남긴다
  const trimStart = (Date.now() - started) / 1000;

  await page.evaluate(async (ms) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        window.scrollTo(0, max * ease);
        if (k < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
  }, seconds * 1000);
  await page.waitForTimeout(400);

  const video = page.video();
  await context.close();
  const webm = await video.path();
  const out = join(outDir, `${slug(url)}.mp4`);
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-ss",
    trimStart.toFixed(2),
    "-i",
    webm,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "20",
    "-r",
    "30",
    out + ".part.mp4",
  ]);
  renameSync(out + ".part.mp4", out);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`${url} -> ${out}`);
}

await browser.close();
