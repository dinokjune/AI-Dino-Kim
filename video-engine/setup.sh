#!/usr/bin/env bash
# 맥·리눅스 설치·실행: bash setup.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Node.js 20 이상이 필요합니다 (맥: brew install node)'; exit 1; }
command -v ffmpeg >/dev/null || { if command -v brew >/dev/null; then brew install ffmpeg; else echo 'ffmpeg 를 설치하세요 (MP4 렌더용)'; fi; }
npm install
npx playwright install chromium
[ -f .env ] || { cp .env.example .env; echo '.env 를 만들었습니다. 키는 스튜디오 ⚙ 설정에서 넣어도 됩니다.'; }
( sleep 2; (command -v open >/dev/null && open http://127.0.0.1:8787) || (command -v xdg-open >/dev/null && xdg-open http://127.0.0.1:8787) || true ) &
node server.mjs
