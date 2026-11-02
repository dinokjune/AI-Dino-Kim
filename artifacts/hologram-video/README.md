# hologram-video

홀로그램풍 릴스/숏츠 영상 제작용 Remotion 프로젝트. 세로 1080×1920, 30fps.

AI 영상 모델은 캐릭터 클립만 만들고, 화면에서 글자로 읽히는 요소(자막·라벨·숫자·웹사이트 화면)는 전부 여기서 코드로 얹는다.

## 제작 흐름

릴 한 편은 scene JSON 하나(`src/scene.ts`의 `Scene`)로 정의한다. 스토리보드·렌더·검수가 모두 이 파일을 기준으로 동작한다.

```
캐릭터 클립(Seedance 등)
  → ① 무음 컷        python scripts/autocut.py
  → ② 단어 받아적기   python scripts/transcribe.py
  → ③ 사이트 녹화     node scripts/capture-sites.mjs      (필요할 때)
  → ④ 사람 오려내기   python scripts/matte.py              (TextBehind 쓸 때)
  → ⑤ scene.json 작성
  → ⑥ 스토리보드 확인 → OK → 렌더   node scripts/storyboard.mjs
  → ⑦ 자가 검수 → scene 수정 → 다시 렌더   node scripts/qa.mjs
```

### 준비

```bash
pnpm install
pip install -r scripts/requirements.txt   # faster-whisper, rembg, OpenCV(4.x)
```

### ① 무음 컷

```bash
python scripts/autocut.py raw.mp4 public/my.mp4
# 30.1초 -> 23.6초 (쉬는 구간 13개 제거)
```

`--min-silence`(기본 0.35초) 이상 쉬는 구간만 자르고, 소리 앞뒤로 `--pad`(기본 0.08초)를 남겨 단어 끝이 잘리지 않게 한다. 원본의 Whisper 결과를 `--words`로 주면 단어가 걸친 구간은 자르지 않는다. 잘린 구간은 `public/my.cuts.json`에 남는다.

### ② 단어 받아적기

무음 컷이 끝난 영상으로 돌려야 자막 싱크가 맞는다.

```bash
python scripts/transcribe.py public/my.mp4 scenes/my.words.json --script 대본.txt
```

### ③ 사이트 녹화

```bash
node scripts/capture-sites.mjs https://ailab.dinokim.com https://my.portfolio --seconds 6
```

결과는 `public/sites/<도메인>.mp4`(커밋하지 않음). 브라우저가 없다는 오류가 나면 `npx playwright install chromium`을 한 번 실행한다.

### ④ 사람 오려내기 (글자를 머리 뒤로)

`TextBehind` 레이어와 같은 구간을 오려낸다. 처음 실행할 때 rembg가 모델(약 170MB)을 내려받는다. CPU에서 프레임당 1초 남짓 걸린다.

```bash
python scripts/matte.py public/my.mp4 public/matte/behind.webm --from 2.0 --to 4.5
```

### ⑤ scene.json

```json
{
  "videoSrc": "my.mp4",
  "wordsFile": "my.words.json",
  "captions": true,
  "layers": [
    { "type": "RoleLabel", "from": 0.2, "to": 3.0, "props": { "text": "Builder" } },
    { "type": "TextBehind", "from": 2.0, "to": 4.5,
      "props": { "text": "CODE", "matteSrc": "matte/behind.webm" } },
    { "type": "SiteHoloCards", "from": 5.0, "to": 9.0,
      "props": { "sites": [{ "name": "AI 활용연구소", "src": "sites/ailab.dinokim.com.mp4" }],
                 "switchAt": [0.2] } }
  ],
  "segments": [{ "start": 0, "end": 4.5, "note": "도입" }]
}
```

- 레이어는 `from`~`to`(초) 동안 보인다. `props` 안의 시각(`at`, `from`, `switchAt` 등)은 레이어 시작 기준 상대값이다.
- `wordsFile`은 scene 파일 기준 상대 경로다. `segments`를 빼면 자막 문장 단위로 스토리보드 칸을 나눈다.
- 예시는 `src/data/sample.scene.json`.

### ⑥ 스토리보드 → 렌더

```bash
node scripts/storyboard.mjs scenes/my.scene.json
```

`out/storyboard/index.html`에 구간별 시간·대사·화면 요소·스틸이 정리된다. 확인 후 `y`를 누르면 `out/reel.mp4`로 렌더한다. `--yes`를 주면 묻지 않고 렌더한다.

### ⑦ 자가 검수

```bash
node scripts/qa.mjs scenes/my.scene.json --video out/reel.mp4
```

1초마다 프레임을 뽑아 `out/qa/sheet.jpg` 한 장에 모으고, 아래를 찾아 `out/qa/report.json`에 남긴다. 문제가 있으면 종료 코드 1.

| 검사 | 기준 |
|---|---|
| 얼굴 가림 | 원본에서 찾은 얼굴(노란 상자)을 그래픽·자막이 10% 넘게 덮음 |
| 자막 겹침 | 그래픽과 자막이 같은 자리에 겹침 |
| 하단 UI / 오른쪽 버튼 영역 침범 | 릴스 UI가 덮는 영역에 카드·글자 같은 덩어리가 들어감(입자는 제외) |
| 화면 끝 잘림 의심 | 그래픽이 화면 위·왼쪽·오른쪽 끝에 닿은 채 2프레임 넘게 머묾 |

`TextBehind` 글자는 원래 사람 뒤로 들어가므로 얼굴 가림 검사에서 뺀다. 얼굴 검출은 OpenCV SSD 모델을 쓰며, 처음 실행할 때 `~/.cache/hologram-video`에 내려받는다. Claude에게 맡길 때는 "렌더하고 qa 돌려서 sheet.jpg 직접 보고, 문제 있으면 scene 고쳐서 다시 렌더해줘"라고 하면 된다.

## 컴포지션

| id | 설명 |
|---|---|
| `Reel` | scene JSON 하나로 원본 영상 + 효과 레이어 + 자막을 합성하는 실제 릴 |
| `WordCaptions` | 말하는 단어만 하늘색으로 튀는 자막 |
| `NeonSign` | 깜빡이다 켜지는 네온 간판 (핑크/하늘 2줄, 3겹 번짐) |
| `RoleLabel` | 손글씨 역할 라벨 + 왼쪽→오른쪽으로 그려지는 밑줄 |
| `ChipsBurst` | 알약 칩 팝인 + 아래→위로 올라가는 입자 (얼굴 영역 회피) |
| `ParticleLogo` | 소용돌이치며 모여 로고가 되는 입자 피날레 |
| `CodeHoloPanel` | 오른쪽 위 홀로그램 창에 코드가 타이핑되고 상태창(✓ build passing)이 뜸 |
| `SiteHoloCards` | 사이트 스크롤 녹화를 홀로그램 카드로 띄우고 `switchAt` 시각마다 스와이프 |
| `MetricCards` | 지표 카드가 포물선으로 날아와 꽂히고 물결 라인 차트가 흐름 |
| `TextBehind` | 큰 글자 위에 오려낸 사람을 얹어 글자가 머리 뒤로 들어간 것처럼 보임 |

효과 하나만 확인할 때는 Studio에서 해당 id를 연다.

```bash
pnpm --filter @workspace/hologram-video run studio
```

## 규칙

- 규격·색·안전 영역은 `src/theme.ts` 한 곳에서만 바꾼다. 하단 440px와 오른쪽 140px는 릴스 UI가 덮으므로 비워 두고, 그래픽은 자막 영역(`CAPTION_TOP`) 위에 둔다.
- 새 효과는 `src/components`에 만들고 `transparent` prop을 받게 한 뒤, `src/scene.ts`의 `LAYER_TYPES`와 `src/components/Reel.tsx`의 `LAYERS`, `src/Root.tsx`에 등록한다.
- 폰트는 저장소에 포함돼 있어 렌더 머신에 따로 설치할 필요가 없다.

## 폰트

`public/fonts`의 파일을 `src/fonts.ts`가 `FontFace`로 등록하고, 로딩이 끝날 때까지 렌더를 멈춘다(`delayRender`).

| 파일 | 용도 | 라이선스 |
|---|---|---|
| `PretendardVariable.woff2` | 본문·자막·로고 (가변 굵기 45–920) | SIL OFL 1.1 (`Pretendard-LICENSE.txt`) |
| `NanumPenScript-Regular.ttf` | 손글씨 라벨 | SIL OFL 1.1 (`NanumPenScript-OFL.txt`) |
| `JetBrainsMono.ttf` | 코드 패널 (가변 굵기 100–800) | SIL OFL 1.1 (`JetBrainsMono-OFL.txt`) |

폰트를 바꾸려면 파일을 `public/fonts`에 넣고 `src/fonts.ts`의 `FONTS`와 `src/theme.ts`의 폰트 이름을 함께 고친다.

## 오프라인/클라우드 환경에서 렌더하기

Remotion은 처음 실행할 때 `remotion.media`에서 headless Chrome을 내려받는다. 외부 도메인이 막힌 환경에서는 이미 설치된 Chromium을 지정한다.

```bash
# remotion CLI
npx remotion still src/index.ts Reel out/reel.png --frame=75 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell \
  --chrome-mode=headless-shell

# storyboard.mjs / qa.mjs
export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
export QA_PYTHON=/path/to/venv/bin/python   # requirements 를 설치한 파이썬
```
