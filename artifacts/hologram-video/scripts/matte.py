#!/usr/bin/env python3
"""영상의 한 구간에서 사람만 오려내 알파 채널이 있는 webm 으로 저장한다(TextBehind 의 matteSrc).

사용법:
  pip install -r scripts/requirements.txt
  python scripts/matte.py public/my.mp4 public/matte/behind.webm --from 2.0 --to 4.5

--from/--to 는 TextBehind 레이어의 from/to 와 같은 값을 쓴다(무음 컷 이후 영상 기준).
처음 실행할 때 rembg 가 모델(u2net_human_seg, 약 170MB)을 내려받는다.
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

FPS = 30  # Remotion 컴포지션과 같은 값


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output", help=".webm (VP9 + 알파)")
    ap.add_argument("--from", dest="start", type=float, required=True)
    ap.add_argument("--to", dest="end", type=float, required=True)
    ap.add_argument("--model", default="u2net_human_seg", help="사람이 아니면 u2net 또는 isnet-general-use")
    args = ap.parse_args()

    try:
        from PIL import Image
        from rembg import new_session, remove
    except ImportError:
        print("rembg 가 필요합니다: pip install -r scripts/requirements.txt", file=sys.stderr)
        return 1

    session = new_session(args.model)
    with tempfile.TemporaryDirectory() as tmp:
        src_dir, out_dir = Path(tmp, "src"), Path(tmp, "out")
        src_dir.mkdir()
        out_dir.mkdir()
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{args.start:.3f}", "-to", f"{args.end:.3f}",
             "-i", args.input, "-vf", f"fps={FPS}", str(src_dir / "%05d.png")],
            check=True,
        )
        frames = sorted(src_dir.glob("*.png"))
        for i, frame in enumerate(frames, 1):
            cut = remove(Image.open(frame), session=session, post_process_mask=True)
            cut.save(out_dir / frame.name)
            print(f"\r  {i}/{len(frames)}", end="", flush=True)
        print()
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", str(out_dir / "%05d.png"),
             "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30",
             "-auto-alt-ref", "0", args.output],
            check=True,
        )
    print(f"{len(frames)}프레임 -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
