import React from "react";
import {
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, VIDEO } from "../theme";
import { HoloFrame } from "./HoloFrame";
import { Stage } from "./Stage";

export type Site = {
  name: string;
  /** public/ 기준 스크롤 녹화 영상(scripts/capture-sites.mjs 결과). 없으면 자리표시 화면 */
  src?: string;
};

export type SiteHoloCardsProps = {
  sites: Site[];
  /** 각 사이트로 넘어가는 시각(초). 첫 값이 등장 시각. 손짓 타이밍에 맞춘다 */
  switchAt: number[];
  title?: string;
  videoSrc?: string;
  transparent?: boolean;
};

const CARD_W = 860;
const CARD_H = 560;
const SWIPE = 0.35;

const Placeholder: React.FC<{ name: string; index: number }> = ({
  name,
  index,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      padding: 36,
      background: `linear-gradient(160deg, ${index % 2 ? "#1d2b5a" : "#14324a"}, #070b18)`,
    }}
  >
    <div
      style={{
        height: 46,
        width: "55%",
        borderRadius: 10,
        background: `${COLORS.sky}55`,
      }}
    />
    <div
      style={{ height: 180, borderRadius: 14, background: `${COLORS.pink}33` }}
    />
    <div style={{ display: "flex", gap: 18 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 120,
            borderRadius: 12,
            background: "#ffffff18",
          }}
        />
      ))}
    </div>
    <div style={{ color: "#ffffffaa", fontSize: 34, fontWeight: 800 }}>
      {name}
    </div>
  </div>
);

export const SiteHoloCards: React.FC<SiteHoloCardsProps> = ({
  sites,
  switchAt,
  title,
  videoSrc,
  transparent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const appear = interpolate(t, [switchAt[0], switchAt[0] + 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const left = (VIDEO.width - CARD_W) / 2;
  const top = 1000;

  return (
    <Stage videoSrc={videoSrc} transparent={transparent}>
      {sites.map((site, i) => {
        // 전환 시각이 없는 사이트는 띄우지 않는다
        if (switchAt[i] === undefined) return null;
        const start = switchAt[i] ?? Infinity;
        const next = switchAt[i + 1] ?? Infinity;
        // 들어올 때 오른쪽에서, 나갈 때 왼쪽으로 휙
        const enter =
          i === 0
            ? 1
            : interpolate(t, [start, start + SWIPE], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });
        // 마지막 카드는 다음 전환이 없으므로 나가지 않는다
        const exit = Number.isFinite(next)
          ? interpolate(t, [next, next + SWIPE], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.in(Easing.cubic),
            })
          : 0;
        if (t < start - 0.01 || exit >= 1) return null;
        const x = (1 - enter) * 1000 - exit * 1100;
        const label = title ?? site.name;
        return (
          <HoloFrame
            key={site.name}
            title={label}
            width={CARD_W}
            height={CARD_H}
            style={{
              left,
              top,
              opacity: appear * (1 - exit * 0.6),
              transform: `translateX(${x}px) perspective(1600px) rotateY(-10deg) rotateX(4deg)`,
            }}
          >
            {site.src ? (
              <Sequence from={Math.round(start * fps)} layout="none">
                <OffthreadVideo
                  src={staticFile(site.src)}
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                  }}
                />
              </Sequence>
            ) : (
              <Placeholder name={site.name} index={i} />
            )}
          </HoloFrame>
        );
      })}
    </Stage>
  );
};

export const siteHoloDefaults: SiteHoloCardsProps = {
  sites: [
    { name: "ailab.dinokim.com" },
    { name: "portfolio" },
    { name: "shop" },
  ],
  switchAt: [0.3, 1.8, 3.3],
};
