# 윈도우 설치·실행: PowerShell 에서  powershell -ExecutionPolicy Bypass -File setup.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'Node.js 20 이상이 필요합니다: winget install OpenJS.NodeJS.LTS 후 창을 새로 여세요.'; exit 1 }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { Write-Host 'ffmpeg 설치 중 (MP4 렌더용)...'; winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements }
Write-Host '패키지 설치 중...'; npm install
Write-Host 'MP4 렌더용 크롬 설치 중...'; npx playwright install chromium
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host '.env 를 만들었습니다. 키는 나중에 스튜디오 ⚙ 설정에서 넣어도 됩니다.' }
Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-Command','Start-Sleep 3; Start-Process http://127.0.0.1:8787'
node server.mjs
