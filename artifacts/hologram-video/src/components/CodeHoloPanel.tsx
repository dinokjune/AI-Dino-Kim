import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, MONO_FONT_FAMILY, SAFE, VIDEO } from "../theme";
import { HoloFrame } from "./HoloFrame";
import { Stage } from "./Stage";

export type CodeHoloPanelProps = {
  code: string;
  title?: string;
  status?: string;
  /** 패널이 뜨는 시각(초) */
  from?: number;
  /** 초당 타이핑 글자 수 */
  charsPerSecond?: number;
  videoSrc?: string;
  transparent?: boolean;
};

const PANEL_W = 600;
const PANEL_H = 560;

export const CodeHoloPanel: React.FC<CodeHoloPanelProps> = ({
  code,
  title = "build.ts",
  status = "✓ build passing",
  from = 0.3,
  charsPerSecond = 45,
  videoSrc,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const appear = spring({
    frame: frame - Math.round(from * fps),
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const typed = Math.max(0, Math.floor((t - from - 0.3) * charsPerSecond));
  const done = typed >= code.length;
  const visible = code.slice(0, typed);
  const cursorOn = Math.floor(frame / (fps / 2)) % 2 === 0;
  const doneAt = from + 0.3 + code.length / charsPerSecond;
  const statusIn = interpolate(t, [doneAt, doneAt + 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 얼굴을 피해 오른쪽 위에 띄운다
  const left = VIDEO.width - SAFE.right - PANEL_W + 60;
  const top = SAFE.top;

  return (
    <Stage videoSrc={videoSrc} transparent={transparent}>
      <HoloFrame
        title={title}
        width={PANEL_W}
        height={PANEL_H}
        style={{
          left,
          top,
          opacity: appear,
          transform: `perspective(1400px) rotateY(-14deg) scale(${0.85 + 0.15 * appear})`,
          transformOrigin: "right center",
        }}
      >
        <pre
          style={{
            margin: 0,
            padding: "18px 24px",
            fontFamily: MONO_FONT_FAMILY,
            fontSize: 25,
            lineHeight: 1.45,
            color: "#d6f6ff",
            whiteSpace: "pre-wrap",
            textShadow: `0 0 8px ${COLORS.sky}88`,
          }}
        >
          {visible}
          <span
            style={{
              display: "inline-block",
              width: 13,
              height: 30,
              marginLeft: 2,
              verticalAlign: "text-bottom",
              background: COLORS.sky,
              opacity: cursorOn || !done ? 1 : 0,
            }}
          />
        </pre>
      </HoloFrame>
      <div
        style={{
          position: "absolute",
          left: left + 40,
          top: top + PANEL_H + 24,
          padding: "10px 22px",
          borderRadius: 12,
          border: `2px solid #7cff9b`,
          background: "rgba(10, 40, 20, 0.6)",
          color: "#7cff9b",
          fontFamily: MONO_FONT_FAMILY,
          fontSize: 26,
          fontWeight: 700,
          boxShadow: `0 0 18px #7cff9b88`,
          opacity: statusIn,
          transform: `translateY(${(1 - statusIn) * 20}px)`,
        }}
      >
        {status}
      </div>
    </Stage>
  );
};

export const codeHoloDefaults: CodeHoloPanelProps = {
  code: `const reel = await render({
  size: "1080x1920",
  fps: 30,
  effects: ["captions", "neon",
    "particles", "holo"],
});

await publish(reel);`,
};
