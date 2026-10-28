import React from "react";
import { Composition } from "remotion";
import {
  WordCaptions,
  type WordCaptionsProps,
} from "./components/WordCaptions";
import sampleWords from "./data/sample.words.json";
import { ChipsBurst } from "./components/ChipsBurst";
import { CodeHoloPanel, codeHoloDefaults } from "./components/CodeHoloPanel";
import { MetricCards, metricDefaults } from "./components/MetricCards";
import { NeonSign, neonDefaults } from "./components/NeonSign";
import { ParticleLogo } from "./components/ParticleLogo";
import { RoleLabel } from "./components/RoleLabel";
import { SiteHoloCards, siteHoloDefaults } from "./components/SiteHoloCards";
import { COLORS, VIDEO } from "./theme";
import type { Word } from "./types";

const TAIL_SECONDS = 0.5;

// 효과마다 컴포지션을 따로 등록해서 Studio에서 하나씩 확인한다.
export const RemotionRoot: React.FC = () => {
  const common = {
    width: VIDEO.width,
    height: VIDEO.height,
    fps: VIDEO.fps,
  } as const;

  return (
    <>
      <Composition
        id="WordCaptions"
        component={WordCaptions}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={VIDEO.fps * 6}
        defaultProps={
          { words: sampleWords as Word[] } satisfies WordCaptionsProps
        }
        calculateMetadata={({ props }) => {
          const lastEnd = props.words.reduce(
            (max, w) => Math.max(max, w.end),
            0,
          );
          return {
            durationInFrames: Math.max(
              1,
              Math.ceil((lastEnd + TAIL_SECONDS) * VIDEO.fps),
            ),
          };
        }}
      />
      <Composition
        id="NeonSign"
        component={NeonSign}
        durationInFrames={VIDEO.fps * 4}
        defaultProps={neonDefaults}
        {...common}
      />
      <Composition
        id="RoleLabel"
        component={RoleLabel}
        durationInFrames={VIDEO.fps * 4}
        defaultProps={{ text: "Builder" }}
        {...common}
      />
      <Composition
        id="ChipsBurst"
        component={ChipsBurst}
        durationInFrames={VIDEO.fps * 5}
        defaultProps={{
          chips: [
            { text: "#브랜딩", color: COLORS.sky, at: 0.5 },
            { text: "VIRAL", color: COLORS.pink, at: 0.9 },
            { text: "#자동화", color: "#ffd84d", at: 1.3 },
            { text: "AI", color: "#7cff9b", at: 1.7 },
          ],
        }}
        {...common}
      />
      <Composition
        id="ParticleLogo"
        component={ParticleLogo}
        durationInFrames={VIDEO.fps * 5}
        defaultProps={{ text: "MOONGI STUDIO" }}
        {...common}
      />
      <Composition
        id="CodeHoloPanel"
        component={CodeHoloPanel}
        durationInFrames={VIDEO.fps * 6}
        defaultProps={codeHoloDefaults}
        {...common}
      />
      <Composition
        id="SiteHoloCards"
        component={SiteHoloCards}
        durationInFrames={VIDEO.fps * 5}
        defaultProps={siteHoloDefaults}
        {...common}
      />
      <Composition
        id="MetricCards"
        component={MetricCards}
        durationInFrames={VIDEO.fps * 4}
        defaultProps={metricDefaults}
        {...common}
      />
    </>
  );
};
