# 톤 카드 영상 스튜디오 (p5.js)

톤 카드를 고르고 주제를 넣으면 **대본(Claude) → 내 목소리 내레이션(Cartesia) → 모션그래픽 영상(p5.js) → 자동 검수 → WebM**까지 한 화면에서 만드는 웹 스튜디오입니다. 자동화 로드맵은 [docs/automation-plan.md](docs/automation-plan.md)에 있습니다.

참고한 영상: Ai-Con Lab 「120시간동안 오퍼스 5.5로 모션그래픽을 테스트해봤다」(youtu.be/J4PbF8_u6pY). 영상에서 소개한 작업 방식(톤 카드 = 규칙·사진·숫자, 장면 연결 설계, 두 겹 검수, 실수 노트)을 도구로 구현했습니다. 원본의 대본·캐릭터·음악·화면은 복사하지 않았고, 톤 카드 11장의 규칙과 목표 숫자, 마스코트(디노), BGM, 효과음은 모두 새로 만들었습니다.

## 실행

```bash
cd video-engine
npm install
npm run setup            # MP4 렌더용 헤드리스 크롬 설치 (처음 한 번)
cp .env.example .env     # ANTHROPIC_API_KEY, CARTESIA_API_KEY, CARTESIA_VOICE_ID 입력
npm start                # http://127.0.0.1:8787
```

MP4를 만들려면 **ffmpeg**가 필요합니다(윈도우: `winget install Gyan.FFmpeg`, 맥: `brew install ffmpeg`). PATH에 없으면 `.env`의 `FFMPEG_PATH`에 경로를 적으세요.

키를 `.env` 대신 스튜디오의 ⚙ 설정에 넣어도 됩니다(브라우저에만 저장, 로컬 서버로만 전송). 서버 없이 `studio.html`을 파일로 열면 **오프라인 모드**로 동작합니다. 이때는 "프롬프트 복사"로 Claude 대화창에서 대본을 받아 "JSON 붙여넣기"로 넣고, 음성 대신 브라우저 TTS로 미리 듣습니다.

## 사용 순서

1. **톤 카드 고르기**: 11장 중 하나를 고릅니다. 카드마다 주인공·바탕·색·글꼴·자막·움직임·전환·카메라·효과음·음악·금지 사항과 목표 숫자(장면 길이·밝기·움직임)가 정해져 있고, 고르면 미리보기가 바로 그 톤으로 바뀝니다.
2. **주제와 대본**: 주제를 직접 쓰거나 추천 주제(톤별 4개, ✨ AI 추천, 최근에 만든 주제)를 눌러 고르고, 길이(쇼츠 45초 / 표준 2분 / 롱폼 4분)를 정합니다. **"⚡ 이 주제로 영상 완성하기"**를 누르면 대본 → 내 목소리 → 검수 → MP4까지 한 번에 진행되고, 버튼 아래에 예상 비용이 미리 보입니다. 단계별로 하려면 "대본만 만들기"를 씁니다. 참고 자료를 넣으면 그 안의 사실과 숫자만 씁니다.
3. **목소리 입히기 (TTS)**: TTS 서비스를 고르고 "목록 불러오기"로 목소리를 고른 뒤(또는 ID 직접 입력) "모든 장면 음성 만들기". 속도도 조절할 수 있고, "디노 말풍선 장면은 다른 목소리로"를 켜면 말풍선 장면만 두 번째 목소리로 읽어 대화처럼 들립니다. 장면 JSON에 `"voice": {"provider": "google", "voiceId": "ko-KR-Neural2-C"}`처럼 넣으면 그 장면만 다른 목소리를 씁니다.

   | TTS 서비스 | 특징 | 자막 맞춤 | .env 키 |
   |---|---|---|---|
   | Cartesia | 내 클론 목소리 · 글자당 약 1크레딧 | 단어별 시간표 | `CARTESIA_API_KEY` |
   | ElevenLabs | 내 클론 목소리 · eleven_multilingual_v2 | 글자별 시간표 → 단어 | `ELEVENLABS_API_KEY` |
   | OpenAI | 고정 목소리 11종 · gpt-4o-mini-tts | 글자 수 비례 | `OPENAI_API_KEY` |
   | Google Cloud | 한국어 목소리 다수 (Neural2·Chirp3-HD 등) · 월 100만 자 무료 구간 | 글자 수 비례 | `GOOGLE_TTS_API_KEY` |
   | 네이버 클로바 | 한국어 전용 화자 (nara, nminsang …) | 글자 수 비례 | `CLOVA_CLIENT_ID` · `CLOVA_CLIENT_SECRET` |

   키는 `.env`나 ⚙ 설정에 넣습니다. 비용은 서비스별로 따로 계산되고, 1,000자당 단가는 설정에서 바꿀 수 있습니다(클로바는 네이버 클라우드 요금표를 확인해 넣으세요).
4. **검수**: "숫자 검수 실행"으로 숫자 검문·장면 속도·밝기·움직임·정지 화면·자막 속도·음량을 톤 목표와 비교하고, 컨택트시트(24장)로 눈 검수를 합니다. 걸린 항목은 버튼 한 번으로 **실수 노트**에 규칙으로 넣을 수 있고, 실수 노트는 다음 대본 프롬프트에 자동으로 들어갑니다.
5. **내보내기**: "🎬 MP4 만들기"는 서버가 화면을 프레임 단위로 그리고 소리를 따로 믹스해 1080p MP4를 만듭니다(실시간보다 빠르고 프레임 누락이 없습니다). 서버 없이 쓸 때는 "WebM 녹화"(실시간)를 씁니다.
6. **자동 제작 대기열**: 주제를 한 줄에 하나씩 넣으면 서버가 차례로 대본 → 숫자 검문(실패 시 자동 재작성) → 내 목소리 → 검수 → MP4까지 만들고, 결과 링크(MP4·컨택트시트·대본·유튜브 정보)를 목록에 띄웁니다. "유튜브 비공개 업로드"를 켜면 검수 실패가 없는 영상만 비공개로 올립니다.

**3D 장면 (Three.js)**: 장면 타입 `three`로 진짜 3D를 영상에 넣을 수 있습니다. `model`은 6가지입니다 — `globe`(점 지구본과 연결 호, `points`로 거점 수), `bars`(3D 막대그래프, `values: [{label, value}]`와 `suffix`), `cubes`(떠다니는 큐브), `core`(AI 코어와 궤도 링), `tunnel`(링 터널 비행 오프닝), `mascot`(3D 디노). `text`·`sub`로 글자 카드를 얹고, 색은 고른 톤을 따라갑니다. 대본을 쓰는 Claude도 이 장면을 쓸 수 있고(한 영상에 1~3번), "시네마틱 3D" 톤은 배경 자체가 3D 별 공간으로 바뀝니다. 견본은 `examples/3d-demo.json`을 화면에 끌어다 놓으면 됩니다. 모든 움직임이 시간값으로만 계산돼 미리보기와 MP4가 똑같이 나오고, GPU가 없는 컴퓨터에서도 소프트웨어 렌더로 그려집니다(3D 장면이 많으면 MP4 렌더가 조금 느려집니다). WebGL을 쓸 수 없는 환경에서는 3D 장면이 2D 아이콘으로 대신 나옵니다.

**크레딧·비용**: 미리보기 아래 "💰 크레딧 · 비용" 표에 이 영상의 대본(Claude 입력·출력 토큰과 금액), 음성(Cartesia 크레딧과 금액), 합계(달러·원)와 이번 달 누적이 나옵니다. Claude 금액은 응답에 담긴 실제 토큰 수에 모델 단가(Opus 5.5 기준 100만 토큰당 입력 $4·출력 $20)를 곱해 계산하고, Cartesia는 글자당 약 1크레딧(공식 문서 기준)에 ⚙ 설정의 요금제 단가를 곱합니다. 요금제 단가·클론 목소리 배수·환율은 설정에서 바꿀 수 있습니다(요금은 바뀔 수 있으니 Cartesia 요금 페이지와 맞춰 두세요). 모든 호출은 `out/ledger.jsonl`에 기록되고, 자동 제작 목록과 CLI 결과에도 편당 비용이 표시됩니다. 렌더와 검수는 내 컴퓨터에서 처리해 비용이 없습니다.

**글꼴**: 톤 카드 아래 "글꼴"에서 **제목 · 자막 · 본문 · 숫자** 글꼴을 따로 고릅니다. 목록에는 세 곳의 글꼴이 함께 나옵니다.
- **Google Fonts 한글 36종**: 노토 산스·나눔고딕·나눔명조·고운돋움·검은고딕·도현·주아·나눔펜·개구 등 (인터넷 필요)
- **내 컴퓨터에 설치된 글꼴**: 윈도우 `Fonts`, 맥 `Library/Fonts`, 리눅스 `/usr/share/fonts` 등. 글꼴 파일 안의 이름(한글 이름 포함)과 한글 지원 여부를 읽어 "한글 지원만" 거르기를 할 수 있습니다
- **다운로드 폴더와 `video-engine/fonts`**: `.ttf .otf .woff .woff2` 파일과 zip 안의 글꼴(압축을 풀지 않아도 됨)

검색창으로 이름이나 분류(손글씨, 명조, 제목용 …)를 찾을 수 있고, 고른 글꼴은 모든 톤과 MP4 렌더·자동 제작에 그대로 쓰입니다. 대본에 나오는 글자를 미리 받아 두기 때문에 MP4 첫 프레임부터 고른 글꼴로 찍힙니다. 다른 폴더를 쓰려면 `.env`에 `FONTS_DIR=경로`(여러 개는 윈도우 `;`, 맥 `:`), 설치된 글꼴을 빼려면 `SYSTEM_FONTS=0`. CLI에서는 `--font-head --font-caption --font-body --font-number`를 씁니다.

만든 음성은 브라우저(IndexedDB)에 보관돼서 새로고침해도 다시 돈을 내고 만들 필요가 없습니다.

## 예약 자동 제작 (사람 손 없이)

```bash
node pipeline.mjs --topic "회의록 5분 만에 정리하기" --tone minimal --length shorts
node pipeline.mjs --topics topics.txt --count 1 --tone stage --upload
node pipeline.mjs --topic "주제" --tts google --voice ko-KR-Neural2-C --font-head "Black Han Sans" --font-caption "Nanum Pen Script"
```

`--topics` 파일은 한 줄에 주제 하나이고(`topics.example.txt` 참고), 완성한 주제는 `topics.done.txt`로 옮겨지니 같은 명령을 매일 예약하면 다음 주제부터 차례로 만듭니다. 결과는 `out/<시각>-<주제>/`에 `video.mp4`, `contact-sheet.png`, `script.json`, `qa.json`, `youtube.json`(제목·설명·챕터·태그)으로 남습니다. 실수 노트는 `lessons.txt`에 한 줄에 하나씩 적으면 대본마다 들어갑니다.

- 윈도우 작업 스케줄러: 동작 = `node`, 인수 = `pipeline.mjs --topics topics.txt --count 1`, 시작 위치 = `video-engine` 폴더
- 맥·리눅스 cron (매일 오전 6시): `0 6 * * * cd /경로/video-engine && node pipeline.mjs --topics topics.txt --count 1 >> out/cron.log 2>&1`
- 완성·실패 알림: `.env`의 `NOTIFY_WEBHOOK_URL`에 슬랙·디스코드 웹훅 주소를 넣으면 결과를 보내 줍니다.

## 유튜브 업로드 준비 (선택)

1. Google Cloud 콘솔에서 프로젝트를 만들고 **YouTube Data API v3**를 사용 설정합니다.
2. OAuth 동의 화면을 만들고(테스트 사용자에 내 계정 추가), 사용자 인증 정보에서 **OAuth 클라이언트 ID(데스크톱 앱)**를 만듭니다.
3. `.env`에 `YT_CLIENT_ID`, `YT_CLIENT_SECRET`을 넣고 `npm run youtube:auth`를 실행해 브라우저에서 허용하면 `YT_REFRESH_TOKEN`이 자동으로 저장됩니다.
4. 이후 업로드는 항상 **비공개**이고, AI 합성 콘텐츠 표시(`containsSyntheticMedia`)가 켜진 채로 올라갑니다. 확인 후 유튜브 스튜디오에서 공개로 바꾸세요. 업로드에는 API 하루 할당량이 있으니 실제 한도는 Google Cloud 콘솔에서 확인하세요.

## 톤 카드 11장

| 톤 | 주인공 | 전환 | 자막 | 음악 |
|---|---|---|---|---|
| 종이 무대 | 마스코트 디노 | flow (막이 내려가지 않는 연속 전환) | 흰 글자 + 외곽선 | 어쿠스틱 기타 |
| 다크 네온 | 빛나는 점 | 글리치 하드컷 | 시안 글로우 | 신스웨이브 |
| 볼드 플랫 | 큰 타이포 | 색 면 와이프 (1.2초 박자) | 검정 박스 | 경쾌한 스퀘어 |
| 미니멀 UI | 마우스 커서 | 클릭 후 밀기 | 흰 알약 | 잔잔한 패드 |
| 시네마틱 3D | 카메라 | 줌 | 레터박스 | 저음 패드 |
| 칠판 강의 | 선생님 디노 | 지우개 와이프 | 분필 글씨 | 로파이 |
| 블루프린트 | 선 | 밀기 | 흰 글자 + 외곽선 | 로파이 |
| 파스텔 팝 | 디노 | flow | 흰 글자 + 외곽선 | 우쿨렐레풍 |
| 레트로 신문 | 헤드라인 | 하드컷 | 빨간 띠 | 로파이 |
| 다큐 내레이션 | 내레이션 | 느린 줌 | 레터박스 세리프 | 저음 패드 |
| 터미널 | 깜빡이는 커서 | 글리치 | `>` 고정폭 초록 | 신스 드론 |

밝기·움직임 목표 구간은 각 톤으로 데모 대본을 렌더해 잰 값을 중심으로 잡았습니다. 마음에 드는 완성작이 쌓이면 같은 검수 코드로 재서 `src/tones.js`의 `targets`를 다시 맞추세요.

## 구조

```
video-engine/
├─ studio.html         스튜디오 (메인)
├─ player.html         대본 JSON만 재생하는 간단한 플레이어
├─ server.mjs          로컬 서버: 정적 파일 + /api/claude + /api/tts + /api/render + /api/jobs
├─ produce.mjs         헤드리스 제작기: 대본·음성·검수 자동 실행 + 프레임 렌더 → ffmpeg MP4
├─ pipeline.mjs        예약 실행용 CLI (주제 파일 → MP4 → 선택: 유튜브 업로드)
├─ youtube.mjs         유튜브 비공개 업로드 + 최초 인증(auth)
├─ tts.mjs             TTS 공급자 5종 (Cartesia · ElevenLabs · OpenAI · Google · 클로바)
├─ fonts.mjs           글꼴 찾기: 설치된 글꼴 · 다운로드 · fonts 폴더 (zip 포함, 이름·한글 지원 해석)
├─ usage.mjs           Claude 단가표 · 사용량 기록(out/ledger.jsonl) · 작업 목록 저장
├─ fonts/              내 글꼴을 넣어 두는 폴더 (git 제외)
├─ script.js           데모 대본
├─ PROMPT.md           서버 없이 쓸 때의 대본 프롬프트 예시
├─ docs/automation-plan.md  자동화 사이트 기획서
├─ examples/           장면 타입 견본 JSON
└─ src/
   ├─ tones.js         톤 카드 11장 (규칙 11개 · 목표 숫자 · 엔진 설정 · 추천 주제)
   ├─ backgrounds.js   톤별 배경 · 주인공(커서/빛점) · 자막 스타일 · 와이프/글리치 전환
   ├─ engine.js        타임라인 · 전환 · 내레이션 동기화 · 녹화 · 컨택트시트
   ├─ scenes.js        장면 타입 14종
   ├─ three3d.js       Three.js 3D 장면 6종 + 시네마틱 3D 배경
   ├─ audio.js         효과음 19종 + BGM 프리셋 7종 합성 + 내레이션 예약
   ├─ prompt.js        톤 카드·길이·실수 노트 → 대본 프롬프트
   ├─ qa.js            자동 검수
   ├─ offline.js       프레임 렌더 · 오프라인 오디오 믹스 · 컨택트시트 · 유튜브 정보
   ├─ cost.js          크레딧·비용 계산과 예상 비용
   ├─ fonts.js         내 글꼴 등록
   ├─ studio.js        스튜디오 화면 로직
   └─ lib.js · graphics.js · mascot.js
```

## 알아 둘 점

- Cartesia 연동은 공개 문서 형식(`/tts/sse`, `add_timestamps`, `word_timestamps`)에 맞춰 작성했고, 가짜 Cartesia 서버로 흐름을 시험했습니다. 실제 계정으로는 아직 확인하지 않았으니 첫 실행에서 오류가 나면 ⚙ 설정의 모델(`sonic-3`)과 `Cartesia-Version`(`2024-11-13`)을 계정에 맞게 바꿔 보세요. SSE가 실패하면 서버가 `/tts/bytes`로 다시 시도합니다(이때는 자막을 글자 수 비례로 맞춤).
- 대본 생성은 `claude-opus-5-5`를 쓰고, 안전 분류기가 거절할 때 서버 측 대체 모델로 다시 시도하는 옵션(`fallbacks: "default"`)을 켜 두었습니다. 다른 모델을 쓰려면 `.env`의 `CLAUDE_MODEL`을 바꾸세요.
- 서버는 이 컴퓨터(127.0.0.1)에서만 열리고, 다른 웹사이트가 몰래 요청을 보내 API 키를 쓰지 못하도록 출처·호스트를 검사합니다. 다른 기기에서 접속하게 하려면 로그인 기능을 먼저 붙이세요.
- 화면 비율은 16:9(1920×1080)입니다. 세로형 쇼츠(9:16) 레이아웃은 아직 없습니다.
