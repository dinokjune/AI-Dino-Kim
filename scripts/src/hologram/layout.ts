// 페퍼스 고스트 피라미드용 4면 레이아웃을 ffmpeg filtergraph로 만든다.
//
// 화면 좌표 기준(아래쪽이 +y)으로 "아래 패널"을 먼저 만들고, 정사각형 캔버스를
// 90°씩 돌려서 왼쪽·위·오른쪽 패널을 얻는다. 네 패널은 서로 회전 대칭이므로
// 어느 방향에서 봐도 같은 모습으로 비친다.

export type HeadDirection = "outward" | "inward";

export interface HologramOptions {
  /** 출력 정사각형 한 변(px). 짝수여야 한다. */
  size: number;
  /** 가운데 빈 정사각형 한 변(px). 피라미드 아래쪽 작은 구멍 크기에 맞춘다. */
  gap: number;
  /** 패널 안에서 영상이 차지하는 비율(0~1]. */
  scale: number;
  /** 머리(영상 위쪽)가 가장자리를 향하면 outward, 가운데를 향하면 inward. */
  heads: HeadDirection;
  /** 거울 반사로 좌우가 뒤집히는 것을 미리 되돌린다. */
  flip: boolean;
  /** 대각선 삼각형 마스크로 패널끼리 겹치지 않게 자른다. */
  mask: boolean;
  fps: number;
  /** 배경색을 검은색으로 바꾼다(예: "0xFCC0BA"). 검은 배경 영상이면 비워 둔다. */
  keyColor?: string;
  /** keyColor와 얼마나 비슷한 색까지 지울지(0.01~1). */
  keySimilarity: number;
}

export interface PanelGeometry {
  /** 패널 하나의 높이(가장자리~가운데 구멍). */
  panel: number;
  /** 패널 안에 들어가는 영상 박스 한 변. */
  box: number;
  /** 아래 패널에서 영상 박스의 왼쪽 위 좌표. */
  x: number;
  y: number;
}

export function computeGeometry(opts: HologramOptions): PanelGeometry {
  const { size, gap, scale } = opts;
  if (size % 2 !== 0) throw new Error(`size는 짝수여야 합니다: ${size}`);
  if (gap < 0 || gap >= size) throw new Error(`gap은 0 이상 size 미만이어야 합니다: ${gap}`);
  if (!(scale > 0 && scale <= 1)) throw new Error(`scale은 0보다 크고 1 이하여야 합니다: ${scale}`);

  const panel = Math.floor((size - gap) / 2);
  // yuv420p 인코딩을 위해 짝수로 맞춘다.
  const box = Math.max(2, Math.floor((panel * scale) / 2) * 2);
  const x = Math.floor((size - box) / 2);
  // 영상 박스를 가운데 구멍 바로 바깥에 붙인다.
  const y = size - panel + Math.floor((panel - box) / 2);
  return { panel, box, x, y };
}

/** 아래 패널에 적용할 방향 필터. 회전만 하고, flip이면 좌우를 한 번 더 뒤집는다. */
function orientFilters(heads: HeadDirection, flip: boolean): string[] {
  // outward: 아래 패널에서 머리가 화면 아래(가장자리)로 → 180° 회전
  const rotation = heads === "outward" ? ["hflip", "vflip"] : [];
  if (!flip) return rotation;
  // 180° 회전 + 좌우 반전 = 상하 반전
  return heads === "outward" ? ["vflip"] : ["hflip"];
}

export function buildFilterGraph(opts: HologramOptions): string {
  const { size, fps } = opts;
  const g = computeGeometry(opts);

  // 단색 배경을 투명하게 만든 뒤 알파를 곱해 검은색으로 바꾼다.
  const key = opts.keyColor
    ? ["format=rgba", `colorkey=${opts.keyColor}:${opts.keySimilarity}:0.08`, "premultiply=inplace=1"]
    : [];

  const panel = [
    `fps=${fps}`,
    ...key,
    `scale=${g.box}:${g.box}:force_original_aspect_ratio=decrease`,
    `pad=${g.box}:${g.box}:(ow-iw)/2:(oh-ih)/2:black`,
    "setsar=1",
    ...orientFilters(opts.heads, opts.flip),
    `pad=${size}:${size}:${g.x}:${g.y}:black`,
    "format=gbrp",
  ].join(",");

  const chains: string[] = [`[0:v]${panel}[bottom_raw]`];

  if (opts.mask) {
    // 아래쪽 삼각형(두 대각선 아래)만 흰색인 마스크를 한 번 만들어 반복한다.
    chains.push(
      `color=c=black:s=${size}x${size}:r=${fps}:d=1,format=gray,` +
        `geq=lum='if(gte(Y\\,X)*gte(Y\\,W-1-X)\\,255\\,0)',format=gbrp,loop=loop=-1:size=1[mask]`,
      `[bottom_raw][mask]blend=all_mode=multiply:shortest=1[bottom]`,
    );
  } else {
    chains.push(`[bottom_raw]null[bottom]`);
  }

  chains.push(
    `[bottom]split=4[b][t0][l0][r0]`,
    `[t0]hflip,vflip[t]`,
    `[l0]transpose=clock[l]`,
    `[r0]transpose=cclock[r]`,
    `[b][t]blend=all_mode=lighten[bt]`,
    `[bt][l]blend=all_mode=lighten[btl]`,
    `[btl][r]blend=all_mode=lighten,format=yuv420p[out]`,
  );

  return chains.join(";");
}
