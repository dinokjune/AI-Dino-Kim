import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { COLORS } from "../theme";

/** 미리보기용 배경. 실제 영상에 얹을 때는 videoSrc를 주거나 투명하게 쓴다. */
export const Stage: React.FC<{
  videoSrc?: string;
  transparent?: boolean;
  children?: React.ReactNode;
}> = ({ videoSrc, transparent, children }) => (
  <AbsoluteFill
    style={{
      background: transparent
        ? "transparent"
        : `radial-gradient(ellipse at 50% 35%, #0c1428 0%, ${COLORS.ink} 70%)`,
    }}
  >
    {videoSrc ? <OffthreadVideo src={staticFile(videoSrc)} /> : null}
    {children}
  </AbsoluteFill>
);
