import React, { useMemo } from "react";
import { random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY, SAFE, VIDEO } from "../theme";
import { Stage } from "./Stage";

export type Chip = { text: string; color: string; at: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type ChipsBurstProps = {
  chips: Chip[];
  /** 입자가 지나가면 안 되는 영역(얼굴). 기본은 화면 중앙 상단부 */
  faceZone?: Rect;
  particleCount?: number;
  videoSrc?: string;
  transparent?: boolean;
};

const DEFAULT_FACE: Rect = { x: 250, y: 380, w: 580, h: 640 };

/** 0~1 값을 얼굴 영역 좌우 두 띠 안으로 고르게 펴서 x좌표로 바꾼다. */
const spreadOutsideFace = (r: number, face: Rect): number => {
  const left = Math.max(0, face.x);
  const rightStart = face.x + face.w;
  const right = Math.max(0, VIDEO.width - rightStart);
  const d = r * (left + right);
  return d < left ? d : rightStart + (d - left);
};

export const ChipsBurst: React.FC<ChipsBurstProps> = ({
  chips,
  faceZone = DEFAULT_FACE,
  particleCount = 70,
  videoSrc,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        x: spreadOutsideFace(random(`px-${i}`), faceZone),
        speed: 140 + random(`ps-${i}`) * 260, // px/s
        phase: random(`pp-${i}`),
        size: 4 + random(`pz-${i}`) * 9,
        color: i % 3 === 0 ? COLORS.pink : COLORS.sky,
      })),
    [particleCount, faceZone],
  );
  const t = frame / fps;

  return (
    <Stage videoSrc={videoSrc} transparent={transparent}>
      {particles.map((p, i) => {
        const travel = p.speed * t + p.phase * VIDEO.height;
        const y = VIDEO.height - (travel % (VIDEO.height + 60));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              opacity: 0.35 + 0.65 * Math.abs(Math.sin(t * 3 + i)),
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: SAFE.side,
          right: SAFE.right,
          bottom: SAFE.bottom + 160,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 22,
          fontFamily: FONT_FAMILY,
        }}
      >
        {chips.map((chip) => {
          const pop = spring({
            frame: frame - Math.round(chip.at * fps),
            fps,
            config: { damping: 10, stiffness: 200 },
          });
          return (
            <div
              key={chip.text}
              style={{
                transform: `scale(${pop})`,
                opacity: Math.min(1, pop * 3),
                padding: "16px 38px",
                borderRadius: 999,
                fontSize: 54,
                fontWeight: 800,
                color: COLORS.ink,
                background: chip.color,
                boxShadow: `0 0 28px ${chip.color}aa`,
              }}
            >
              {chip.text}
            </div>
          );
        })}
      </div>
    </Stage>
  );
};
