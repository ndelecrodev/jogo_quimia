@echo off
chcp 65001 >nul
REM ============================================================
REM  Quimia Arcade - tela do ranking (TV / segundo monitor)
REM  Rode DEPOIS do iniciar.bat. Usa o MESMO perfil do Chrome,
REM  senao o ranking nao enxerga as partidas.
REM  Se a janela abrir no monitor errado: arraste para a TV e aperte F11.
REM ============================================================
cd /d "%~dp0"
set PERFIL=%LOCALAPPDATA%\QuimiaArcadeChrome
start "" chrome --user-data-dir="%PERFIL%" --new-window --window-position=1920,0 --start-fullscreen "http://127.0.0.1:8000/ranking"
