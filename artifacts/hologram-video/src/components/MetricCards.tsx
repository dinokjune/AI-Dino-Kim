import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY, SAFE, VIDEO } from "../theme";
import { HoloFrame } from "./HoloFrame";
import { Stage } from "./Stage";

export type Metric = { label: string; value: string; at: number };

export type MetricCardsProps = {
  metrics: Metric[];
  /** 라인 차트가 그려지기 시작하는 시각(초) */
  chartAt?: number;
  videoSrc?: string;
  transparent?: boolean;
};

const CARD_W = 300;
const CARD_H = 170;
const GAP = 24;
const FLY = 0.7;
const CHART_W = VIDEO.width - SAFE.side * 2;
const CHART_H = 220;

/** 물결치는 라인 차트 경로. phase가 바뀌면 오른쪽에서 왼쪽으로 흘러간다. */
const wavePath = (phase: number): string => {
  const pts: string[] = [];
  for (let x = 0; x <= CHART_W; x += 12) {
    const k = x / CHART_W;
    const y =
      CHART_H * 0.75 -
      k * CHART_H * 0.45 +
      Math.sin(k * 9 + phase) * 18 +
      Math.sin(k * 23 + phase * 1.7) * 7;
    pts.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
  }
  return pts.join(" ");
};

export const MetricCards: React.FC<MetricCardsProps> = ({
  metrics,
  chartAt = 0.4,
  videoSrc,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const rowW = metrics.length * CARD_W + (metrics.length - 1) * GAP;
  const rowLeft = (VIDEO.width - rowW) / 2;
  const rowTop = 1040;
  const draw = interpolate(t, [chartAt, chartAt + 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const pathLen = CHART_W * 1.4;

  return (
    <Stage videoSrc={videoSrc} transparent={transparent}>
      {metrics.map((m, i) => {
        const p = interpolate(t, [m.at, m.at + FLY], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        });
        if (p <= 0) return null;
        const tx = rowLeft + i * (CARD_W + GAP);
        const ty = rowTop;
        // 화면 밖 아래 좌/우에서 출발해 포물선으로 날아온다
        const sx = i % 2 === 0 ? -CARD_W - 40 : VIDEO.width + 40;
        const sy = VIDEO.height + 40;
        const x = sx + (tx - sx) * p;
        const y = sy + (ty - sy) * p - Math.sin(p * Math.PI) * 420;
        const spin = (1 - p) * (i % 2 === 0 ? -40 : 40);
        return (
          <HoloFrame
            key={m.label}
            width={CARD_W}
            height={CARD_H}
            style={{
              left: x,
              top: y,
              transform: `rotate(${spin}deg) scale(${0.7 + 0.3 * p})`,
            }}
          >
            <div
              style={{
                padding: "22px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontFamily: FONT_FAMILY,
              }}
            >
              <span style={{ color: "#bfefff", fontSize: 28, fontWeight: 600 }}>
                {m.label}
              </span>
              <span
                style={{
                  color: "#fff",
                  fontSize: 68,
                  fontWeight: 900,
                  lineHeight: 1,
                  textShadow: `0 0 18px ${COLORS.sky}`,
                }}
              >
                {m.value}
              </span>
            </div>
          </HoloFrame>
        );
      })}
      <svg
        width={CHART_W}
        height={CHART_H}
        style={{
          position: "absolute",
          left: SAFE.side,
          top: rowTop + CARD_H + 40,
        }}
      >
        <path
          d={wavePath(t * 2.2)}
          fill="none"
          stroke={COLORS.sky}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={pathLen}
          strokeDashoffset={pathLen * (1 - draw)}
          style={{ filter: `drop-shadow(0 0 10px ${COLORS.sky})` }}
        />
        <path
          d={wavePath(t * 2.2 + 1.3)}
          fill="none"
          stroke={COLORS.pink}
          strokeWidth={4}
          strokeOpacity={0.7}
          strokeDasharray={pathLen}
          strokeDashoffset={pathLen * (1 - draw)}
          transform="translate(0, 30)"
        />
      </svg>
    </Stage>
  );
};

export const metricDefaults: MetricCardsProps = {
  metrics: [
    { label: "조회수", value: "412K", at: 0.3 },
    { label: "저장", value: "18.2K", at: 0.6 },
    { label: "팔로워", value: "+3.4K", at: 0.9 },
  ],
};
