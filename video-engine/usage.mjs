// 사용량·비용 기록: Claude 토큰과 Cartesia 글자(크레딧)를 호출마다 out/ledger.jsonl 에 남긴다.
// Claude 요금은 응답에 들어 있는 실제 토큰 수로 계산하고, Cartesia는 크레딧(≈글자 수)만 기록한다.
// (Cartesia 크레딧 단가는 요금제마다 달라서 스튜디오 설정값으로 금액을 계산한다)
import fs from 'node:fs';
import path from 'node:path';

// 1백만 토큰당 달러 (입력, 출력, 캐시 읽기, 캐시 쓰기). 2026-10 기준 공개 단가.
export const CLAUDE_PRICES = {
  'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-opus-5': { in: 5, out: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-8': { in: 5, out: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-5': { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { in: 0.1, out: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-fable-5-1': { in: 10, out: 50, cacheRead: 1, cacheWrite: 12.5 },
};

export function claudeCost(model, usage = {}) {
  const key = Object.keys(CLAUDE_PRICES).find((k) => String(model || '').startsWith(k));
  const p = CLAUDE_PRICES[key] || CLAUDE_PRICES['claude-opus-5-5'];
  const u = {
    input: usage.input_tokens || 0, output: usage.output_tokens || 0,
    cacheRead: usage.cache_read_input_tokens || 0, cacheWrite: usage.cache_creation_input_tokens || 0,
  };
  const usd = (u.input * p.in + u.output * p.out + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1e6;
  return { model: model || key, tokens: u, usd: Math.round(usd * 1e6) / 1e6, priced: !!key };
}

export function createLedger(outDir) {
  const file = path.join(outDir, 'ledger.jsonl');
  return {
    add(entry) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
    },
    // 이번 달·전체 합계와 최근 기록
    summary() {
      const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
      const month = new Date().toISOString().slice(0, 7);
      const blank = () => ({ claudeUsd: 0, claudeIn: 0, claudeOut: 0, claudeCalls: 0, ttsChars: 0, ttsCalls: 0 });
      const sum = { month: blank(), all: blank() };
      const recent = [];
      for (const l of lines) {
        let e; try { e = JSON.parse(l); } catch { continue; }
        for (const k of e.ts.startsWith(month) ? ['month', 'all'] : ['all']) {
          const s = sum[k];
          if (e.kind === 'claude') { s.claudeUsd += e.usd || 0; s.claudeIn += e.tokens?.input || 0; s.claudeOut += e.tokens?.output || 0; s.claudeCalls++; }
          if (e.kind === 'tts') { s.ttsChars += e.chars || 0; s.ttsCalls++; }
        }
        recent.push(e);
      }
      return { monthKey: month, ...sum, recent: recent.slice(-30).reverse() };
    },
  };
}

// 작업 목록을 파일에 저장해서 서버를 다시 켜도 결과 목록이 남게 한다
export function loadJobs(outDir) {
  try { return JSON.parse(fs.readFileSync(path.join(outDir, 'jobs.json'), 'utf8')); } catch { return []; }
}
export function saveJobs(outDir, jobs) {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const keep = jobs.filter((j) => j.status === 'done' || j.status === 'error').slice(-100)
      .map(({ settings, payload, ...rest }) => rest);
    fs.writeFileSync(path.join(outDir, 'jobs.json'), JSON.stringify(keep, null, 2));
  } catch { /* 기록 실패는 작업에 영향을 주지 않는다 */ }
}
