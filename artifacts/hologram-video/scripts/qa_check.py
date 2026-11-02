#!/usr/bin/env python3
"""qa.mjs 가 뽑은 프레임으로 문제를 찾고, 한 장짜리 검수 시트를 만든다.

검사 항목
- 얼굴 가림: 원본 영상에서 찾은 얼굴 영역을 그래픽·자막이 10% 넘게 덮는가
- 자막 겹침: 그래픽과 자막이 같은 픽셀에 겹치는가
- 잘림 의심: 그래픽·자막이 화면 위/왼쪽/오른쪽 끝에 닿아 2프레임 넘게 이어지는가
- 안전 영역: 릴스 하단 UI(아래 440px)·오른쪽 버튼 열에 그래픽이 들어가는가
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

import cv2
import numpy as np

W, H = 1080, 1920
SAFE_BOTTOM, SAFE_RIGHT = 440, 140
ALPHA = 40  # 이 값보다 불투명하면 덮은 것으로 본다
THUMB_W = 270
COLS = 6

# OpenCV 공식 SSD 얼굴 검출 모델. 처음 실행할 때 내려받아 캐시에 둔다.
MODEL_DIR = Path(os.environ.get("QA_MODEL_DIR", Path.home() / ".cache" / "hologram-video"))
MODEL_FILES = {
    "deploy.prototxt": "https://raw.githubusercontent.com/opencv/opencv/4.x/samples/dnn/face_detector/deploy.prototxt",
    "res10_fp16.caffemodel": "https://raw.githubusercontent.com/opencv/opencv_3rdparty/"
    "dnn_samples_face_detector_20180205_fp16/res10_300x300_ssd_iter_140000_fp16.caffemodel",
}


def alpha(path: Path) -> np.ndarray:
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None or img.ndim < 3 or img.shape[2] < 4:
        # 투명 채널이 없으면 덮인 영역을 알 수 없다. 조용히 통과시키지 않는다
        raise SystemExit(f"{path} 에 투명 채널이 없습니다. qa.mjs 의 overlayOnly 렌더를 확인하세요.")
    return img[:, :, 3]


def load_face_net():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in MODEL_FILES.items():
        path = MODEL_DIR / name
        if not path.exists():
            print(f"얼굴 검출 모델 내려받는 중: {name}")
            urllib.request.urlretrieve(url, path)
    return cv2.dnn.readNetFromCaffe(
        str(MODEL_DIR / "deploy.prototxt"), str(MODEL_DIR / "res10_fp16.caffemodel")
    )


FACE_NET = None


def detect_faces(path: Path, min_conf: float = 0.5) -> list[tuple[int, int, int, int]]:
    global FACE_NET
    img = cv2.imread(str(path))
    if img is None:
        return []
    if FACE_NET is None:
        FACE_NET = load_face_net()
    # 세로 영상을 그대로 300x300으로 줄이면 얼굴이 찌그러지므로 정사각형으로 채운 뒤 줄인다
    h, w = img.shape[:2]
    side = max(h, w)
    square = cv2.copyMakeBorder(img, 0, side - h, 0, side - w, cv2.BORDER_CONSTANT, value=0)
    blob = cv2.dnn.blobFromImage(cv2.resize(square, (300, 300)), 1.0, (300, 300), (104, 177, 123))
    FACE_NET.setInput(blob)
    found = []
    for det in FACE_NET.forward()[0, 0]:
        if det[2] < min_conf:
            continue
        x0, y0, x1, y1 = (det[3:7] * side).astype(int)
        fw, fh = x1 - x0, y1 - y0
        # 머리카락·이마까지 조금 넓혀서 본다
        found.append((int(x0 - fw * 0.1), int(y0 - fh * 0.25), int(fw * 1.2), int(fh * 1.4)))
    return found


def check(dirpath: Path, s: dict) -> tuple[list[str], list, np.ndarray, np.ndarray]:
    gfx = alpha(dirpath / s["graphics"]) > ALPHA
    cap = alpha(dirpath / s["captions"]) > ALPHA
    over = gfx | cap
    issues = []

    faces = detect_faces(dirpath / s["base"]) if "base" in s else []
    for x, y, w, h in faces:
        x0, y0 = max(0, x), max(0, y)
        region = over[y0 : y + h, x0 : x + w]
        if region.size and region.mean() > 0.10:
            issues.append(f"얼굴 가림 {region.mean() * 100:.0f}%")

    both = int((gfx & cap).sum())
    if both > 400:
        issues.append(f"자막과 그래픽 겹침 {both}px")

    big = solid(gfx)
    if int(big[H - SAFE_BOTTOM :, :].sum()) > 2500:
        issues.append("하단 UI 영역 침범")
    if int(big[H // 2 : H - SAFE_BOTTOM, W - SAFE_RIGHT :].sum()) > 2500:
        issues.append("오른쪽 버튼 영역 침범")
    return issues, faces, gfx, cap


def solid(mask: np.ndarray, min_area: int = 600) -> np.ndarray:
    """입자 같은 작은 점은 빼고, 카드·글자처럼 덩어리진 부분만 남긴다."""
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return keep[labels]


def edge_touch(mask: np.ndarray) -> bool:
    edges = int(mask[:3, :].sum()) + int(mask[:, :3].sum()) + int(mask[:, -3:].sum())
    return edges > 60


def main() -> int:
    dirpath = Path(sys.argv[1])
    samples = json.loads((dirpath / "manifest.json").read_text())["samples"]
    results, touching = [], []
    for s in samples:
        issues, faces, gfx, cap = check(dirpath, s)
        results.append({"t": s["t"], "issues": issues, "faces": faces})
        touching.append(edge_touch(gfx | cap))

    # 잘림은 날아 들어오는 순간이 아니라 머물러 있을 때만 문제로 본다
    for i, r in enumerate(results):
        if touching[i] and ((i > 0 and touching[i - 1]) or (i + 1 < len(results) and touching[i + 1])):
            r["issues"].append("화면 끝 잘림 의심")

    thumbs = []
    for s, r in zip(samples, results):
        img = cv2.imread(str(dirpath / s["full"]))
        scale = THUMB_W / img.shape[1]
        for x, y, w, h in r["faces"]:
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 220, 255), 6)
        img = cv2.resize(img, (THUMB_W, int(img.shape[0] * scale)))
        color = (40, 40, 230) if r["issues"] else (90, 90, 90)
        img = cv2.copyMakeBorder(img, 26, 4, 4, 4, cv2.BORDER_CONSTANT, value=color)
        label = f"{s['t']:.1f}s" + ("  !" + str(len(r["issues"])) if r["issues"] else "")
        cv2.putText(img, label, (8, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        thumbs.append(img)
    blank = np.zeros_like(thumbs[0])
    rows = [thumbs[i : i + COLS] + [blank] * (COLS - len(thumbs[i : i + COLS])) for i in range(0, len(thumbs), COLS)]
    sheet = np.vstack([np.hstack(r) for r in rows])
    cv2.imwrite(str(dirpath / "sheet.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])

    report = {"samples": results, "problems": sum(bool(r["issues"]) for r in results)}
    (dirpath / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"검수 시트: {dirpath / 'sheet.jpg'}")
    for r in results:
        if r["issues"]:
            print(f"  {r['t']:>5.1f}s  " + ", ".join(r["issues"]))
    if report["problems"] == 0:
        print("  문제 없음")
        return 0
    print(f"문제 프레임 {report['problems']}개")
    return 1


if __name__ == "__main__":
    sys.exit(main())
