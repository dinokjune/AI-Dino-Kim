// 유튜브 비공개 업로드 (YouTube Data API v3, OAuth 설치형 앱 방식)
//
// 1회 준비:
//   1) Google Cloud 콘솔에서 프로젝트 생성 → "YouTube Data API v3" 사용 설정
//   2) OAuth 동의 화면 설정(테스트 사용자에 내 계정 추가) → 사용자 인증 정보 → OAuth 클라이언트 ID(데스크톱 앱) 생성
//   3) .env 에 YT_CLIENT_ID, YT_CLIENT_SECRET 입력
//   4) node youtube.mjs auth  → 브라우저에서 로그인·허용 → .env 에 YT_REFRESH_TOKEN 이 저장된다
//
// 업로드는 항상 "비공개"로 올라간다. 사람이 확인한 뒤 유튜브 스튜디오에서 공개로 바꾸는 흐름이다.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(ROOT, '.env');
const REDIRECT_PORT = 53682;
const REDIRECT = `http://127.0.0.1:${REDIRECT_PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

export function youtubeReady() {
  return !!(process.env.YT_CLIENT_ID && process.env.YT_CLIENT_SECRET && process.env.YT_REFRESH_TOKEN);
}

async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID, client_secret: process.env.YT_CLIENT_SECRET,
      refresh_token: process.env.YT_REFRESH_TOKEN, grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`유튜브 인증 실패: ${j.error_description || j.error || r.status}. "node youtube.mjs auth"를 다시 실행하세요.`);
  return j.access_token;
}

// meta: { title, description, tags }. 반환: { id, url }
export async function uploadVideo(file, meta) {
  if (!youtubeReady()) throw new Error('유튜브 업로드 설정이 없습니다 (.env 의 YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN)');
  const token = await accessToken();
  const size = fs.statSync(file).size;
  const body = {
    snippet: {
      title: (meta.title || '제목 없음').slice(0, 100),
      description: (meta.description || '').slice(0, 4900),
      tags: (meta.tags || []).slice(0, 15),
      categoryId: process.env.YT_CATEGORY_ID || '27', // 27 = 교육
      defaultLanguage: 'ko', defaultAudioLanguage: 'ko',
    },
    status: {
      privacyStatus: 'private',
      selfDeclaredMadeForKids: false,
      // AI 음성 합성 사용 → 변경·합성 콘텐츠 표시
      containsSyntheticMedia: true,
    },
  };
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify(body),
  });
  if (!init.ok) throw new Error(`업로드 시작 실패 ${init.status}: ${(await init.text()).slice(0, 300)}`);
  const loc = init.headers.get('location');
  const put = await fetch(loc, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: fs.readFileSync(file),
  });
  const j = await put.json().catch(() => ({}));
  if (!put.ok) throw new Error(`업로드 실패 ${put.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return { id: j.id, url: `https://youtu.be/${j.id}`, studio: `https://studio.youtube.com/video/${j.id}/edit` };
}

// 브라우저 로그인으로 refresh token 을 받아 .env 에 저장한다
async function authFlow() {
  const id = process.env.YT_CLIENT_ID, secret = process.env.YT_CLIENT_SECRET;
  if (!id || !secret) { console.error('.env 에 YT_CLIENT_ID 와 YT_CLIENT_SECRET 을 먼저 넣으세요.'); process.exit(1); }
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: id, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent',
  });
  console.log('\n아래 주소를 브라우저에서 열고, 채널 계정으로 로그인해 허용하세요:\n\n' + url + '\n');
  const code = await new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== '/callback') { res.writeHead(404); return res.end(); }
      const c = u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(c ? '<h2>완료했습니다. 이 창을 닫아도 됩니다.</h2>' : '<h2>허용되지 않았습니다.</h2>');
      srv.close();
      c ? resolve(c) : reject(new Error(u.searchParams.get('error') || '취소됨'));
    }).listen(REDIRECT_PORT, '127.0.0.1');
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  });
  const j = await r.json();
  if (!j.refresh_token) { console.error('refresh token 을 받지 못했습니다:', j); process.exit(1); }
  let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  env = /^YT_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^YT_REFRESH_TOKEN=.*$/m, `YT_REFRESH_TOKEN=${j.refresh_token}`) : env.replace(/\n?$/, `\nYT_REFRESH_TOKEN=${j.refresh_token}\n`);
  fs.writeFileSync(ENV_FILE, env);
  console.log('저장했습니다: .env 의 YT_REFRESH_TOKEN. 이제 자동 제작에서 "유튜브 비공개 업로드"를 쓸 수 있습니다.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { loadDotEnv } = await import('./server.mjs');
  loadDotEnv(ENV_FILE);
  const cmd = process.argv[2];
  if (cmd === 'auth') await authFlow();
  else if (cmd === 'upload' && process.argv[3]) {
    const dir = path.dirname(path.resolve(process.argv[3]));
    const metaFile = path.join(dir, 'youtube.json');
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : { title: path.basename(dir) };
    console.log(await uploadVideo(process.argv[3], meta));
  } else console.log('사용법: node youtube.mjs auth | node youtube.mjs upload out/<폴더>/video.mp4');
}
