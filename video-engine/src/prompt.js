// 주제 + 톤 카드 + 길이 + 실수 노트 → 대본 JSON 생성 프롬프트

// 길이별 구조. targetSec 은 검수에서 실제 길이와 비교하는 목표치.
// 10분 이상은 한 번에 쓰면 응답이 너무 길어 품질이 떨어지므로 목차(챕터)를 먼저 짜고 챕터마다 따로 쓴다.
const STANDARD_FLOW = `1. 훅 – 같은 재료가 여러 결과로 갈리는 장면을 보여 주고, 차이를 만든 "단 하나"를 던진다 (monitors)
2. 문제 제기 – 시청자가 흔히 하는 말이나 행동 (bubble, mood: happy)
3. 문제 심화 – 그렇게 하면 결과가 매번 달라진다 (compare, verdict: none)
4. 근거 수치 – 숫자 하나로 문제 크기를 보여 준다 (number)
5. 비유 – 일상 비유 한 개 (title + icon)
6. 흔한 해법과 그 한계 (typing)
7. 잘 되는 사례들의 공통점 3~5개 (line)
8. 해법 공개 – 이름 붙인 프레임워크, 정확히 3칸 (cards)
9. 실행 단계 – 3~5단계, 단계마다 장면 하나 (step, n/total 일치)
10. 함정 비교 – 나쁜 예 vs 좋은 예 (compare, verdict: right)
11. 반전 – 직관과 반대되는 발견 (bubble, mood: sweat)
12. 최소 규칙 – 꼭 지킬 것 3~5개 (checklist)
13. 점검 1 – 눈으로 전체를 훑는 점검 (grid)
14. 점검 2 – 숫자로 하는 점검 (meters)
15. 복리 – 실수를 다음 회차의 규칙으로 바꾸는 습관 (title + icon: bulb)
16. 정리 – 핵심 3가지 (cards, stamp: true)
17. 마무리 (endcard, dur: 5)
재료에 맞지 않는 6·13·14번은 빼도 된다. 순서는 바꾸지 않는다.`;

const LENGTHS = {
  shorts: {
    label: '1분 미만 (쇼츠 약 50초)', scenes: '7~9', targetSec: 50, maxSec: 59,
    flow: `1. 훅 – 결론이나 반전을 먼저 던진다 (title 또는 monitors)
2. 문제 – 시청자가 흔히 겪는 상황 (bubble)
3. 근거 – 숫자 하나 (number)
4. 해법 – 이름 붙인 3칸 프레임워크 (cards)
5. 실행 – 2~3단계 (step, 단계마다 장면 하나)
6. 정리 – 핵심 3가지 (cards, stamp: true)
7. 마무리 (endcard, dur: 3)
전체가 60초를 넘으면 쇼츠가 아니다. say를 짧게 쓴다.`,
  },
  standard: {
    label: '2~3분', scenes: '18~24', targetSec: 150,
    flow: STANDARD_FLOW + `
2~3분을 채우도록 실행 단계와 함정 비교에 예시 장면(typing 또는 compare)을 한두 개 더 붙여도 된다.`,
  },
  min10: { label: '10분 (챕터 4개)', targetSec: 600, chapters: 4 },
  min15: { label: '15분 (챕터 6개)', targetSec: 900, chapters: 6 },
  min30: { label: '30분 (챕터 12개)', targetSec: 1800, chapters: 12 },
};
// 예전 대본·설정에 남아 있는 길이 이름
const LENGTH_ALIAS = { long: 'standard' };
const lengthOf = (k) => LENGTHS[k] || LENGTHS[LENGTH_ALIAS[k]] || LENGTHS.standard;
const lengthKey = (k) => (LENGTHS[k] ? k : LENGTH_ALIAS[k] || 'standard');

const SCENE_CATALOG = `공통 속성: beat(이 장면의 역할), type, say(내레이션=자막), wall(cream|parchment|olive|purple|green|peach|dark|red),
  dur(초, 보통 생략 – 음성 길이로 자동), transition(생략 권장 – 톤이 정함), mood(happy|think|sweat|wow|point|wave|sad), mascot(false로 숨김), sfx([{at, name}])
- monitors: count(3~8), labels(선택)
- bubble: text(말풍선 문장)
- compare: left/right {label, mode(choppy|smooth|still), seed(0~5), text}, verdict(left|right|none)
- number: value(문자열, 예 "1,938"), suffix, icon, label (숫자는 처음부터 최종값으로 보인다. countUp: true는 꼭 필요할 때만)
- funnel: steps [{value, label}] 2~4개
- title: text, sub, icon
- typing: name, handle, text, likes
- line: title, items [{icon, text}] 3~6개
- cards: title, items [{icon 또는 num, title, text}] 3개 권장, stamp, stampText
- step: n, total, badge(첫째/둘째…), icon, text
- checklist: title, items [문자열] 3~6개
- grid: cols, rows, flags [경고 칸 번호], title
- meters: title, items [{label, value(0~1), target([최소, 최대]), note}] 2~3개
- endcard: channel, url, button
- three: 3D 장면 (Three.js). model(globe|bars|cubes|core|tunnel|mascot), text(선택, 12자 이내), sub
  · globe: 지구·연결·세계 이야기, points(거점 수 2~8) · bars: 숫자 비교, values [{label, value}] 2~6개, suffix
  · cubes: 추상적 도입·전환 · core: AI·기술의 핵심 · tunnel: 오프닝 훅 · mascot: 3D 디노가 인사 (마스코트 있는 톤에서만)
  · 한 영상에 1~3번, 강조가 필요한 곳에만 쓴다. 시네마틱 3D 톤에서는 조금 더 자주 써도 된다
아이콘: check x key clock bulb folder eye ruler palette speaker camera chef star gear doc search warn film robot chart heart mic stamp target book calendar
효과음: pop tick check whoosh ding chime notify stamp snap curtain boing paper scan sweep buzz riser click glitch boom`;

// 세로(9:16)는 가운데 화면이 작아지므로 화면 글자를 더 줄인다
function aspectNote(aspect) {
  return aspect === '9:16'
    ? '\n## 화면 비율: 세로 9:16 (휴대폰)\n가운데에 작은 가로 화면이 들어가고 위에 제목, 아래에 자막이 크게 나온다. 화면 글자(text, title, items)는 8자 이내로 더 짧게, 목록 항목은 3~4개까지만 쓴다.\n'
    : '';
}

function buildScriptPrompt({ topic, card, length = 'standard', source = '', lessons = [], channel = '', url = '', aspect = '16:9' }) {
  const L = lengthOf(length);
  const chars = Math.round(card.targets.cutSec * 6.2 - 2);
  const heroNote = card.engine.hero === 'dino'
    ? '이 톤의 주인공은 마스코트 디노다. 장면마다 어울리는 mood를 골라라.'
    : `이 톤에는 마스코트가 없다(주인공: ${card.rules['주인공']}). mood·mascot 속성은 쓰지 마라.`;
  const lessonText = lessons.length ? `\n## 실수 노트 (이전 영상 검수에서 나온 규칙 – 반드시 지킨다)\n${lessons.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n` : '';
  return `너는 유튜브 설명 영상의 대본 작가 겸 연출가다. 아래 톤 카드와 구조로, 주제에 맞는 영상 대본 JSON 하나를 만들어라.
JSON 외의 설명은 쓰지 마라.

## 주제
${topic}

## 톤 카드
${toneCardText(card)}
${heroNote}

## 길이와 구조 (${L.label}, 장면 ${L.scenes}개)
${L.flow}

${aspectNote(aspect)}
## 장면 연결 설계
장면을 쓰기 전에 각 장면이 왜 다음 장면으로 이어지는지 먼저 정하고, 그 연결이 say의 첫마디에 드러나게 써라
("그런데", "그래서", "여기서 문제가 하나" 처럼). 장면끼리 뚝뚝 끊기는 나열식 대본은 실패다.

## 문장 규칙
- say: 구어체 존댓말, 1~2문장, 장면당 공백 제외 ${chars}자 안팎(톤의 목표 장면 길이 ${card.targets.cutSec}초에 맞춤).
- 강조할 핵심 단어 1~2개는 *별표*로 감싼다 (자막에서 색으로 강조됨).
- 화면 글자(text, title, items)는 12자 이내. say를 그대로 반복하지 않는다.
- 주제와 참고 자료에 없는 숫자·인용·통계를 지어내지 않는다. 근거가 없으면 label에 "(예시)" 또는 "(가정)"을 붙인다.
- 화면에 나오는 숫자는 반드시 say에도 같은 숫자로 나와야 한다.
- 남의 캐릭터·로고를 소재로 쓰지 않는다. 남의 자료를 말할 때는 say에 출처를 밝힌다.
- 다른 영상의 문장을 그대로 옮기지 말고 새로 쓴다.
${lessonText}
## 장면 타입과 속성
${SCENE_CATALOG}

## 출력 형식
{
  "meta": { "title": "...", "channel": "${channel || '채널 이름'}", "url": "${url || ''}", "tone": "${card.id}", "topic": ${JSON.stringify(topic)} },
  "scenes": [ ... ]
}
${source ? `\n## 참고 자료 (사실 확인의 근거. 여기 없는 사실은 지어내지 않는다)\n${source}\n` : ''}`;
}

// ── 10분 이상: 목차 → 챕터별 대본 ──
// 1단계: 전체 제목과 챕터 목차
function buildOutlinePrompt({ topic, card, length, source = '', aspect = '16:9' }) {
  const L = lengthOf(length), n = L.chapters, per = Math.round(L.targetSec / n / 60 * 10) / 10;
  return `너는 유튜브 롱폼 설명 영상의 구성 작가다. 주제로 약 ${Math.round(L.targetSec / 60)}분짜리 영상의 목차를 짜라. JSON 외의 설명은 쓰지 마라.

## 주제
${topic}

## 톤
${card.name} – ${card.summary}

## 규칙
- 챕터는 정확히 ${n}개, 챕터 하나는 약 ${per}분 분량이다.
- 1장은 훅과 문제 제기로 시작하고, 마지막 장은 핵심 정리와 마무리로 끝난다.
- 가운데 장들은 "왜 → 무엇 → 어떻게 → 함정 → 점검"처럼 앞 장의 질문에 답하며 다음 장으로 이어지게 짠다. 같은 내용을 반복하지 않는다.
- 챕터마다 핵심 내용 3~5개를 적는다. 참고 자료에 없는 숫자·통계는 넣지 않는다.
${aspect === '9:16' ? '- 세로(9:16) 영상이다. 화면 글자는 짧게 쓸 수 있는 내용으로 고른다.\n' : ''}
## 출력 형식
{ "title": "영상 제목 (30자 이내)", "chapters": [ { "title": "챕터 제목 (12자 이내)", "goal": "이 장이 답하는 질문 한 문장", "points": ["핵심 1", "핵심 2", "핵심 3"] } ] }
${source ? `\n## 참고 자료\n${source}\n` : ''}`;
}

// 2단계: 챕터 하나의 장면들
function buildChapterPrompt({ topic, card, outline, index, prevSay = '', source = '', lessons = [], channel = '', url = '', aspect = '16:9', length }) {
  const L = lengthOf(length), n = outline.chapters.length, ch = outline.chapters[index];
  const sec = Math.round(L.targetSec / n), scenes = Math.max(10, Math.round(sec / Math.max(4, card.targets.cutSec)));
  const chars = Math.round(card.targets.cutSec * 6.2 - 2);
  const first = index === 0, last = index === n - 1;
  const heroNote = card.engine.hero === 'dino'
    ? '이 톤의 주인공은 마스코트 디노다. 장면마다 어울리는 mood를 골라라.'
    : `이 톤에는 마스코트가 없다(주인공: ${card.rules['주인공']}). mood·mascot 속성은 쓰지 마라.`;
  const lessonText = lessons.length ? `\n## 실수 노트 (반드시 지킨다)\n${lessons.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n` : '';
  const toc = outline.chapters.map((c, i) => `${i + 1}. ${c.title} – ${c.goal}${i === index ? '   ← 지금 쓸 장' : ''}`).join('\n');
  return `너는 유튜브 롱폼 설명 영상의 대본 작가 겸 연출가다. 전체 ${n}개 챕터 중 ${index + 1}장의 장면들만 JSON으로 써라. JSON 외의 설명은 쓰지 마라.

## 영상 제목
${outline.title || topic}

## 전체 목차
${toc}

## 이번 장: ${index + 1}. ${ch.title}
질문: ${ch.goal}
핵심: ${(ch.points || []).join(' / ')}
분량: 약 ${Math.round(sec / 60 * 10) / 10}분, 장면 ${scenes - 2}~${scenes + 2}개
${prevSay ? `앞 장의 마지막 말: "${prevSay}" – 이 말을 자연스럽게 받아서 시작한다.` : ''}

## 장 구성
${first ? '- 첫 장면은 영상 전체의 훅이다(monitors 또는 three: tunnel). 결론이나 반전을 먼저 던지고, 이 영상에서 무엇을 얻는지 말한다.\n' : `- 첫 장면은 챕터 표지다: type "title", text "${ch.title}"(12자 넘으면 줄인다, 장 번호는 넣지 않는다), icon 하나, sub에 질문을 짧게. say는 앞 장에서 넘어오는 연결 문장.\n`}- 가운데는 핵심마다 설명(title·bubble·compare·typing) → 근거(number·line·meters) → 정리(cards·checklist) 흐름으로 쓰고, 같은 장면 타입을 세 번 연속 쓰지 않는다.
${last ? '- 마지막 두 장면은 영상 전체 정리(cards, stamp: true)와 마무리(endcard, dur: 5)다.\n' : '- 마지막 장면은 다음 장의 질문을 던지며 끝낸다. endcard는 쓰지 않는다.\n'}
## 톤 카드
${toneCardText(card)}
${heroNote}
${aspectNote(aspect)}
## 문장 규칙
- say: 구어체 존댓말, 1~2문장, 장면당 공백 제외 ${chars}자 안팎. 장면 첫마디에 앞 장면과의 연결이 드러나게 쓴다.
- 강조할 핵심 단어 1~2개는 *별표*로 감싼다.
- 화면 글자(text, title, items)는 12자 이내. say를 그대로 반복하지 않는다.
- 주제와 참고 자료에 없는 숫자·인용·통계를 지어내지 않는다. 근거가 없으면 label에 "(예시)" 또는 "(가정)"을 붙인다.
- 화면에 나오는 숫자는 반드시 say에도 같은 숫자로 나와야 한다.
- 다른 장에서 이미 한 설명을 되풀이하지 않는다. 3D 장면(three)은 이 장에서 많아야 한 번.
${lessonText}
## 장면 타입과 속성
${SCENE_CATALOG}

## 출력 형식
{ "scenes": [ ... ] }${last ? `   (endcard의 channel은 "${channel || '채널 이름'}", url은 "${url || ''}")` : ''}
${source ? `\n## 참고 자료 (사실 확인의 근거)\n${source}\n` : ''}`;
}

function buildTopicPrompt(card, hint = '') {
  return `유튜브 설명 영상 주제 6개를 추천해라. 톤은 "${card.name}"(${card.summary})이고, 이 톤과 잘 어울려야 한다.
${hint ? `채널 방향: ${hint}\n` : ''}각 주제는 25자 이내 한국어 제목으로, 클릭하고 싶지만 과장이 없게 써라.
JSON 배열만 출력해라. 예: ["주제1", "주제2"]`;
}

// 응답 텍스트에서 JSON 덩어리를 꺼낸다 (```json 코드블록이 있어도 처리)
function extractJSON(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : text;
  const start = Math.min(...['{', '['].map((c) => { const i = body.indexOf(c); return i < 0 ? Infinity : i; }));
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  if (!isFinite(start) || end < start) throw new Error('응답에서 JSON을 찾지 못했습니다');
  return JSON.parse(body.slice(start, end + 1));
}

// 대본 기본 검증: 알 수 없는 장면 타입, 빠진 say 등을 고쳐 쓸 수 있게 알려 준다
function validateScript(obj) {
  const errs = [];
  if (!obj || !Array.isArray(obj.scenes) || !obj.scenes.length) errs.push('scenes 배열이 없습니다');
  (obj.scenes || []).forEach((s, i) => {
    if (!SCENES[s.type]) errs.push(`${i + 1}번 장면: 알 수 없는 type "${s.type}"`);
    if (!s.say) errs.push(`${i + 1}번 장면: say가 비어 있습니다`);
  });
  return errs;
}
