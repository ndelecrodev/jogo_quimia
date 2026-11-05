import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));

// Faz "/ranking" abrir "ranking.html" (tela da TV), tanto no dev quanto no preview.
const rewriteRanking = (req, _res, next) => {
  if (req.url && req.url.split('?')[0] === '/ranking') req.url = '/ranking.html';
  next();
};

export default defineConfig({
  base: './',
  publicDir: false, // assets/, fonts/ e vendor/ já ficam na raiz (modo hospedagem estática)
  plugins: [
    {
      name: 'quimia-rewrite-ranking',
      configureServer: (s) => s.middlewares.use(rewriteRanking),
      configurePreviewServer: (s) => s.middlewares.use(rewriteRanking),
    },
  ],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        ranking: resolve(root, 'ranking.html'),
      },
    },
  },
});
