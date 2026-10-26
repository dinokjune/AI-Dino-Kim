import type { CaptionLine, Word } from "./types";

type GroupOptions = {
  maxWords: number;
  maxChars: number;
  /** 이 시간(초) 이상 말이 끊기면 줄을 나눈다 */
  gapBreak: number;
};

const SENTENCE_END = /[.!?。…]$/;

/** 단어 목록을 화면에 한 번에 띄울 자막 줄로 묶는다. */
export const groupIntoLines = (
  words: Word[],
  opts: GroupOptions = { maxWords: 4, maxChars: 16, gapBreak: 0.6 },
): CaptionLine[] => {
  const lines: CaptionLine[] = [];
  let current: Word[] = [];

  const flush = () => {
    if (current.length === 0) return;
    lines.push({
      words: current,
      start: current[0].start,
      end: current[current.length - 1].end,
    });
    current = [];
  };

  for (const word of words) {
    const prev = current[current.length - 1];
    const chars = current.reduce((n, w) => n + w.text.length, 0) + word.text.length;
    if (
      prev &&
      (current.length >= opts.maxWords ||
        chars > opts.maxChars ||
        word.start - prev.end >= opts.gapBreak)
    ) {
      flush();
    }
    current.push(word);
    if (SENTENCE_END.test(word.text)) flush();
  }
  flush();
  return lines;
};
