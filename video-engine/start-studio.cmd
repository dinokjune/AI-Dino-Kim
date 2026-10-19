@echo off
chcp 65001 >nul
rem 더블클릭으로 영상 스튜디오 서버를 켭니다. 이 창을 닫으면 서버도 꺼집니다.
cd /d "%~dp0"
if not exist node_modules (
  echo 처음 실행: 패키지 설치 중...
  call npm install
)
if exist "D:\cache\ms-playwright" set PLAYWRIGHT_BROWSERS_PATH=D:\cache\ms-playwright
if not exist .env copy .env.example .env >nul
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep 3; Start-Process http://127.0.0.1:8787"
echo 영상 스튜디오 서버를 켭니다. 쓰는 동안 이 창을 닫지 마세요.
node server.mjs
echo.
echo 서버가 멈췄습니다. 위의 메시지를 확인하세요.
pause
