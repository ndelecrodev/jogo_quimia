"""Gera o sw.js (service worker) que faz o jogo funcionar OFFLINE depois de aberto uma vez na hospedagem.

Uso (rode de novo SEMPRE que mudar qualquer arquivo do jogo, antes de publicar):
    python scripts/gerar_sw.py

O service worker guarda uma cópia de todos os arquivos. Com internet ele usa a versão mais nova (e atualiza a cópia);
sem internet ele usa a cópia guardada. O nome da cópia muda sozinho quando os arquivos mudam.
Só funciona em https ou em localhost (GitHub Pages e o servir.py servem).
"""
import hashlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FIXOS = ["index.html", "ranking.html", "favicon.ico", "favicon.svg", "apple-touch-icon.png",
         "vendor/phaser.min.js", "vendor/phaser-shim.js", "vendor/qrcode.js", "assets/manifest.json"]


def arquivos():
    lista = [f for f in FIXOS if (RAIZ / f).exists()]
    for pasta, padroes in (("src", ("*.js", "*.css")), ("fonts", ("*.woff2", "*.css")), ("assets/kemi", ("*.png",))):
        for padrao in padroes:
            lista += sorted(str(p.relative_to(RAIZ)).replace("\\", "/") for p in (RAIZ / pasta).rglob(padrao) if "_fonte" not in p.parts)
    return sorted(set(lista))


MODELO = """// GERADO por scripts/gerar_sw.py — não edite à mão. Rode `python scripts/gerar_sw.py` antes de publicar.
// Service worker: rede primeiro (sempre a versão mais nova quando há internet) e cópia guardada quando está offline.
const CACHE = 'quimia-arcade-@@VERSAO@@';
const ARQUIVOS = @@ARQUIVOS@@;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('quimia-arcade-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
"""


def main():
    lista = arquivos()
    h = hashlib.sha1()
    for f in lista:
        h.update(f.encode())
        h.update((RAIZ / f).read_bytes())
    versao = h.hexdigest()[:10]
    import json
    texto = MODELO.replace("@@VERSAO@@", versao).replace("@@ARQUIVOS@@", json.dumps(lista, indent=2, ensure_ascii=False))
    (RAIZ / "sw.js").write_text(texto, encoding="utf-8")
    print(f"OK: sw.js com {len(lista)} arquivos, versão {versao}")


if __name__ == "__main__":
    main()
