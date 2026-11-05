#!/usr/bin/env bash
# Quimia Arcade - abre o jogo em tela cheia (Linux/Mac). Precisa de python3 e Chrome/Chromium.
cd "$(dirname "$0")" || exit 1
python3 servir.py 8000 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 2
PERFIL="${HOME}/.quimia-arcade-chrome"
URL="http://127.0.0.1:8000/"
ARGS=(--user-data-dir="$PERFIL" --kiosk --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-infobars "$URL")
if command -v google-chrome >/dev/null; then google-chrome "${ARGS[@]}"
elif command -v chromium >/dev/null; then chromium "${ARGS[@]}"
elif [ -d "/Applications/Google Chrome.app" ]; then open -a "Google Chrome" --args "${ARGS[@]}"; wait $SERVER
else echo "Chrome/Chromium nao encontrado."; fi
