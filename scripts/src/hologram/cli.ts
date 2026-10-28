// 홀로그램 4면 변환기 CLI
//
//   pnpm --filter @workspace/scripts run hologram -- <입력영상> [-o 출력.mp4] [옵션]
//
// 옵션 설명은 --help 또는 scripts/src/hologram/README.md 참고.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildFilterGraph, type HeadDirection, type HologramOptions } from "./layout";

const HELP = `홀로그램 4면 변환기 (페퍼스 고스트 피라미드용)

사용법:
  pnpm --filter @workspace/scripts run hologram -- <입력영상> [옵션]

옵션:
  -o, --output <파일>     출력 MP4 경로 (기본: <입력이름>-hologram.mp4)
  -s, --size <px>         출력 정사각형 한 변 (기본 1080)
  -g, --gap <px>          가운데 빈 정사각형 한 변 (기본 size의 1/4)
      --scale <0~1>       패널 안에서 영상 크기 비율 (기본 1)
      --heads <방향>      outward(기본): 영상 위쪽이 화면 가장자리를 향함
                          inward: 영상 위쪽이 가운데를 향함
      --no-flip           거울 반사 보정(좌우 반전)을 끈다
      --no-mask           대각선 마스크를 끈다 (패널이 겹칠 수 있음)
      --key <색>          이 배경색을 검은색으로 바꾼다 (예: 0xFCC0BA, green)
      --key-similarity <n> --key 색과 비슷한 정도 (0.01~1, 기본 0.15)
      --fps <n>           출력 프레임레이트 (기본 30)
      --crf <n>           x264 화질, 낮을수록 고화질 (기본 18)
  -t, --duration <초>     앞부분만 변환 (테스트용)
      --no-audio          오디오를 빼고 출력
      --print-filter      ffmpeg 필터만 출력하고 끝냄
  -h, --help              이 도움말
`;

function fail(message: string): never {
  console.error(`오류: ${message}`);
  process.exit(1);
}

function toNumber(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) fail(`--${name} 값이 숫자가 아닙니다: ${value}`);
  return n;
}

function main(): void {
  // `pnpm run hologram -- ...`로 넘어온 맨 앞 "--"는 버린다.
  const argv = process.argv.slice(2);
  if (argv[0] === "--") argv.shift();

  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      output: { type: "string", short: "o" },
      size: { type: "string", short: "s" },
      gap: { type: "string", short: "g" },
      scale: { type: "string" },
      heads: { type: "string" },
      flip: { type: "boolean", default: true },
      mask: { type: "boolean", default: true },
      key: { type: "string" },
      "key-similarity": { type: "string" },
      fps: { type: "string" },
      crf: { type: "string" },
      duration: { type: "string", short: "t" },
      audio: { type: "boolean", default: true },
      "print-filter": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  const size = toNumber("size", values.size, 1080);
  const heads = (values.heads ?? "outward") as HeadDirection;
  if (heads !== "outward" && heads !== "inward") fail(`--heads는 outward 또는 inward입니다: ${heads}`);

  const opts: HologramOptions = {
    size,
    gap: toNumber("gap", values.gap, Math.round(size / 4)),
    scale: toNumber("scale", values.scale, 1),
    heads,
    flip: values.flip,
    mask: values.mask,
    fps: toNumber("fps", values.fps, 30),
    keyColor: values.key,
    keySimilarity: toNumber("key-similarity", values["key-similarity"], 0.15),
  };

  let filter: string;
  try {
    filter = buildFilterGraph(opts);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  if (values["print-filter"]) {
    console.log(filter);
    return;
  }

  const input = positionals[0];
  if (!input) fail("입력 영상 경로가 필요합니다. --help를 참고하세요.");
  if (!existsSync(input)) fail(`입력 파일이 없습니다: ${input}`);

  const parsed = path.parse(input);
  const output = values.output ?? path.join(parsed.dir, `${parsed.name}-hologram.mp4`);

  const args = ["-hide_banner", "-loglevel", "warning", "-stats", "-y", "-i", input];
  if (values.duration) args.push("-t", String(toNumber("duration", values.duration, 0)));
  args.push("-filter_complex", filter, "-map", "[out]");
  if (values.audio) args.push("-map", "0:a?", "-c:a", "aac", "-b:a", "192k");
  args.push(
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", String(toNumber("crf", values.crf, 18)),
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    output,
  );

  console.log(`입력: ${input}`);
  console.log(`출력: ${output} (${opts.size}x${opts.size}, 가운데 ${opts.gap}px, heads=${opts.heads}, flip=${opts.flip})`);

  const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (result.error) fail(`ffmpeg를 실행할 수 없습니다. 설치되어 있는지 확인하세요. (${result.error.message})`);
  if (result.status !== 0) fail(`ffmpeg가 실패했습니다 (종료 코드 ${result.status})`);
  console.log("완료");
}

main();
