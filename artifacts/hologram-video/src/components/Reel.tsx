import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import type { LayerType, Scene } from "../scene";
import { ChipsBurst } from "./ChipsBurst";
import { CodeHoloPanel } from "./CodeHoloPanel";
import { MetricCards } from "./MetricCards";
import { NeonSign } from "./NeonSign";
import { ParticleLogo } from "./ParticleLogo";
import { RoleLabel } from "./RoleLabel";
import { SiteHoloCards } from "./SiteHoloCards";
import { Stage } from "./Stage";
import { TextBehind } from "./TextBehind";
import { WordCaptions } from "./WordCaptions";

// 레이어 props 는 scene JSON 에서 오므로 컴포넌트별 타입 검사는 런타임에 맡긴다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAYERS: Record<LayerType, React.ComponentType<any>> = {
  NeonSign,
  RoleLabel,
  ChipsBurst,
  ParticleLogo,
  CodeHoloPanel,
  SiteHoloCards,
  MetricCards,
  TextBehind,
};

/** scene 하나로 원본 영상 + 효과 레이어 + 자막을 합성한다. */
export const Reel: React.FC<Scene> = ({
  videoSrc,
  words = [],
  captions = true,
  layers,
  overlayOnly,
}) => {
  const { fps } = useVideoConfig();

  return (
    <Stage
      videoSrc={overlayOnly ? undefined : videoSrc}
      transparent={overlayOnly}
    >
      {layers.map((layer, i) => {
        const Component = LAYERS[layer.type];
        if (!Component) throw new Error(`알 수 없는 레이어: ${layer.type}`);
        const from = Math.round(layer.from * fps);
        const duration = Math.max(1, Math.round((layer.to - layer.from) * fps));
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={duration}
            layout="none"
          >
            <Component {...layer.props} transparent />
          </Sequence>
        );
      })}
      {captions && words.length > 0 ? (
        <WordCaptions words={words} transparent />
      ) : null}
    </Stage>
  );
};
