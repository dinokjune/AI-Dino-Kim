# hologram-video

홀로그램풍 릴스/숏츠 영상 제작용 Remotion 프로젝트. 세로 1080×1920, 30fps.

AI 영상 모델은 캐릭터 클립만 만들고, 화면에서 글자로 읽히는 요소(자막·라벨·숫자·웹사이트 화면)는 전부 여기서 코드로 얹는다.

## 컴포지션

| id | 설명 | 상태 |
|---|---|---|
| `WordCaptions` | 말하는 단어만 하늘색으로 튀는 자막 | 완료 |

## 사용법

```bash
pnpm --filter @workspace/hologram-video run studio          # 컴포지션별 미리보기
pnpm --filter @workspace/hologram-video run still:captions  # 스틸 한 장 렌더
pnpm --filter @workspace/hologram-video run render:captions # mp4 렌더
```

### 내 영상에 자막 넣기

1. (선택) ffmpeg로 무음 구간을 자른다.
2. 단어 타임스탬프를 뽑는다.
   ```bash
   pip install faster-whisper
   python scripts/transcribe.py my.mp4 src/data/words.json --script 대본.txt
   ```
3. 영상을 `public/my.mp4`에 두고 props로 넘긴다.
   ```bash
   npx remotion render src/index.ts WordCaptions out/my.mp4 \
     --props='{"videoSrc":"my.mp4","words":'"$(cat src/data/words.json)"'}'
   ```

## 규칙

- 규격·색·안전 영역은 `src/theme.ts` 한 곳에서만 바꾼다. 하단 440px는 릴스 UI가 덮으므로 비워 둔다.
- 컴포지션은 효과마다 따로 등록한다(`src/Root.tsx`).
- 한글 폰트: 렌더 머신에 Pretendard 또는 Noto Sans KR이 설치돼 있어야 한다.

## 오프라인/클라우드 환경에서 렌더하기

Remotion은 처음 실행할 때 `remotion.media`에서 headless Chrome을 내려받는다. 외부 도메인이 막힌 환경에서는 이미 설치된 Chromium을 지정한다.

```bash
npx remotion still src/index.ts WordCaptions out/captions.png --frame=75 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
  --chrome-mode=headless-shell
```
