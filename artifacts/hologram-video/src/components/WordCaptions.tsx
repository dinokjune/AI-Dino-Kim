import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { groupIntoLines } from "../captions";
import { COLORS, FONT_FAMILY, SAFE } from "../theme";
import type { Word } from "../types";

export type WordCaptionsProps = {
  words: Word[];
  /** public/ 기준 영상 경로. 없으면 어두운 배경 위에 자막만 그린다. */
  videoSrc?: string;
  /** 강조 색 */
  highlight?: string;
};

const FONT_SIZE = 84;
const POP_FRAMES = 6;

export const WordCaptions: React.FC<WordCaptionsProps> = ({
  words,
  videoSrc,
  highlight = COLORS.sky,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const lines = useMemo(() => groupIntoLines(words), [words]);
  const line = lines.find((l) => t >= l.start && t < l.end + 0.15);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      {videoSrc ? <OffthreadVideo src={staticFile(videoSrc)} /> : null}
      {line ? (
        <div
          style={{
            position: "absolute",
            left: SAFE.side,
            right: SAFE.side,
            bottom: SAFE.bottom,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0 24px",
            fontFamily: FONT_FAMILY,
            fontSize: FONT_SIZE,
            fontWeight: 900,
            lineHeight: 1.25,
            textAlign: "center",
          }}
        >
          {line.words.map((word, i) => {
            const active = t >= word.start && t < word.end;
            const wordFrame = Math.round(word.start * fps);
            const pop = spring({
              frame: frame - wordFrame,
              fps,
              config: { damping: 12, stiffness: 220 },
              durationInFrames: POP_FRAMES * 2,
            });
            const scale = active ? interpolate(pop, [0, 1], [0.8, 1.12]) : 1;
            return (
              <span
                key={`${word.start}-${i}`}
                style={{
                  display: "inline-block",
                  transform: `scale(${scale})`,
                  color: active ? highlight : COLORS.white,
                  WebkitTextStroke: `10px ${COLORS.ink}`,
                  paintOrder: "stroke fill",
                  textShadow: active ? `0 0 28px ${highlight}88` : "none",
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
