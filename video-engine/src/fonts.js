// 내 글꼴: 서버가 찾은 글꼴(다운로드 폴더·fonts 폴더)을 브라우저에 등록한다.
// 글꼴 파일 하나가 하나의 글꼴 이름(family)이 된다. 예: "Pretendard-Bold.otf" → "Pretendard-Bold"
const USER_FONTS = [];
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
      if (r.ok) ((await r.json()).fonts || []).forEach(registerFont);
    } catch (e) { /* 서버 없이 열었을 때 */ }
    return USER_FONTS;
  })();
  return userFontsPromise;
}

// 글꼴을 실제로 내려받아 그릴 준비를 한다 (실패해도 기본 글꼴로 그려진다)
async function ensureFonts(names) {
  await Promise.all(names.filter(Boolean).map((n) => document.fonts.load(`64px "${n}"`).catch(() => null)));
}
