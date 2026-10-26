#!/usr/bin/env python3
"""영상/오디오 -> 단어별 타임스탬프 JSON (src/types.ts 의 Word[] 형식).

사용법:
  pip install faster-whisper
  python scripts/transcribe.py input.mp4 src/data/words.json [--model large-v3] [--script 대본.txt]

--script 를 주면 대본에 있는 표기(띄어쓰기·고유명사)로 Whisper 인식 결과를 보정한다.
무음 컷(ffmpeg)을 먼저 하고 이 스크립트를 돌려야 자막 싱크가 어긋나지 않는다.
"""
import argparse
import json
import re
import sys
from difflib import SequenceMatcher


def normalize(s: str) -> str:
    return re.sub(r"[\s\W_]+", "", s).lower()


def snap_to_script(words: list[dict], script: str) -> list[dict]:
    """인식된 단어와 대본 단어를 순서대로 정렬(difflib)해 철자를 대본 기준으로 맞춘다."""
    script_words = script.split()
    a = [normalize(w["text"]) for w in words]
    b = [normalize(w) for w in script_words]
    out = [dict(w) for w in words]
    for tag, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "replace" and (i2 - i1) == (j2 - j1):
            for k in range(i2 - i1):
                out[i1 + k]["text"] = script_words[j1 + k]
        elif tag == "equal":
            for k in range(i2 - i1):
                out[i1 + k]["text"] = script_words[j1 + k]
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--language", default="ko")
    ap.add_argument("--script", help="대본 텍스트 파일(선택)")
    args = ap.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper 가 필요합니다: pip install faster-whisper", file=sys.stderr)
        return 1

    model = WhisperModel(args.model, compute_type="auto")
    segments, _ = model.transcribe(args.input, language=args.language, word_timestamps=True)

    words = [
        {"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
        for seg in segments
        for w in (seg.words or [])
        if w.word.strip()
    ]

    if args.script:
        with open(args.script, encoding="utf-8") as f:
            words = snap_to_script(words, f.read())

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print(f"{len(words)}개 단어 -> {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
