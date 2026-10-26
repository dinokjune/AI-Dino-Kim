// Whisper(단어 타임스탬프) 결과. 모든 자막·그래픽 타이밍의 기준 데이터.
export type Word = {
  text: string;
  /** 초 단위 */
  start: number;
  end: number;
};

export type CaptionLine = {
  words: Word[];
  start: number;
  end: number;
};
