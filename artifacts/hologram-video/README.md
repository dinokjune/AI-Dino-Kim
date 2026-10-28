# hologram-video

홀로그램풍 릴스/숏츠 영상 제작용 Remotion 프로젝트. 세로 1080×1920, 30fps.

AI 영상 모델은 캐릭터 클립만 만들고, 화면에서 글자로 읽히는 요소(자막·라벨·숫자·웹사이트 화면)는 전부 여기서 코드로 얹는다.

## 컴포지션

| id | 설명 | 상태 |
|---|---|---|
| `WordCaptions` | 말하는 단어만 하늘색으로 튀는 자막 | 완료 |
| `NeonSign` | 깜빡이다 켜지는 네온 간판 (핑크/하늘 2줄, 3겹 번짐) | 완료 |
| `RoleLabel` | 손글씨 역할 라벨 + 왼쪽→오른쪽으로 그려지는 밑줄 | 완료 |
| `ChipsBurst` | 알약 칩 팝인 + 아래→위로 올라가는 입자 (얼굴 영역 회피) | 완료 |
| `ParticleLogo` | 소용돌이치며 모여 로고가 되는 입자 피날레 | 완료 |

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
- 폰트는 저장소에 포함돼 있어 렌더 머신에 따로 설치할 필요가 없다(아래 참고).

## 폰트

`public/fonts`의 파일을 `src/fonts.ts`가 `FontFace`로 등록하고, 로딩이 끝날 때까지 렌더를 멈춘다(`delayRender`).

| 파일 | 용도 | 라이선스 |
|---|---|---|
| `PretendardVariable.woff2` | 본문·자막·로고 (가변 굵기 45–920) | SIL OFL 1.1 (`Pretendard-LICENSE.txt`) |
| `NanumPenScript-Regular.ttf` | 손글씨 라벨 | SIL OFL 1.1 (`NanumPenScript-OFL.txt`) |

폰트를 바꾸려면 파일을 `public/fonts`에 넣고 `src/fonts.ts`의 `FONTS`와 `src/theme.ts`의 폰트 이름을 함께 고친다.

## 오프라인/클라우드 환경에서 렌더하기

Remotion은 처음 실행할 때 `remotion.media`에서 headless Chrome을 내려받는다. 외부 도메인이 막힌 환경에서는 이미 설치된 Chromium을 지정한다.

```bash
npx remotion still src/index.ts WordCaptions out/captions.png --frame=75 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
  --chrome-mode=headless-shell
```
