// 대본·주제를 쓰는 엔진: API(종량제) 또는 내가 구독 중인 서비스의 CLI
//   claude-api : Claude API (Anthropic API 키, 토큰만큼 과금)          → server.mjs 가 직접 처리
//   claude-cli : Claude Code CLI  `claude -p`   (Claude 구독으로 로그인)
//   codex      : Codex CLI        `codex exec`  (ChatGPT 구독으로 로그인)
//   gemini     : Gemini CLI       `gemini -p`   (Google 계정·구독으로 로그인)
// 구독 엔진은 추가 요금 없이 내 구독 한도 안에서 쓴다. 긴 프롬프트는 표준 입력으로 넘기고,
// 빈 임시 폴더에서 실행해 CLI가 내 파일을 건드리지 않게 한다.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const IS_WIN = process.platform === 'win32';
const INSTRUCTION = 'Follow the instructions given on standard input exactly and output only the requested result.';

export const ENGINES = {
  'claude-api': { name: 'Claude API (종량제)', subscription: false },
  'claude-cli': { name: 'Claude Code (내 Claude 구독)', subscription: true, bin: () => process.env.CLAUDE_BIN || 'claude' },
  codex: { name: 'Codex (내 ChatGPT 구독)', subscription: true, bin: () => process.env.CODEX_BIN || 'codex' },
  gemini: { name: 'Gemini CLI (내 Google 구독)', subscription: true, bin: () => process.env.GEMINI_BIN || 'gemini' },
};

// 윈도우의 npm 전역 명령은 .cmd 라서 셸을 거쳐야 실행된다. 이때 인자는 직접 따옴표로 감싼다.
function run(bin, args, input, { timeoutMs = 15 * 60 * 1000, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const q = (a) => (IS_WIN && /[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
    const p = spawn(IS_WIN ? q(bin) : bin, IS_WIN ? args.map(q) : args, { cwd, shell: IS_WIN, env: process.env });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error(`${bin} 응답이 ${Math.round(timeoutMs / 60000)}분 안에 오지 않았습니다`)); }, timeoutMs);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
    p.on('error', (e) => { clearTimeout(timer); reject(e.code === 'ENOENT' ? new Error(`${bin} 명령을 찾을 수 없습니다. 설치하고 로그인했는지 확인하세요.`) : e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${bin} 종료 코드 ${code}: ${(err || out).trim().split('\n').slice(-3).join(' ').slice(0, 400)}`));
    });
    p.stdin.on('error', () => {});
    p.stdin.end(input);
  });
}

function workDir() {
  const d = path.join(os.tmpdir(), 'video-studio-llm');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// 반환: { text, model, usage: {input, output} | null }
export async function runCli(engine, prompt, { system, model } = {}) {
  const E = ENGINES[engine];
  if (!E || !E.bin) throw new Error(`알 수 없는 대본 엔진: ${engine}`);
  const full = (system ? `${system}\n\n` : '') + prompt;
  const cwd = workDir();
  if (engine === 'claude-cli') {
    const args = ['-p', INSTRUCTION, '--output-format', 'json'];
    if (model || process.env.CLAUDE_CLI_MODEL) args.push('--model', model || process.env.CLAUDE_CLI_MODEL);
    const { out } = await run(E.bin(), args, full, { cwd });
    const j = JSON.parse(out.trim().split('\n').filter(Boolean).pop());
    if (j.is_error) throw new Error(`Claude Code: ${j.result || j.subtype}`);
    const u = j.usage || {};
    return { text: j.result || '', model: 'claude-cli', usage: { input: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0), output: u.output_tokens || 0 } };
  }
  if (engine === 'codex') {
    const outFile = path.join(cwd, `last-${process.pid}-${Date.now()}.txt`);
    const args = ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-o', outFile];
    if (model || process.env.CODEX_MODEL) args.push('-m', model || process.env.CODEX_MODEL);
    args.push(INSTRUCTION);
    const { out } = await run(E.bin(), args, full, { cwd });
    let text = '';
    try { text = fs.readFileSync(outFile, 'utf8'); fs.unlinkSync(outFile); } catch { text = out; }
    return { text, model: 'codex', usage: null };
  }
  if (engine === 'gemini') {
    const args = ['-p', INSTRUCTION, '--output-format', 'json'];
    if (model || process.env.GEMINI_MODEL) args.push('-m', model || process.env.GEMINI_MODEL);
    const { out } = await run(E.bin(), args, full, { cwd });
    const s = out.slice(out.indexOf('{'));
    const j = JSON.parse(s);
    if (j.error) throw new Error(`Gemini CLI: ${j.error.message || JSON.stringify(j.error)}`);
    // stats 모양이 버전마다 달라서 있는 값만 모은다
    let input = 0, output = 0;
    const models = (j.stats && j.stats.models) || {};
    Object.values(models).forEach((m) => { const t = m.tokens || m; input += t.prompt || t.input || t.inputTokens || 0; output += t.candidates || t.output || t.outputTokens || 0; });
    if (!input && j.stats) { input = j.stats.inputTokens || 0; output = j.stats.outputTokens || 0; }
    return { text: j.response || '', model: 'gemini-cli', usage: input || output ? { input, output } : null };
  }
  throw new Error(`알 수 없는 대본 엔진: ${engine}`);
}

// 설치 여부 (서버 시작 때 한 번 확인)
// 기본 엔진: LLM_ENGINE 이 있으면 그것, 없으면 설치된 구독 CLI를 이 순서로 고르고, 하나도 없을 때만 종량제 API
export const CLI_ORDER = ['claude-cli', 'codex', 'gemini'];
export function pickDefaultEngine(status) {
  if (ENGINES[process.env.LLM_ENGINE]) return process.env.LLM_ENGINE;
  return CLI_ORDER.find((k) => status[k] && status[k].installed) || 'claude-api';
}

export function detectEngines() {
  const out = {};
  for (const [k, E] of Object.entries(ENGINES)) {
    if (!E.bin) { out[k] = { name: E.name, installed: true, subscription: false }; continue; }
    let installed = false, version = '';
    try {
      const r = spawnSync(E.bin(), ['--version'], { encoding: 'utf8', shell: IS_WIN, timeout: 15000 });
      installed = r.status === 0;
      version = (r.stdout || '').trim().split('\n')[0].slice(0, 60);
    } catch { installed = false; }
    out[k] = { name: E.name, installed, version, subscription: true };
  }
  return out;
}
