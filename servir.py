"""Servidor local SEM Node (só Python). Uso:  python servir.py
Jogo:    http://127.0.0.1:8000/
TV:      http://127.0.0.1:8000/ranking
Serve a raiz do projeto (a mesma estrutura que vai para a hospedagem).
"""
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ALIAS = {"/ranking": "/ranking.html"}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".woff2": "font/woff2",
    }

    def translate_path(self, path):
        path = path.split("?", 1)[0].split("#", 1)[0]
        path = ALIAS.get(path, path)
        rel = os.path.normpath(path.lstrip("/"))
        for base in (ROOT,):
            full = os.path.join(base, rel)
            if os.path.isfile(full):
                return full
        return os.path.join(ROOT, rel)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # sempre pega a versão mais nova
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # silencioso


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as srv:
        print(f"Quimia Arcade rodando em http://127.0.0.1:{PORT}/  (Ctrl+C para parar)")
        srv.serve_forever()
