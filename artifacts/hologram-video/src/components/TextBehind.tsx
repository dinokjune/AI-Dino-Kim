import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_FAMILY, VIDEO } from "../theme";
import { Stage } from "./Stage";

export type TextBehindProps = {
  text: string;
  /** scripts/matte.py 로 같은 구간을 오려낸 사람 영상(알파 포함 webm). 없으면 글자만 보인다 */
  matteSrc?: string;
  /** 글자 세로 중심(px) */
  y?: number;
  fontSize?: number;
  color?: string;
  videoSrc?: string;
  transparent?: boolean;
};

/** 큰 글자를 깔고 그 위에 오려낸 사람을 얹어, 글자가 머리 뒤로 들어간 것처럼 보이게 한다. */
export const TextBehind: React.FC<TextBehindProps> = ({
  text,
  matteSrc,
  y = 620,
  fontSize = 260,
  color = COLORS.white,
  videoSrc,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rise = interpolate(t, [0, 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Stage videoSrc={videoSrc} transparent={transparent}>
      <div
        style={{
          position: "absolute",
          left: 0,
          width: VIDEO.width,
          top: y - fontSize / 2,
          textAlign: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          fontSize,
          lineHeight: 1,
          letterSpacing: -4,
          whiteSpace: "nowrap",
          color,
          opacity: rise,
          transform: `translateY(${(1 - rise) * 60}px)`,
          textShadow: `0 0 30px ${COLORS.sky}aa`,
        }}
      >
        {text}
      </div>
      {/* 글자가 absolute 라서, 사람도 absolute 레이어로 감싸야 DOM 순서대로 글자 위에 쌓인다 */}
      {matteSrc ? (
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(matteSrc)} transparent muted />
        </AbsoluteFill>
      ) : null}
    </Stage>
  );
};
