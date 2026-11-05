@echo off
chcp 65001 >nul
REM ============================================================
REM  Quimia Arcade - abre o jogo em tela cheia (modo quiosque)
REM  Precisa de Python e Google Chrome. Para sair: Alt+F4.
REM ============================================================
cd /d "%~dp0"

set PY=python
where python >nul 2>nul || set PY=py
where %PY% >nul 2>nul || (
  echo Python nao encontrado. Instale em https://www.python.org e marque "Add to PATH".
  pause
  exit /b 1
)

REM Servidor local (janela minimizada). Se ja estiver rodando, o novo simplesmente nao sobe.
start "Quimia servidor" /min %PY% servir.py 8000
timeout /t 2 /nobreak >nul

REM Perfil proprio do Chrome: guarda o ranking e e COMPARTILHADO com a tela da TV (iniciar_ranking.bat).
set PERFIL=%LOCALAPPDATA%\QuimiaArcadeChrome

start "" chrome --user-data-dir="%PERFIL%" --kiosk --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-infobars --disable-session-crashed-bubble --overscroll-history-navigation=0 --disable-pinch "http://127.0.0.1:8000/"
