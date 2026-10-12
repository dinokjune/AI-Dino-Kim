// 크레딧·비용 계산과 표시
// - Claude: 서버가 돌려준 실제 토큰 수와 단가로 계산한 금액(usd)을 그대로 더한다
// - Cartesia: 글자당 약 1크레딧(공식 문서). 금액은 요금제별 크레딧 단가(설정)로 계산한다
// - 렌더·검수는 내 컴퓨터에서 돌아가 추가 비용이 없다

// 요금제별 크레딧 단가 (달러/크레딧). 출처마다 숫자가 달라 설정에서 바꿀 수 있게 둔다.
const CARTESIA_PLANS = {
  free: { label: '무료 (월 2만 크레딧)', usdPerCredit: 0 },
  pro: { label: 'Pro ($5 / 10만 크레딧)', usdPerCredit: 5 / 100000 },
  startup: { label: 'Startup ($49 / 125만 크레딧)', usdPerCredit: 49 / 1250000 },
  scale: { label: 'Scale ($299 / 800만 크레딧)', usdPerCredit: 299 / 8000000 },
  custom: { label: '직접 입력', usdPerCredit: null },
};

function costSettings() {
  const s = (typeof settings === 'function' ? settings() : {}) || {};
  const plan = CARTESIA_PLANS[s.cartesiaPlan || 'pro'] || CARTESIA_PLANS.pro;
  const custom = parseFloat(s.cartesiaPer1k);
  return {
    usdPerCredit: plan.usdPerCredit ?? (isFinite(custom) ? custom / 1000 : 0),
    creditMult: parseFloat(s.creditMult) || 1,      // 클론 목소리 등 배수가 붙는 요금제용
    krw: parseFloat(s.krwRate) || 1400,              // 원/달러 환율 (설정값)
  };
}

function emptyCost() { return { claude: { input: 0, output: 0, usd: 0, calls: 0 }, tts: { chars: 0, calls: 0, by: {} } }; }

// TTS 공급자별 1,000자당 달러. 설정값이 없으면 공개 요금 기준 기본값(추정)을 쓴다.
//  ElevenLabs: 요금제마다 다름(Creator 기준 약 $0.22) · OpenAI tts-1: $15/100만 자 · Google: Neural2·WaveNet $16, Chirp 3 HD $30, Standard $4 /100만 자
//  클로바: 네이버 클라우드 요금표를 확인해 설정에 넣는다(기본 0)
function ttsRatePer1k(provider, voice = '', model = '') {
  const s = (typeof settings === 'function' ? settings() : {}) || {};
  const user = parseFloat((s.ttsRates || {})[provider]);
  if (isFinite(user)) return user;
  if (provider === 'cartesia') return costSettings().usdPerCredit * 1000;
  if (provider === 'elevenlabs') return 0.22;
  if (provider === 'openai') return /hd/.test(model) ? 0.03 : 0.015;
  if (provider === 'google') return /Chirp3|Chirp-HD|Studio/i.test(voice) ? 0.03 : /Standard/i.test(voice) ? 0.004 : 0.016;
  return 0;
}

// 지금 영상의 비용 (대본 meta 에 같이 저장되어 JSON 으로 남는다)
function videoCost() {
  if (!SCRIPT.meta.cost) SCRIPT.meta.cost = emptyCost();
  return SCRIPT.meta.cost;
}

// 서버 응답의 cost 를 현재 영상 비용에 더한다
function addCost(c, target) {
  if (!c) return;
  const v = target || videoCost();
  if (c.tokens) {
    v.claude.input += (c.tokens.input || 0) + (c.tokens.cacheRead || 0) + (c.tokens.cacheWrite || 0);
    v.claude.output += c.tokens.output || 0;
    v.claude.usd += c.usd || 0;
    v.claude.calls++;
    if (c.engine) v.claude.engine = c.engine;
    if (c.subscription) v.claude.subscription = true;
  }
  if (c.chars) {
    v.tts.chars += c.chars; v.tts.calls++;
    v.tts.by = v.tts.by || {};
    const k = c.provider || 'cartesia';
    v.tts.by[k] = (v.tts.by[k] || 0) + c.chars;
  }
}

function priceOf(cost) {
  const cs = costSettings();
  const by = cost.tts.by && Object.keys(cost.tts.by).length ? cost.tts.by : { cartesia: cost.tts.chars };
  const credits = (by.cartesia || 0) * cs.creditMult;
  let ttsUsd = credits * cs.usdPerCredit;
  Object.entries(by).forEach(([k, n]) => { if (k !== 'cartesia') ttsUsd += (n / 1000) * ttsRatePer1k(k); });
  const usd = cost.claude.usd + ttsUsd;
  return { credits, chars: cost.tts.chars, by, ttsUsd, claudeUsd: cost.claude.usd, usd, krw: usd * cs.krw };
}

const fmtUsd = (x) => '$' + (x < 0.01 && x > 0 ? x.toFixed(4) : x.toFixed(x < 1 ? 3 : 2));
const fmtKrw = (x) => '₩' + Math.round(x).toLocaleString('ko-KR');
const fmtNum = (x) => Math.round(x).toLocaleString('ko-KR');

// 아직 만들지 않은 음성의 크레딧 (대본이 있으면 정확히, 없으면 길이로 짐작)
function pendingTtsChars() {
  return TL.filter((e) => e.s.say && !VOICE[voiceKey(e.s)]).reduce((a, e) => a + [...stripMarks(e.s.say)].length, 0);
}

// 대본 생성 전 예상치 (대략): 프롬프트 길이로 입력 토큰, 영상 길이로 출력 토큰(생각 토큰 포함)과 내레이션 글자 수를 짐작
const LENGTH_GUESS = { shorts: { out: 3000, chars: 320 }, standard: { out: 8000, chars: 1000 }, long: { out: 15000, chars: 2100 } };
function estimateNew(length, promptText) {
  const g = LENGTH_GUESS[length] || LENGTH_GUESS.standard;
  const inTok = Math.round((promptText || '').length / 1.6);
  const p = { in: 4, out: 20 }; // claude-opus-5-5
  const claude = (inTok * p.in + g.out * p.out) / 1e6;
  const cs = costSettings();
  const t = (typeof currentTTS === 'function' && currentTTS()) || { provider: 'cartesia' };
  const credits = t.provider === 'cartesia' ? g.chars * cs.creditMult : g.chars;
  const tts = t.provider === 'cartesia' ? credits * cs.usdPerCredit : (g.chars / 1000) * ttsRatePer1k(t.provider, t.voiceId, t.model);
  return { claudeLo: claude * 0.6, claudeHi: claude * 1.8, credits, tts, krwLo: (claude * 0.6 + tts) * cs.krw, krwHi: (claude * 1.8 + tts) * cs.krw };
}
