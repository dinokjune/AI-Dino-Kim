// 모든 컴포지션이 공유하는 규격·색·폰트. 영상마다 톤이 달라지지 않도록 한 곳에서만 바꾼다.
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

// 릴스/숏츠 UI(하단 버튼·캡션, 우측 버튼)가 덮는 영역. 그래픽은 이 안쪽에 둔다.
export const SAFE = {
  bottom: 440,
  right: 140,
  side: 60,
  top: 160,
} as const;

export const COLORS = {
  sky: "#38d3ff",
  pink: "#ff4fa3",
  white: "#ffffff",
  ink: "#05070d",
} as const;

export const FONT_FAMILY =
  "Pretendard, 'Noto Sans KR', 'Noto Sans CJK KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
