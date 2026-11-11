@echo off
cd /d "%~dp0"
where node >nul 2>&1 || (
  echo Node.js nao encontrado. Instale em https://nodejs.org e rode este arquivo de novo.
  pause
  exit /b 1
)
node server.js
pause
