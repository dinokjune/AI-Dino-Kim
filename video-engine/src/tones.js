// 톤 카드: 한 톤의 "결정 사항 11개 + 목표 숫자 + 엔진 설정 + 추천 주제"를 한 장에 묶는다.
// 엔진은 PAL(색), TONE(설정)만 읽고, 장면은 wall 이름(cream·olive …)만 지정한다.
// 목표 숫자: brightness = 화면 평균 밝기(0~255) 허용 구간, cutSec = 평균 장면 길이(초), motion = 0.5초 간격 프레임 변화량 구간.
// 밝기·움직임 구간은 각 톤으로 데모 대본을 렌더해 잰 값(qa.js의 같은 자)을 중심으로 잡았다. 완성작이 쌓이면 그 값으로 다시 맞춘다.

const BASE_ACCENTS = { yellow: '#F4D03F', blue: '#3B82F6', red: '#E74C3C', green: '#2ECC71', cyan: '#00E5FF' };

const TONE_CARDS = [
  {
    id: 'stage', name: '종이 무대', en: 'Paper Stage', swatch: ['#E1D3B7', '#A93226', '#FFF9E6', '#6BBF59'],
    summary: '종이 질감 무대 위에서 마스코트가 카드를 들고 설명하는 따뜻한 해설 톤',
    rules: {
      주인공: '마스코트 디노. 장면이 바뀔 때 걸어서 다음 자리로 이동한다',
      바탕: '벽지 줄무늬 + 나무 바닥, 양옆에 붉은 커튼',
      색: '크림·올리브·보라 벽, 포인트는 빨강과 노랑',
      글꼴: '둥근 굵은 고딕(Jua), 본문은 고운돋움',
      자막: '흰 글자 + 진한 외곽선, 강조 단어만 노랑',
      움직임: '탄성 팝인, 빨랫줄 흔들림, 도장 찍기',
      전환: '막이 내려가지 않는 연속 전환(flow). 분위기를 끊을 때만 커튼',
      카메라: '고정. 무대 전체가 한 화면',
      효과음: '팝·딩·종이·집게 소리, 작고 귀엽게',
      음악: '92BPM 어쿠스틱 기타 스트럼',
      금지: '네온 글로우, 사진 실사 배경, 빠른 하드컷 연속',
    },
    targets: { brightness: [110, 190], cutSec: 5.5, motion: [4, 14] },
    engine: {
      bg: 'stage', hero: 'dino', transition: 'flow', caption: 'outline', bgm: 'acoustic', curtains: true, grain: 14,
      fontHead: 'Jua', fontBody: 'Gowun Dodum',
    },
    pal: {
      ink: '#2B2522', card: '#FFF9E6', paper: '#F5EEDB', floor: '#E0C097', floorEdge: '#B88655', wood: '#B88655',
      curtain: '#A93226', curtainHi: '#C94A3D', trim: '#E8C547', dino: '#6BBF59', dinoDark: '#3F8F3A', belly: '#F3E7C3',
      walls: { cream: '#E1D3B7', parchment: '#D9C29E', olive: '#687B62', purple: '#736B7E', green: '#889C7E', peach: '#D69F7E', dark: '#2B3A42', red: '#A93226' },
    },
    topics: ['일주일에 책 한 권 읽는 법', '회의록 5분 만에 정리하기', '초보자를 위한 프롬프트 3원칙', '아침 30분 루틴 만들기'],
  },
  {
    id: 'neon', name: '다크 네온', en: 'Dark Neon', swatch: ['#0E0E16', '#FF0055', '#00E5FF', '#1F1F2E'],
    summary: '검은 바탕에 형광 선이 지나가는 기술·뉴스 톤',
    rules: {
      주인공: '빛나는 점(오브). 꼬리를 끌며 다음 정보로 시선을 데려간다',
      바탕: '검정 + 얇은 형광 격자, 스캔라인',
      색: '마젠타(#FF0055)와 시안(#00E5FF) 두 색만',
      글꼴: '도현(Do Hyeon), 본문 노토 산스',
      자막: '흰 글자 + 시안 글로우',
      움직임: '빠른 슬라이드 인, 깜빡임, 숫자 롤링',
      전환: '글리치 하드컷(0.25초)',
      카메라: '고정, 전환 순간만 흔들림',
      효과음: '디지털 블립·스윕·버즈',
      음악: '110BPM 신스웨이브 아르페지오 + 4비트 킥',
      금지: '파스텔, 종이 질감, 손글씨',
    },
    targets: { brightness: [15, 70], cutSec: 4, motion: [3, 11] },
    engine: { bg: 'neon', hero: 'orb', transition: 'glitch', caption: 'glow', bgm: 'synth', curtains: false, grain: 6, fontHead: 'Do Hyeon', fontBody: 'Noto Sans KR' },
    pal: {
      ink: '#05050A', card: '#161624', paper: '#1A1A24', floor: '#0B0B12', floorEdge: '#FF0055', wood: '#2A2A40',
      curtain: '#0E0E16', curtainHi: '#16162A', trim: '#FF0055', dino: '#3DFFA2', dinoDark: '#1E9E63', belly: '#D9FFF0',
      yellow: '#FFE14D', red: '#FF2E63', green: '#3DFFA2', blue: '#4D9BFF', cardText: '#F2F2F7', stroke: '#FF0055',
      walls: { cream: '#0E0E16', parchment: '#12121E', olive: '#0C1A1E', purple: '#170F24', green: '#0C1A14', peach: '#1E0E16', dark: '#05080C', red: '#22060F' },
    },
    topics: ['이번 주 AI 뉴스 3가지', '새 AI 모델, 무엇이 달라졌나', '해킹 피해를 막는 비밀번호 습관', '데이터 센터가 전기를 먹는 이유'],
  },
  {
    id: 'flat', name: '볼드 플랫', en: 'Bold Flat', swatch: ['#FF5A36', '#2D5BFF', '#FFD23F', '#1B1B1B'],
    summary: '원색 면이 1.2초마다 바뀌는 리듬감 강한 정보 톤',
    rules: {
      주인공: '거대한 타이포그래피. 글자 자체가 화면을 채운다',
      바탕: '단색 면이 1.2초마다 교체',
      색: '빨강·파랑·노랑·검정 원색 4개',
      글꼴: '검은고딕(Black Han Sans)',
      자막: '검정 박스 안 흰 글자',
      움직임: '빠른 스케일 펀치, 두께 있는 그림자',
      전환: '색 면이 화면을 덮고 지나가는 와이프',
      카메라: '고정, 박자마다 1~2% 펀치 줌',
      효과음: '펀치·팝·클랩',
      음악: '120BPM 경쾌한 스퀘어 리드 + 클랩',
      금지: '그라데이션, 질감, 느린 페이드',
    },
    targets: { brightness: [90, 180], cutSec: 3.5, motion: [25, 80] },
    engine: { bg: 'flat', hero: 'none', transition: 'wipe', caption: 'block', bgm: 'bouncy', curtains: false, grain: 0, fontHead: 'Black Han Sans', fontBody: 'Noto Sans KR', beat: 1.2 },
    pal: {
      ink: '#111111', card: '#FFFFFF', paper: '#FFFFFF', floor: '#111111', floorEdge: '#111111', wood: '#111111',
      curtain: '#111111', curtainHi: '#222222', trim: '#FFD23F', dino: '#FFD23F', dinoDark: '#E0A800', belly: '#FFFFFF',
      yellow: '#FFD23F', red: '#FF5A36', blue: '#2D5BFF', green: '#18C964',
      walls: { cream: '#FFD23F', parchment: '#FF5A36', olive: '#2D5BFF', purple: '#8B5CF6', green: '#18C964', peach: '#FF5A36', dark: '#1B1B1B', red: '#FF2D2D' },
      cycle: ['#FF5A36', '#2D5BFF', '#FFD23F', '#1B1B1B'],
    },
    topics: ['돈 모으는 습관 5가지', '1분 만에 보는 MBTI 오해', '숏폼이 길게 보이는 비밀', '첫 직장 생존 팁'],
  },
  {
    id: 'minimal', name: '미니멀 UI', en: 'Minimal UI', swatch: ['#F6F7FB', '#3B82F6', '#1D2433', '#FFFFFF'],
    summary: '하얀 화면에 앱 창이 떠 있고 커서가 눌러서 장면을 넘기는 사용법 톤',
    rules: {
      주인공: '마우스 커서. 커서가 버튼을 누르면 화면이 바뀐다',
      바탕: '흰색 + 앱 창 테두리',
      색: '흰·회색 + 파랑 하나',
      글꼴: 'IBM Plex Sans KR',
      자막: '하단 둥근 알약 안 짙은 글자',
      움직임: '부드러운 이징, 그림자 들림',
      전환: '커서 클릭 후 옆으로 밀기',
      카메라: '고정',
      효과음: '클릭·토글·알림',
      음악: '잔잔한 패드, 거의 들리지 않게',
      금지: '어두운 배경, 손그림, 네온',
    },
    targets: { brightness: [200, 250], cutSec: 5, motion: [2.5, 10] },
    engine: { bg: 'ui', hero: 'cursor', transition: 'slide', caption: 'pill', bgm: 'ambient', curtains: false, grain: 0, fontHead: 'IBM Plex Sans KR', fontBody: 'IBM Plex Sans KR' },
    pal: {
      ink: '#1D2433', card: '#FFFFFF', paper: '#F6F7FB', floor: '#ECEEF4', floorEdge: '#D5D9E4', wood: '#C9CFDC',
      curtain: '#3B82F6', curtainHi: '#5B97F8', trim: '#3B82F6', dino: '#3B82F6', dinoDark: '#1E5BC6', belly: '#E6F0FF',
      yellow: '#FFC93C', red: '#EF4444', green: '#22C55E', blue: '#3B82F6', cyan: '#06B6D4',
      walls: { cream: '#F6F7FB', parchment: '#EEF1F7', olive: '#EEF6F0', purple: '#F2F0FA', green: '#EDF7F2', peach: '#FBF1EC', dark: '#E8ECF4', red: '#FDECEC' },
    },
    topics: ['노션으로 할 일 관리 시작하기', '구글 캘린더 숨은 기능 5가지', '클로드 프로젝트 기능 사용법', '스마트폰 사진 정리 자동화'],
  },
  {
    id: 'cinema', name: '시네마틱 3D', en: 'Cinematic 3D', swatch: ['#0B1020', '#FFB547', '#5078FF', '#1A2440'],
    summary: '카메라가 3D 공간을 날아다니는 영화 예고편 톤',
    rules: {
      주인공: '카메라. 공간을 밀고 들어가며 다음 장면을 발견한다',
      바탕: '어두운 그라데이션 + 원근 격자 바닥 + 별',
      색: '남색 바탕, 주황 하이라이트',
      글꼴: '노토 세리프(Noto Serif KR)',
      자막: '레터박스 + 가는 흰 글자',
      움직임: '느린 줌·패럴랙스, 피사계 심도',
      전환: '밀고 들어가는 줌',
      카메라: '항상 아주 느리게 흔들리며 전진',
      효과음: '라이저·임팩트·바람',
      음악: '느린 패드와 저음 드론',
      금지: '귀여운 캐릭터, 원색 면, 빠른 컷',
    },
    targets: { brightness: [15, 80], cutSec: 6.5, motion: [3, 12] },
    engine: { bg: 'space', hero: 'none', transition: 'zoom', caption: 'cinema', bgm: 'pad', curtains: false, grain: 10, fontHead: 'Noto Serif KR', fontBody: 'Noto Serif KR', drift: true },
    pal: {
      ink: '#070A14', card: '#141B30', paper: '#0F1528', floor: '#0B1020', floorEdge: '#5078FF', wood: '#2A3352',
      curtain: '#000000', curtainHi: '#05070C', trim: '#FFB547', dino: '#FFB547', dinoDark: '#C07A1A', belly: '#FFF1D6',
      yellow: '#FFB547', red: '#FF5A5A', green: '#4ADE80', blue: '#5078FF', cardText: '#EEF1FF', stroke: '#5078FF',
      walls: { cream: '#0B1020', parchment: '#121A30', olive: '#0B1A1E', purple: '#140F28', green: '#0B1A16', peach: '#1E1410', dark: '#05070C', red: '#200A0E' },
    },
    topics: ['인류가 달에 다시 가는 이유', '블랙홀을 처음 찍은 날', 'AI가 바꿀 10년 뒤 하루', '한 장의 사진이 바꾼 역사'],
  },
  {
    id: 'chalk', name: '칠판 강의', en: 'Chalkboard', swatch: ['#2F4A3A', '#F2F0E6', '#F4D03F', '#8B5A2B'],
    summary: '초록 칠판에 분필로 쓰고 지우며 설명하는 강의 톤',
    rules: {
      주인공: '선생님 디노. 분필로 가리키며 설명한다',
      바탕: '초록 칠판 + 나무 틀 + 분필 가루',
      색: '칠판 초록, 분필 흰색, 노랑·분홍 분필 강조',
      글꼴: '손글씨(Gaegu)',
      자막: '분필 흰 글씨, 외곽선 없음',
      움직임: '써 내려가듯 등장, 살짝 떨림',
      전환: '지우개로 쓱 지우는 와이프',
      카메라: '고정',
      효과음: '분필 긁는 소리·탁 치기',
      음악: '느린 로파이 피아노',
      금지: '네온, 실사 사진, 각진 UI',
    },
    targets: { brightness: [60, 120], cutSec: 6, motion: [2.5, 10] },
    engine: { bg: 'chalk', hero: 'dino', transition: 'erase', caption: 'chalk', bgm: 'lofi', curtains: false, grain: 16, fontHead: 'Gaegu', fontBody: 'Gaegu' },
    pal: {
      ink: '#1E2A22', card: '#355643', paper: '#2F4A3A', floor: '#8B5A2B', floorEdge: '#6B4421', wood: '#8B5A2B',
      curtain: '#2F4A3A', curtainHi: '#355643', trim: '#F4D03F', dino: '#9BD08B', dinoDark: '#5E9A55', belly: '#F2F0E6',
      yellow: '#F7E07A', red: '#FF9AA2', green: '#B9F2A1', blue: '#9AD0FF', cardText: '#F2F0E6', stroke: '#F2F0E6',
      walls: { cream: '#2F4A3A', parchment: '#334E3E', olive: '#2B4536', purple: '#33404A', green: '#2F4A3A', peach: '#3E4A3A', dark: '#22332A', red: '#4A3A3A' },
    },
    topics: ['복리가 무서운 이유', '맞춤법 자주 틀리는 5가지', '광합성 3분 정리', '엑셀 함수 VLOOKUP 이해하기'],
  },
  {
    id: 'blueprint', name: '블루프린트', en: 'Blueprint', swatch: ['#1E4E8C', '#FFFFFF', '#9CC8FF', '#FFD166'],
    summary: '파란 설계도 위에 흰 선으로 구조를 그려 나가는 기술 해설 톤',
    rules: {
      주인공: '선. 도형과 화살표가 그려지며 구조를 설명한다',
      바탕: '파란 모눈 설계도',
      색: '파랑 바탕, 흰 선, 노랑 치수선',
      글꼴: 'IBM Plex Sans KR',
      자막: '흰 글자 + 짙은 파랑 외곽선',
      움직임: '선이 그려지는 스트로크, 치수 표시',
      전환: '옆으로 밀기',
      카메라: '고정',
      효과음: '펜 긁기·틱·딩',
      음악: '로파이 비트',
      금지: '마스코트, 질감 많은 종이, 원색 면',
    },
    targets: { brightness: [60, 120], cutSec: 5.5, motion: [2.5, 10] },
    engine: { bg: 'blueprint', hero: 'none', transition: 'slide', caption: 'outline', bgm: 'lofi', curtains: false, grain: 6, fontHead: 'IBM Plex Sans KR', fontBody: 'IBM Plex Sans KR' },
    pal: {
      ink: '#0E2C55', card: '#245DA3', paper: '#1E4E8C', floor: '#1E4E8C', floorEdge: '#9CC8FF', wood: '#9CC8FF',
      curtain: '#163E70', curtainHi: '#1E4E8C', trim: '#FFD166', dino: '#9CC8FF', dinoDark: '#5E8FD0', belly: '#FFFFFF',
      yellow: '#FFD166', red: '#FF8A80', green: '#8CF5B5', blue: '#9CC8FF', cardText: '#FFFFFF', stroke: '#FFFFFF',
      walls: { cream: '#1E4E8C', parchment: '#215492', olive: '#1B5A7A', purple: '#2A4A8C', green: '#1B5E74', peach: '#2C4E86', dark: '#123766', red: '#3A4A86' },
    },
    topics: ['인터넷은 어떻게 연결될까', 'AI 에이전트의 구조', '전기차 배터리 원리', 'API가 뭔지 3분 설명'],
  },
  {
    id: 'pastel', name: '파스텔 팝', en: 'Pastel Pop', swatch: ['#FCE1E4', '#A0C4FF', '#CAFFBF', '#FFD6A5'],
    summary: '말랑한 파스텔 색과 통통 튀는 도형의 귀여운 생활 정보 톤',
    rules: {
      주인공: '마스코트 디노, 항상 웃는 얼굴',
      바탕: '파스텔 단색 + 떠다니는 둥근 도형',
      색: '분홍·하늘·민트·살구',
      글꼴: 'Jua',
      자막: '흰 글자 + 진한 외곽선',
      움직임: '통통 튀는 바운스, 젤리 스쿼시',
      전환: '연속 전환(flow)',
      카메라: '고정',
      효과음: '뿅·팝·반짝',
      음악: '경쾌한 우쿨렐레풍 플럭',
      금지: '어두운 배경, 날카로운 각, 경고 느낌의 빨강 남용',
    },
    targets: { brightness: [180, 240], cutSec: 5, motion: [3, 12] },
    engine: { bg: 'pastel', hero: 'dino', transition: 'flow', caption: 'outline', bgm: 'ukulele', curtains: false, grain: 0, fontHead: 'Jua', fontBody: 'Gowun Dodum' },
    pal: {
      ink: '#3A2E3F', card: '#FFFFFF', paper: '#FFF7FA', floor: '#FFE3EC', floorEdge: '#F5B8CB', wood: '#F5B8CB',
      curtain: '#F5B8CB', curtainHi: '#FFD1DE', trim: '#FFD6A5', dino: '#8FD9A8', dinoDark: '#5DB27E', belly: '#FFF7E6',
      yellow: '#FFD166', red: '#FF7A9A', green: '#5DD39E', blue: '#7FB2FF',
      walls: { cream: '#FCE1E4', parchment: '#FFF1D6', olive: '#DFF5E3', purple: '#E8E0FF', green: '#D9F7EC', peach: '#FFE5D4', dark: '#C9D6FF', red: '#FFD6DE' },
    },
    topics: ['자취생 냉장고 정리법', '반려식물 안 죽이는 법', '하루 물 2L 쉽게 마시기', '주말 브런치 10분 레시피'],
  },
  {
    id: 'news', name: '레트로 신문', en: 'Retro Print', swatch: ['#F1E9D8', '#C8102E', '#1A1A1A', '#D9CDB4'],
    summary: '오래된 신문 지면처럼 망점과 굵은 헤드라인으로 사건을 다루는 톤',
    rules: {
      주인공: '헤드라인. 굵은 제목이 찍혀 나온다',
      바탕: '누런 신문지 + 망점 + 단 구분선',
      색: '신문지 베이지, 검정, 빨강 한 색',
      글꼴: '도현(Do Hyeon)',
      자막: '빨간 띠 안 흰 글자',
      움직임: '도장처럼 찍힘, 종이 넘김',
      전환: '하드컷 + 종이 넘기는 소리',
      카메라: '고정, 가끔 신문 위로 미세 줌',
      효과음: '인쇄기·도장·종이',
      음악: '로파이 재즈풍',
      금지: '네온, 파스텔, 3D',
    },
    targets: { brightness: [150, 215], cutSec: 5, motion: [3, 11] },
    engine: { bg: 'news', hero: 'none', transition: 'cut', caption: 'block', bgm: 'lofi', curtains: false, grain: 22, fontHead: 'Do Hyeon', fontBody: 'Noto Serif KR', captionColor: '#C8102E' },
    pal: {
      ink: '#1A1A1A', card: '#FBF6EA', paper: '#F1E9D8', floor: '#E4D9C2', floorEdge: '#1A1A1A', wood: '#8A7A5C',
      curtain: '#1A1A1A', curtainHi: '#2A2A2A', trim: '#C8102E', dino: '#8A9A7A', dinoDark: '#5E6E50', belly: '#FBF6EA',
      yellow: '#E8B400', red: '#C8102E', green: '#3E7D4F', blue: '#2F4F8F',
      walls: { cream: '#F1E9D8', parchment: '#EADFC8', olive: '#E3DCC6', purple: '#E7DED4', green: '#E2E3CF', peach: '#F0DECB', dark: '#2A2A2A', red: '#E9D3C8' },
    },
    topics: ['1997년 외환위기 3분 정리', '오늘의 경제 뉴스 읽는 법', '그해 가장 많이 팔린 물건', '사라진 직업 이야기'],
  },
  {
    id: 'docu', name: '다큐 내레이션', en: 'Documentary', swatch: ['#1C1714', '#D9B26F', '#EDE3D1', '#5A4A3A'],
    summary: '레터박스와 필름 입자, 느린 줌으로 이야기를 들려주는 다큐 톤',
    rules: {
      주인공: '내레이션. 화면은 말을 받쳐 주는 자료',
      바탕: '어두운 갈색 + 필름 입자 + 비네트',
      색: '흑갈색, 금색 하이라이트, 크림 글자',
      글꼴: '노토 세리프',
      자막: '레터박스 + 세리프 흰 글자',
      움직임: '켄 번스 느린 줌, 부드러운 페이드',
      전환: '천천히 밀고 들어가는 줌',
      카메라: '항상 미세하게 전진',
      효과음: '거의 없음, 장면 시작에 낮은 붐',
      음악: '첼로풍 저음 패드',
      금지: '귀여운 효과음, 원색, 빠른 팝인',
    },
    targets: { brightness: [20, 90], cutSec: 7, motion: [2.5, 10] },
    engine: { bg: 'docu', hero: 'none', transition: 'zoom', caption: 'cinema', bgm: 'pad', curtains: false, grain: 26, fontHead: 'Noto Serif KR', fontBody: 'Noto Serif KR', drift: true, quietSfx: true },
    pal: {
      ink: '#120E0B', card: '#2A221C', paper: '#1C1714', floor: '#1C1714', floorEdge: '#D9B26F', wood: '#5A4A3A',
      curtain: '#000000', curtainHi: '#0A0806', trim: '#D9B26F', dino: '#D9B26F', dinoDark: '#A5803F', belly: '#EDE3D1',
      yellow: '#D9B26F', red: '#C0564A', green: '#8FB07A', blue: '#7F9CB0', cardText: '#EDE3D1', stroke: '#D9B26F',
      walls: { cream: '#1C1714', parchment: '#221B16', olive: '#1A1C16', purple: '#1E1820', green: '#171C17', peach: '#241A14', dark: '#0E0B09', red: '#241312' },
    },
    topics: ['세종이 한글을 만든 진짜 이유', '커피가 세계로 퍼진 길', '한 마을이 사라진 이야기', '최초의 컴퓨터를 만든 사람들'],
  },
  {
    id: 'terminal', name: '터미널', en: 'Terminal', swatch: ['#0A0F0A', '#39FF7A', '#B6FFCF', '#123018'],
    summary: '검은 터미널에 초록 글자가 타이핑되는 개발자 톤',
    rules: {
      주인공: '깜빡이는 커서. 모든 글자는 타이핑으로 등장',
      바탕: '검정 터미널 창 + 스캔라인',
      색: '형광 초록 한 색, 경고만 주황',
      글꼴: '나눔고딕코딩',
      자막: '> 프롬프트가 붙은 초록 고정폭 글자',
      움직임: '타이핑, 줄 단위 스크롤',
      전환: '하드컷 + 화면 지직',
      카메라: '고정',
      효과음: '키보드 타건·엔터·비프',
      음악: '낮은 신스 드론',
      금지: '마스코트, 둥근 도형, 파스텔',
    },
    targets: { brightness: [10, 60], cutSec: 4.5, motion: [2.5, 10] },
    engine: { bg: 'terminal', hero: 'none', transition: 'glitch', caption: 'mono', bgm: 'synth', curtains: false, grain: 8, fontHead: 'Nanum Gothic Coding', fontBody: 'Nanum Gothic Coding' },
    pal: {
      ink: '#020602', card: '#0D170D', paper: '#0A0F0A', floor: '#0A0F0A', floorEdge: '#39FF7A', wood: '#1E3A22',
      curtain: '#000000', curtainHi: '#050A05', trim: '#39FF7A', dino: '#39FF7A', dinoDark: '#1F9E48', belly: '#B6FFCF',
      yellow: '#FFB020', red: '#FF5F56', green: '#39FF7A', blue: '#5AC8FA', cyan: '#39FF7A', cardText: '#B6FFCF', stroke: '#39FF7A',
      walls: { cream: '#0A0F0A', parchment: '#0C130C', olive: '#0A120E', purple: '#0E0C14', green: '#0A140C', peach: '#120E0A', dark: '#050805', red: '#140808' },
    },
    topics: ['깃(Git) 명령어 5개로 끝내기', '클로드 코드 처음 써 보기', '터미널이 무섭지 않은 이유', '자동화 스크립트 한 줄 만들기'],
  },
];

// 엔진 호환: TONES[id] = 팔레트(+ 기본 강조색) 형태
const TONES = {};
TONE_CARDS.forEach((c) => {
  TONES[c.id] = Object.assign({}, BASE_ACCENTS, c.pal, { grain: c.engine.grain, curtains: c.engine.curtains });
});
TONES.dark = TONES.neon; // 이전 대본 호환

let FONT_HEAD = 'Jua';
let FONT_BODY = 'Gowun Dodum';
let PAL = TONES.stage;
let TONE = TONE_CARDS[0];

function setTone(id) {
  TONE = TONE_CARDS.find((c) => c.id === id) || (id === 'dark' ? TONE_CARDS[1] : TONE_CARDS[0]);
  PAL = TONES[TONE.id];
  FONT_HEAD = TONE.engine.fontHead;
  FONT_BODY = TONE.engine.fontBody;
}

// 대본 생성 프롬프트에 넣을 톤 카드 텍스트
function toneCardText(card) {
  const r = Object.entries(card.rules).map(([k, v], i) => `${i + 1}. ${k}: ${v}`).join('\n');
  const t = card.targets;
  return `톤: ${card.name} (${card.en}) – ${card.summary}\n결정 사항 11개:\n${r}\n목표 숫자: 평균 장면 길이 ${t.cutSec}초(±30%), 화면 밝기 ${t.brightness[0]}~${t.brightness[1]}/255`;
}

function wallColor(name) {
  return PAL.walls[name] || name || PAL.walls.cream;
}
function isDark(hex) {
  const c = color(hex);
  return red(c) * 0.299 + green(c) * 0.587 + blue(c) * 0.114 < 110;
}
function cardInk() { return PAL.cardText || PAL.ink; }
