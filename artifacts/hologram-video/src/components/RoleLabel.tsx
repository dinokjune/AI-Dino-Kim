import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, HAND_FONT_FAMILY, SAFE } from "../theme";
import { Stage } from "./Stage";

export type RoleLabelProps = {
  text: string;
  /** 표시 구간(초) */
  from?: number;
  to?: number;
  videoSrc?: string;
  transparent?: boolean;
};

const UNDERLINE_LEN = 520;

export const RoleLabel: React.FC<RoleLabelProps> = ({
  text,
  from = 0.3,
  to = 3,
  videoSrc,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const fade = interpolate(t, [from, from + 0.2, to - 0.25, to], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // 밑줄: 왼쪽에서 오른쪽으로 손으로 긋듯이
  const draw = interpolate(t, [from + 0.25, from + 0.85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <Stage videoSrc={videoSrc} transparent={transparent}>
      <div
        style={{
          position: "absolute",
          left: SAFE.side + 20,
          top: SAFE.top,
          opacity: fade,
          transform: "rotate(-4deg)",
          transformOrigin: "left bottom",
          filter: `drop-shadow(0 0 14px ${COLORS.sky})`,
        }}
      >
        <div
          style={{
            fontFamily: HAND_FONT_FAMILY,
            fontSize: 150,
            color: COLORS.sky,
            lineHeight: 1,
          }}
        >
          {text}
        </div>
        <svg
          width={UNDERLINE_LEN}
          height={36}
          viewBox={`0 0 ${UNDERLINE_LEN} 36`}
        >
          <path
            d={`M4 24 C 120 6, 260 34, ${UNDERLINE_LEN - 6} 12`}
            fill="none"
            stroke={COLORS.sky}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={UNDERLINE_LEN * 1.1}
            strokeDashoffset={UNDERLINE_LEN * 1.1 * (1 - draw)}
          />
        </svg>
      </div>
    </Stage>
  );
};
