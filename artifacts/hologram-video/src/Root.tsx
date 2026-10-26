import React from "react";
import { Composition } from "remotion";
import { WordCaptions, type WordCaptionsProps } from "./components/WordCaptions";
import sampleWords from "./data/sample.words.json";
import { VIDEO } from "./theme";
import type { Word } from "./types";

const TAIL_SECONDS = 0.5;

// 효과마다 컴포지션을 따로 등록해서 Studio에서 하나씩 확인한다.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WordCaptions"
      component={WordCaptions}
      width={VIDEO.width}
      height={VIDEO.height}
      fps={VIDEO.fps}
      durationInFrames={VIDEO.fps * 6}
      defaultProps={{ words: sampleWords as Word[] } satisfies WordCaptionsProps}
      calculateMetadata={({ props }) => {
        const lastEnd = props.words.reduce((max, w) => Math.max(max, w.end), 0);
        return {
          durationInFrames: Math.max(1, Math.ceil((lastEnd + TAIL_SECONDS) * VIDEO.fps)),
        };
      }}
    />
  );
};
