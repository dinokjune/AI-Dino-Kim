// 톤 카드: 색·폰트·리듬 목표값을 한 곳에 모아 둔다.
// meta.tone 으로 고르며, 장면은 wall 이름만 지정한다.
const TONES = {
  // 기본 톤: 종이 질감 무대 + 붉은 커튼 + 크림색 카드
  stage: {
    ink: '#2B2522', card: '#FFF9E6', paper: '#F5EEDB',
    floor: '#E0C097', floorEdge: '#B88655', wood: '#B88655',
    curtain: '#A93226', curtainHi: '#C94A3D', trim: '#E8C547',
    yellow: '#F4D03F', blue: '#3B82F6', red: '#E74C3C', green: '#2ECC71', cyan: '#00E5FF',
    dino: '#6BBF59', dinoDark: '#3F8F3A', belly: '#F3E7C3',
    walls: {
      cream: '#E1D3B7', parchment: '#D9C29E', olive: '#687B62', purple: '#736B7E',
      green: '#889C7E', peach: '#D69F7E', dark: '#2B3A42', red: '#A93226',
    },
    grain: 14, curtains: true,
  },
  // 어두운 기술 톤: 같은 장면 구성을 네온으로
  dark: {
    ink: '#0E0E16', card: '#1F1F2E', paper: '#1A1A24',
    floor: '#151520', floorEdge: '#FF0055', wood: '#3A3A55',
    curtain: '#1A1A24', curtainHi: '#26263A', trim: '#FF0055',
    yellow: '#FFE14D', blue: '#4D9BFF', red: '#FF3B5C', green: '#3DFFA2', cyan: '#00E5FF',
    dino: '#3DFFA2', dinoDark: '#1E9E63', belly: '#D9FFF0',
    walls: { cream: '#1A1A24', parchment: '#20202E', olive: '#18242A', purple: '#221A30',
      green: '#16241E', peach: '#2A1C22', dark: '#0E1418', red: '#2A0F1A' },
    grain: 8, curtains: false, cardText: '#F2F2F7',
  },
  // 미니멀 UI 톤: 흰 화면 + 파란 포인트
  minimal: {
    ink: '#1D2433', card: '#FFFFFF', paper: '#F6F7FB',
    floor: '#ECEEF4', floorEdge: '#D5D9E4', wood: '#C9CFDC',
    curtain: '#3B82F6', curtainHi: '#5B97F8', trim: '#3B82F6',
    yellow: '#FFC93C', blue: '#3B82F6', red: '#EF4444', green: '#22C55E', cyan: '#06B6D4',
    dino: '#3B82F6', dinoDark: '#1E5BC6', belly: '#E6F0FF',
    walls: { cream: '#F6F7FB', parchment: '#EEF1F7', olive: '#EEF6F0', purple: '#F2F0FA',
      green: '#EDF7F2', peach: '#FBF1EC', dark: '#1D2433', red: '#FDECEC' },
    grain: 0, curtains: false,
  },
};

const FONT_HEAD = 'Jua';          // 둥근 굵은 고딕: 자막·제목
const FONT_BODY = 'Gowun Dodum';  // 본문·라벨
let PAL = TONES.stage;

function wallColor(name) {
  return PAL.walls[name] || name || PAL.walls.cream;
}
function isDark(hex) {
  const c = color(hex);
  return red(c) * 0.299 + green(c) * 0.587 + blue(c) * 0.114 < 110;
}
function cardInk() { return PAL.cardText || PAL.ink; }
