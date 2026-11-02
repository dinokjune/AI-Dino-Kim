#!/usr/bin/env python3
"""말이 비는 구간을 찾아 ffmpeg로 잘라낸다.

사용법:
  python scripts/autocut.py input.mp4 output.mp4 [--noise -35] [--min-silence 0.35] [--pad 0.08]
                            [--words words.json]

--pad 만큼 소리 구간 앞뒤를 남겨 단어 끝이 잘리지 않게 한다.
--words 에 원본 영상의 Whisper 결과(transcribe.py)를 주면 단어가 걸친 구간은 절대 자르지 않는다.
자른 뒤에는 결과 영상으로 transcribe.py 를 다시 돌려야 자막 싱크가 맞는다.
같은 이름의 .cuts.json 에 남긴 구간/잘린 구간을 기록한다.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def probe_duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        check=True, capture_output=True, text=True,
    ).stdout
    return float(out.strip())


def detect_silences(path: str, noise_db: float, min_silence: float) -> list[tuple[float, float]]:
    log = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path,
         "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    return [(max(0.0, s), e) for s, e in zip(starts, ends)]


def protect_words(
    silences: list[tuple[float, float]], words: list[dict]
) -> list[tuple[float, float]]:
    """단어 구간과 겹치는 부분을 무음 구간에서 빼낸다."""
    result = []
    for s, e in silences:
        for w in words:
            if w["end"] <= s or w["start"] >= e:
                continue
            if w["start"] <= s:
                s = max(s, w["end"])
            else:
                e = min(e, w["start"])
        if e > s:
            result.append((s, e))
    return result


def keep_segments(
    duration: float, silences: list[tuple[float, float]], pad: float, min_silence: float
) -> list[tuple[float, float]]:
    cuts = []
    for s, e in silences:
        # 앞뒤로 pad 만큼 소리를 남긴다. 영상 맨 앞/끝 무음은 끝까지 자른다
        cs = s if s <= 0.01 else s + pad
        ce = e if e >= duration - 0.01 else e - pad
        if ce - cs >= min_silence - 2 * pad and ce > cs:
            cuts.append((cs, ce))
    keeps, t = [], 0.0
    for cs, ce in cuts:
        if cs > t:
            keeps.append((t, cs))
        t = max(t, ce)
    if duration - t > 0.05:
        keeps.append((t, duration))
    return keeps


def render(src: str, dst: str, keeps: list[tuple[float, float]]) -> None:
    parts, labels = [], []
    for i, (s, e) in enumerate(keeps):
        parts.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];")
        parts.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS[a{i}];")
        labels.append(f"[v{i}][a{i}]")
    graph = "".join(parts) + "".join(labels) + f"concat=n={len(keeps)}:v=1:a=1[v][a]"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write(graph)
        script = f.name
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-filter_complex_script", script,
         "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
         "-c:a", "aac", "-b:a", "192k", dst],
        check=True,
    )
    Path(script).unlink(missing_ok=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--noise", type=float, default=-35.0, help="이 dB보다 작으면 무음")
    ap.add_argument("--min-silence", type=float, default=0.35, help="이 초 이상 이어지는 무음만 자른다")
    ap.add_argument("--pad", type=float, default=0.08, help="소리 앞뒤로 남길 여유(초)")
    ap.add_argument("--words", help="원본 영상의 단어 타임스탬프 JSON(선택)")
    args = ap.parse_args()

    duration = probe_duration(args.input)
    silences = detect_silences(args.input, args.noise, args.min_silence)
    if args.words:
        with open(args.words, encoding="utf-8") as f:
            silences = protect_words(silences, json.load(f))
    keeps = keep_segments(duration, silences, args.pad, args.min_silence)
    if not keeps:
        print("남길 소리 구간이 없습니다. --noise 값을 낮춰 보세요.", file=sys.stderr)
        return 1

    render(args.input, args.output, keeps)
    result = probe_duration(args.output)
    removed, t = [], 0.0
    for s, e in keeps:
        if s > t:
            removed.append([round(t, 3), round(s, 3)])
        t = e
    if duration - t > 0.01:
        removed.append([round(t, 3), round(duration, 3)])

    report = {
        "original": round(duration, 3),
        "result": round(result, 3),
        "kept": [[round(s, 3), round(e, 3)] for s, e in keeps],
        "removed": removed,
    }
    Path(args.output).with_suffix(".cuts.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{duration:.1f}초 -> {result:.1f}초 (쉬는 구간 {len(removed)}개 제거)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
