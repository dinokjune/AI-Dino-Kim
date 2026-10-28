import React, { useEffect, useState } from "react";
import {
  Easing,
  continueRender,
  delayRender,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontsReady } from "../fonts";
import { COLORS, FONT_FAMILY, VIDEO } from "../theme";
import { Stage } from "./Stage";

export type ParticleLogoProps = {
  text: string;
  /** 모이기 시작/끝(초) */
  from?: number;
  to?: number;
  fontSize?: number;
  videoSrc?: string;
  transparent?: boolean;
};

type Pt = { x: number; y: number };

/** 글자 모양을 캔버스에 그려서 채워진 픽셀 좌표를 격자로 뽑는다. */
const MAX_TEXT_WIDTH = VIDEO.width - 160;

/** 글자가 화면 폭을 넘지 않도록 줄인 폰트 크기. 입자 목표와 완성 글자가 같은 값을 쓴다. */
const fitFontSize = (text: string, fontSize: number): number => {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return fontSize;
  ctx.font = `900 ${fontSize}px ${FONT_FAMILY}`;
  const width = ctx.measureText(text).width;
  return width > MAX_TEXT_WIDTH
    ? Math.floor((fontSize * MAX_TEXT_WIDTH) / width)
    : fontSize;
};

const sampleText = (text: string, fontSize: number, step: number): Pt[] => {
  const w = VIDEO.width;
  const h = 400;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts: Pt[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 128) pts.push({ x, y: y - h / 2 });
    }
  }
  return pts;
};

export const ParticleLogo: React.FC<ParticleLogoProps> = ({
  text,
  from = 0.5,
  to = 3,
  fontSize = 150,
  videoSrc,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // 캔버스로 글자 모양을 뽑기 전에 폰트가 로드돼 있어야 입자 목표와 완성 글자가 일치한다.
  const [layout, setLayout] = useState<{ size: number; targets: Pt[] } | null>(
    null,
  );
  const [handle] = useState(() => delayRender("입자 로고 목표점 계산"));
  useEffect(() => {
    let cancelled = false;
    fontsReady.then(() => {
      if (cancelled) return;
      const size = fitFontSize(text, fontSize);
      setLayout({ size, targets: sampleText(text, size, 8) });
      continueRender(handle);
    });
    return () => {
      cancelled = true;
    };
  }, [text, fontSize, handle]);
  const size = layout?.size ?? fontSize;
  const targets = layout?.targets ?? [];
  const p = interpolate(t, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  // 다 모인 뒤 선명한 글자가 켜진다
  const solid = interpolate(t, [to - 0.1, to + 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;

  return (
    <Stage videoSrc={videoSrc} transparent={transparent}>
      <svg
        width={VIDEO.width}
        height={VIDEO.height}
        style={{ position: "absolute", inset: 0 }}
      >
        {targets.map((pt, i) => {
          const a0 = random(`a-${i}`) * Math.PI * 2;
          const r0 = 600 + random(`r-${i}`) * 700;
          // 소용돌이: 진행될수록 각도 오프셋이 줄며 목표점으로 수렴
          const ang = a0 + (1 - p) * Math.PI * 3;
          const r = r0 * (1 - p);
          const x = cx + (pt.x - VIDEO.width / 2) * p + Math.cos(ang) * r;
          const y = cy + pt.y * p + Math.sin(ang) * r;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3 + random(`s-${i}`) * 3}
              fill={i % 4 === 0 ? COLORS.pink : COLORS.sky}
              opacity={(0.4 + 0.6 * p) * (1 - solid * 0.6)}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          fontSize: size,
          whiteSpace: "nowrap",
          color: "#fff",
          opacity: solid,
          textShadow: `0 0 24px ${COLORS.sky}, 0 0 60px ${COLORS.sky}88`,
        }}
      >
        {text}
      </div>
    </Stage>
  );
};
