// GERADO por scripts/gerar_sw.py — não edite à mão. Rode `python scripts/gerar_sw.py` antes de publicar.
// Service worker: rede primeiro (sempre a versão mais nova quando há internet) e cópia guardada quando está offline.
const CACHE = 'quimia-arcade-09c021c73c';
const ARQUIVOS = [
  "apple-touch-icon.png",
  "assets/kemi/kemi_down.png",
  "assets/kemi/kemi_happy.png",
  "assets/kemi/kemi_idle.png",
  "assets/kemi/kemi_side.png",
  "assets/kemi/kemi_sleepy.png",
  "assets/kemi/kemi_wink.png",
  "assets/manifest.json",
  "favicon.ico",
  "favicon.svg",
  "fonts/fonts.css",
  "fonts/nunito-latin-700-normal.woff2",
  "fonts/nunito-latin-800-normal.woff2",
  "fonts/pt-sans-latin-400-normal.woff2",
  "index.html",
  "ranking.html",
  "src/admin/admin.css",
  "src/admin/admin.js",
  "src/config/difficulty.js",
  "src/config/event.js",
  "src/config/fatos.js",
  "src/config/game.js",
  "src/config/games.js",
  "src/config/misturas.js",
  "src/config/prizes.js",
  "src/config/supabase.js",
  "src/config/supabase.local.example.js",
  "src/config/supabase.runtime.js",
  "src/core/Cloud.js",
  "src/core/InputManager.js",
  "src/core/Profanity.js",
  "src/core/Ranking.js",
  "src/core/RankingSource.js",
  "src/core/Sfx.js",
  "src/core/Storage.js",
  "src/core/clock.js",
  "src/core/format.js",
  "src/core/pendencias.js",
  "src/core/qr.js",
  "src/main.js",
  "src/ranking/ranking.css",
  "src/ranking/ranking.js",
  "src/scenes/Attract.js",
  "src/scenes/BaseScene.js",
  "src/scenes/Boot.js",
  "src/scenes/BubbleGame.js",
  "src/scenes/Contact.js",
  "src/scenes/DummyGame.js",
  "src/scenes/GameOver.js",
  "src/scenes/Hub.js",
  "src/scenes/MixGame.js",
  "src/scenes/Nickname.js",
  "src/scenes/RunnerGame.js",
  "src/scenes/SobeGame.js",
  "src/scenes/Tutorial.js",
  "src/scenes/Viral.js",
  "src/theme.js",
  "src/ui.js",
  "vendor/phaser-shim.js",
  "vendor/phaser.min.js",
  "vendor/qrcode.js"
];

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
