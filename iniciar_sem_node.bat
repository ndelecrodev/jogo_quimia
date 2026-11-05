@echo off
REM Modo SEM Node: sobe o servidor Python e abre o jogo no Chrome. Feche esta janela para parar.
cd /d "%~dp0"
start "Quimia servidor" /min python servir.py 8000
timeout /t 2 >nul
start chrome --autoplay-policy=no-user-gesture-required http://127.0.0.1:8000/
echo Jogo:    http://127.0.0.1:8000/
echo TV:      http://127.0.0.1:8000/ranking
