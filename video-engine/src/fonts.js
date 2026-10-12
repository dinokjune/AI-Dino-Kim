// 내 글꼴: 서버가 찾은 글꼴(다운로드 폴더·fonts 폴더)을 브라우저에 등록한다.
// 글꼴 파일 하나가 하나의 글꼴 이름(family)이 된다. 예: "Pretendard-Bold.otf" → "Pretendard-Bold"
const USER_FONTS = [];
let SYS_FONTS = []; // 운영체제에 설치된 글꼴 (이름으로 바로 쓴다)
let userFontsPromise = null;

function registerFont(f) {
  if (USER_FONTS.some((x) => x.family === f.family)) return;
  try {
    const face = new FontFace(f.family, f.buffer || `url("${f.url}")`);
    document.fonts.add(face);
    USER_FONTS.push(Object.assign({}, f, { face }));
  } catch (e) { console.warn('글꼴 등록 실패:', f.family, e); }
}

function loadUserFonts(force = false) {
  if (userFontsPromise && !force) return userFontsPromise;
  userFontsPromise = (async () => {
    try {
      const r = await fetch('/api/fonts');
      if (r.ok) { const j = await r.json(); (j.fonts || []).forEach(registerFont); SYS_FONTS = j.system || []; }
    } catch (e) { /* 서버 없이 열었을 때 */ }
    return USER_FONTS;
  })();
  return userFontsPromise;
}

// 글꼴을 실제로 내려받아 그릴 준비를 한다 (실패해도 기본 글꼴로 그려진다)
async function ensureFonts(names) {
  await Promise.all(names.filter(Boolean).map((n) => document.fonts.load(`64px "${n}"`).catch(() => null)));
}

// ── Google Fonts 한글 글꼴 (fonts.googleapis.com 에서 확인한 목록) ──
const GOOGLE_KO_FONTS = [
  ['Noto Sans KR', '고딕'], ['Noto Serif KR', '명조'], ['Nanum Gothic', '고딕'], ['Nanum Myeongjo', '명조'], ['Nanum Gothic Coding', '코딩'],
  ['IBM Plex Sans KR', '고딕'], ['Gowun Dodum', '돋움'], ['Gowun Batang', '바탕'], ['Hahmlet', '명조'], ['Orbit', '고딕'],
  ['Black Han Sans', '제목용'], ['Do Hyeon', '제목용'], ['Jua', '둥근'], ['Bagel Fat One', '제목용'], ['Gasoek One', '제목용'], ['Gugi', '제목용'],
  ['Dongle', '둥근'], ['Sunflower', '고딕', 500], ['Song Myung', '명조'], ['Stylish', '고딕'], ['Diphylleia', '명조'], ['Grandiflora One', '장식'], ['Moirai One', '장식'],
  ['Gaegu', '손글씨'], ['Nanum Pen Script', '손글씨'], ['Nanum Brush Script', '붓글씨'], ['Hi Melody', '손글씨'], ['Gamja Flower', '손글씨'],
  ['Poor Story', '손글씨'], ['Cute Font', '손글씨'], ['Single Day', '손글씨'], ['Yeon Sung', '손글씨'], ['Kirang Haerang', '손글씨'],
  ['Dokdo', '붓글씨'], ['East Sea Dokdo', '붓글씨'], ['Black And White Picture', '장식'],
];
const loadedGoogle = new Set(['Jua', 'Gowun Dodum', 'Black Han Sans', 'Do Hyeon', 'Gaegu', 'IBM Plex Sans KR', 'Noto Sans KR', 'Noto Serif KR', 'Nanum Gothic Coding']);
function googleWeight(fam) { const g = GOOGLE_KO_FONTS.find((f) => f[0] === fam); return g && g[2] ? g[2] : null; }

// Google 글꼴 스타일시트를 붙이고 받아질 때까지 기다린다
function ensureGoogleFont(fam) {
  if (!fam || loadedGoogle.has(fam) || !GOOGLE_KO_FONTS.some((f) => f[0] === fam)) return Promise.resolve();
  loadedGoogle.add(fam);
  const w = googleWeight(fam);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, '+')}${w ? ':wght@' + w : ''}&display=swap`;
  return new Promise((res) => { link.onload = res; link.onerror = res; document.head.appendChild(link); });
}

// 대본에 나오는 글자를 모두 미리 받아 둔다 (구글 글꼴은 글자 묶음별로 나뉘어 있어서,
// 미리 받지 않으면 MP4의 첫 프레임들이 기본 글꼴로 찍힐 수 있다)
async function ensureScriptFonts(families) {
  const fams = Array.from(new Set(families.filter(Boolean)));
  await Promise.all(fams.map(ensureGoogleFont));
  const text = Array.from(new Set(JSON.stringify((typeof SCRIPT !== 'undefined' && SCRIPT) ? SCRIPT.scenes : '') + (typeof META === 'function' ? (META().channel || '') + (META().title || '') : '') + '0123456789')).join('');
  await Promise.all(fams.map((f) => document.fonts.load(`64px "${f}"`, text).catch(() => null)));
}
