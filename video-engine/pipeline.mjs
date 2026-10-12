// 예약 실행용 자동 제작 CLI
//
//   node pipeline.mjs --topic "회의록 5분 만에 정리하기" --tone stage
//   node pipeline.mjs --topics topics.txt --count 1 --tone minimal --length shorts --upload
//
// --topics 파일은 한 줄에 주제 하나. 처리한 줄은 파일에서 빼서 topics.done.txt 로 옮긴다
// (그래서 매일 같은 명령을 예약해 두면 다음 주제부터 차례로 만든다).
// 결과: out/<시각>-<주제>/ 에 video.mp4, contact-sheet.png, script.json, qa.json, youtube.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2), next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true; else { a[key] = next; i++; }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (!args.topic && !args.topics) {
  console.log(`사용법:
  node pipeline.mjs --topic "주제" [--tone stage] [--length standard|shorts|long] [--voice <Cartesia 목소리 ID>]
                    [--source 참고자료.txt] [--channel "채널 이름"] [--url "채널 주소"] [--no-voice] [--upload]
                    [--llm claude-api|claude-cli|codex|gemini]   (대본 엔진: API 또는 내 구독 CLI)
                    [--tts cartesia|elevenlabs|openai|google|clova] [--voice <목소리 ID>] [--speed 1.0]
                    [--font-head "글꼴"] [--font-caption "글꼴"] [--font-body "글꼴"] [--font-number "글꼴"]
                    (글꼴: Google Fonts 이름, 설치된 글꼴 이름, 다운로드·fonts 폴더의 파일 이름)
  node pipeline.mjs --topics topics.txt [--count 1] ...   (파일에서 앞에서부터 count개를 처리)
톤: stage neon flat minimal cinema chalk blueprint pastel news docu terminal`);
  process.exit(1);
}

let topics = [];
let topicFile = null;
if (args.topic) topics = [String(args.topic)];
else {
  topicFile = path.resolve(String(args.topics));
  const lines = fs.readFileSync(topicFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  topics = lines.slice(0, Number(args.count || 1));
  if (!topics.length) { console.log('남은 주제가 없습니다.'); process.exit(0); }
}

// 실수 노트: lessons.txt 한 줄에 규칙 하나 (스튜디오의 실수 노트와 같은 역할)
const lessonsFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'lessons.txt');
const lessons = fs.existsSync(lessonsFile) ? fs.readFileSync(lessonsFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [];

const { server, jobs, runQueue } = await startServer({ port: 0 });
for (const topic of topics) {
  jobs.push({
    id: 'cli' + Date.now().toString(36) + jobs.length, kind: 'auto', title: topic, status: 'queued', createdAt: Date.now(), upload: !!args.upload,
    settings: { llmEngine: args.llm ? String(args.llm) : '' },
    payload: {
      topic, tone: args.tone || 'stage', length: args.length || 'standard', voiceId: args.voice || process.env.CARTESIA_VOICE_ID || '',
      source: args.source ? fs.readFileSync(String(args.source), 'utf8') : '', channel: args.channel || '', url: args.url || '',
      lessons, withVoice: !args['no-voice'],
      fonts: ['font-head', 'font-caption', 'font-body', 'font-number'].some((k) => args[k])
        ? { head: args['font-head'] || '', caption: args['font-caption'] || '', body: args['font-body'] || '', number: args['font-number'] || '' } : null,
      tts: args.tts ? { provider: String(args.tts), voiceId: args.voice ? String(args.voice) : '', speed: Number(args.speed) || 1 } : null,
    },
  });
}

// 진행률은 터미널에서만 표시 (예약 실행 로그에는 결과만 남긴다)
const timer = process.stdout.isTTY ? setInterval(() => {
  const j = jobs.find((x) => x.status === 'running');
  if (j) process.stdout.write(`\r[${j.title}] ${j.step || ''} ${j.progress ?? ''}%      `);
}, 1000) : null;
await runQueue();
if (timer) clearInterval(timer);
server.close();

let ok = 0;
for (const j of jobs) {
  console.log(`\n■ ${j.title}`);
  if (j.status === 'done') {
    ok++;
    console.log(`  영상: ${path.join('.', j.files.mp4)}  (${(j.duration || 0).toFixed(1)}초)`);
    console.log(`  검수: ${j.qaSummary || '-'}`);
    (j.qa || []).filter((r) => r.level !== 'pass').forEach((r) => console.log(`    ${r.level === 'fail' ? '✗' : '!'} ${r.title}`));
    if (j.cost) {
      // 1,000자당 달러: CARTESIA_USD_PER_1K 등 <공급자>_USD_PER_1K 환경 변수, 없으면 공개 요금 기준 기본값
      const DEF = { cartesia: 0.05, elevenlabs: 0.22, openai: 0.015, google: 0.016, clova: 0 };
      const c = j.cost, krw = Number(process.env.KRW_RATE || 1400);
      const by = c.tts.by && Object.keys(c.tts.by).length ? c.tts.by : { cartesia: c.tts.chars };
      const ttsUsd = Object.entries(by).reduce((a, [k, n]) => a + (n / 1000) * Number(process.env[`${k.toUpperCase()}_USD_PER_1K`] ?? DEF[k] ?? 0), 0);
      const usd = c.claude.usd + ttsUsd;
      console.log(`  비용: 대본 ${c.claude.subscription ? `내 구독(${c.claude.engine}) 추가 요금 없음` : `$${c.claude.usd.toFixed(4)}`} (입력 ${c.claude.input} · 출력 ${c.claude.output} 토큰) + 음성 ${Object.entries(by).map(([k, n]) => `${k} ${n}자`).join(', ')}($${ttsUsd.toFixed(4)}) = $${usd.toFixed(4)} ≈ ₩${Math.round(usd * krw).toLocaleString('ko-KR')}`);
    }
    if (j.youtube) console.log(`  유튜브(비공개): ${j.youtube.url}`);
    (j.log || []).filter((l) => !l.startsWith('비용:')).forEach((l) => console.log(`  · ${l}`));
  } else console.log(`  실패: ${j.error}`);
}

// 처리한 주제는 done 파일로 옮긴다 (실패한 주제는 남겨서 다음에 다시 시도)
if (topicFile) {
  const doneTopics = jobs.filter((j) => j.status === 'done').map((j) => j.title);
  const rest = fs.readFileSync(topicFile, 'utf8').split(/\r?\n/).filter((l) => !doneTopics.includes(l.trim()));
  fs.writeFileSync(topicFile, rest.join('\n'));
  if (doneTopics.length) fs.appendFileSync(topicFile.replace(/(\.txt)?$/, '.done.txt'), doneTopics.map((t) => `${new Date().toISOString().slice(0, 10)}\t${t}`).join('\n') + '\n');
}
process.exit(ok === jobs.length ? 0 : 1);
