import React from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";
import { Stage } from "./Stage";

export type NeonLine = { text: string; color: string };

export type NeonSignProps = {
  lines: NeonLine[];
  /** 켜지는 시각(초) */
  onAt?: number;
  fontSize?: number;
  videoSrc?: string;
};

const glow = (c: string) =>
  `0 0 6px #fff, 0 0 18px ${c}, 0 0 42px ${c}, 0 0 90px ${c}99`;

export const NeonSign: React.FC<NeonSignProps> = ({
  lines,
  onAt = 1,
  fontSize = 150,
  videoSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const onFrame = Math.round(onAt * fps);
  const since = frame - onFrame;

  // 켜지기 전 0.5초 동안 형광등처럼 한 번 깜빡이고, 이후 확 켜진다.
  let opacity: number;
  if (since < -15) opacity = 0.04;
  else if (since < -9) opacity = 0.7;
  else if (since < -6) opacity = 0.05;
  else if (since < 0) opacity = 0.55;
  else opacity = 1 - random(`flicker-${frame}`) * 0.06; // 켜진 뒤 미세 떨림
  const jitterX = since >= 0 ? (random(`jx-${frame}`) - 0.5) * 2 : 0;

  return (
    <Stage videoSrc={videoSrc}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          fontSize,
          lineHeight: 1.15,
          letterSpacing: 4,
          transform: `translateX(${jitterX}px)`,
          opacity,
        }}
      >
        {lines.map((line) => (
          <div
            key={line.text}
            style={{
              color: "#fff",
              textShadow: opacity > 0.5 ? glow(line.color) : "none",
              WebkitTextStroke: `2px ${line.color}`,
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </Stage>
  );
};

export const neonDefaults: NeonSignProps = {
  lines: [
    { text: "MOONGI", color: COLORS.pink },
    { text: "STUDIO", color: COLORS.sky },
  ],
  onAt: 1,
};
