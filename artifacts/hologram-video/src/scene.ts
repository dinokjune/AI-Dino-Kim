import type { Word } from "./types";

export const LAYER_TYPES = [
  "NeonSign",
  "RoleLabel",
  "ChipsBurst",
  "ParticleLogo",
  "CodeHoloPanel",
  "SiteHoloCards",
  "MetricCards",
  "TextBehind",
] as const;

export type LayerType = (typeof LAYER_TYPES)[number];

/** 영상 위에 얹는 효과 하나. from~to(초) 동안 보이며, props 안의 시각은 from 기준 상대값이다. */
export type Layer = {
  type: LayerType;
  from: number;
  to: number;
  props: Record<string, unknown>;
};

/** 스토리보드 한 칸. 없으면 자막 문장 단위로 자동으로 나눈다 */
export type Segment = { start: number; end: number; note?: string };

/** 릴 한 편의 타임라인. 모든 스크립트(스토리보드·렌더·검수)가 이 하나를 기준으로 동작한다. */
export type Scene = {
  /** public/ 기준 원본(무음 컷 이후) 영상 */
  videoSrc?: string;
  /** 초. 없으면 단어·레이어 중 가장 늦은 끝 + 0.5초 */
  duration?: number;
  words?: Word[];
  captions?: boolean;
  layers: Layer[];
  segments?: Segment[];
  /** 검수용: 원본 영상과 배경을 빼고 얹은 그래픽만 투명 배경으로 그린다 */
  overlayOnly?: boolean;
};

export const sceneDuration = (scene: Scene): number => {
  if (scene.duration) return scene.duration;
  const wordEnd = (scene.words ?? []).reduce((m, w) => Math.max(m, w.end), 0);
  const layerEnd = scene.layers.reduce((m, l) => Math.max(m, l.to), 0);
  return Math.max(wordEnd, layerEnd, 1) + 0.5;
};
