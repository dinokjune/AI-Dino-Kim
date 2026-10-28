import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";

export type HoloFrameProps = {
  title?: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** 반투명 유리 + 스캔라인 + 하늘색 빛 테두리. 홀로그램 패널 계열이 공유한다. */
export const HoloFrame: React.FC<HoloFrameProps> = ({
  title,
  width,
  height,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  // 스캔라인이 천천히 아래로 흐른다
  const scanOffset = (frame * 1.5) % 8;

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        borderRadius: 22,
        overflow: "hidden",
        background: "rgba(14, 40, 70, 0.42)",
        border: `2px solid ${COLORS.sky}`,
        boxShadow: `0 0 18px ${COLORS.sky}aa, 0 0 60px ${COLORS.sky}44, inset 0 0 40px ${COLORS.sky}22`,
        backdropFilter: "blur(6px)",
        fontFamily: FONT_FAMILY,
        ...style,
      }}
    >
      {title ? (
        <div
          style={{
            height: 54,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 22px",
            borderBottom: `1px solid ${COLORS.sky}66`,
            color: COLORS.sky,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {[COLORS.pink, "#ffd84d", "#7cff9b"].map((c) => (
            <span
              key={c}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
          <span style={{ marginLeft: 8 }}>{title}</span>
        </div>
      ) : null}
      <div
        style={{ position: "relative", height: title ? height - 54 : height }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `repeating-linear-gradient(0deg, rgba(120,220,255,0.10) 0px, rgba(120,220,255,0.10) 1px, transparent 2px, transparent 8px)`,
          backgroundPosition: `0 ${scanOffset}px`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
};
