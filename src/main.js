import Phaser from 'phaser';

import { COLORS } from './theme.js';
import { W, H, IDLE_MS } from './config/game.js';
import { input } from './core/InputManager.js';
import { sfx } from './core/Sfx.js';
import { getSettings, setSettings, logError } from './core/Storage.js';
import { toggleAdmin } from './admin/admin.js';
import { GAMES } from './config/games.js';
import { Cloud } from './core/Cloud.js';

import Boot from './scenes/Boot.js';
import Attract from './scenes/Attract.js';
import Nickname from './scenes/Nickname.js';
import Hub from './scenes/Hub.js';
import Tutorial from './scenes/Tutorial.js';
import BubbleGame from './scenes/BubbleGame.js';
import MixGame from './scenes/MixGame.js';
import SobeGame from './scenes/SobeGame.js';
import RunnerGame from './scenes/RunnerGame.js';
import DummyGame from './scenes/DummyGame.js';
import Contact from './scenes/Contact.js';
import Viral from './scenes/Viral.js';
import GameOver from './scenes/GameOver.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60 },
  render: { antialias: true },
  scene: [Boot, Attract, Nickname, Hub, Tutorial, BubbleGame, MixGame, SobeGame, RunnerGame, DummyGame, GameOver, Contact, Viral],
});

sfx.setMuted(getSettings().muted);

// Nuvem opcional (Supabase): sem configuração não faz nada; com falha de rede, o jogo segue normal.
Cloud.start().catch(() => {});

// ---- Plano B: index.html?jogo=bolha | misturar | sobe abre só aquele jogo (sem hub) ----
const solo = new URLSearchParams(location.search).get('jogo');
if (solo && GAMES.some((g) => g.id === solo)) game.registry.set('solo', solo);

// ---- Mantém a tela acesa durante o evento (quando o navegador permitir) ----
let wakeLock = null;
const keepAwake = async () => {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen');
  } catch (_) {
    /* sem suporte ou negado: segue sem */
  }
};
keepAwake();
document.addEventListener('visibilitychange', keepAwake);

// ---- Indicador de controle ----
const hud = document.getElementById('hud');
const drawHud = () => {
  const bits = [];
  if (input.padConnected) bits.push(`🎮 ${input.padName || 'Controle'} conectado`);
  else bits.push('🎮 Aperte qualquer botão do controle');
  if (sfx.muted) bits.push('🔇 Mudo (M)');
  hud.textContent = bits.join('   ');
};
input.onPadChange(drawHud);
drawHud();

// ---- Contador de FPS oculto (tecla F3) para conferir o desempenho no notebook do stand ----
const fpsEl = document.createElement('div');
fpsEl.id = 'fps';
fpsEl.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:6;display:none;padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.6);color:#1EEE97;font:700 16px Nunito,sans-serif;pointer-events:none';
document.body.appendChild(fpsEl);
let fpsOn = false;
window.addEventListener('keydown', (e) => {
  if (e.key === 'F3') {
    e.preventDefault();
    fpsOn = !fpsOn;
    fpsEl.style.display = fpsOn ? 'block' : 'none';
  }
});
setInterval(() => {
  if (!fpsOn) return;
  const mem = performance.memory ? ` · ${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB` : '';
  const cena = game.scene.getScenes(true)[0];
  const dg = ` · tecla: ${input.lastCode || '-'} · controle: ${input.padAx ? input.padAx.map((v) => v.toFixed(2)).join('/') : 'não'}`;
  fpsEl.textContent = `${Math.round(game.loop.actualFps)} FPS${mem} · ${cena ? cena.scene.key : '-'}${dg}`;
}, 500);

// ---- Erros: nunca tela branca ----
const oops = document.getElementById('oops');
let crashed = false;
const crash = (where, err) => {
  logError(where, err);
  crashed = true;
  oops.style.display = 'flex';
};
window.addEventListener('error', (e) => crash('window.error', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => crash('promise', e.reason));

// ---- Painel admin oculto: Ctrl+Shift+A + PIN ----
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
    e.preventDefault();
    toggleAdmin();
  }
});

// ---- Loop global de input, mudo e ociosidade ----
game.events.on('prestep', () => {
  input.update();

  if (crashed) {
    if (input.pressed('action')) {
      crashed = false;
      oops.style.display = 'none';
      game.scene.getScenes(true).forEach((s) => s.scene.stop());
      game.scene.start('Attract');
    }
    return;
  }

  if (input.pressed('mute')) {
    const m = !sfx.muted;
    sfx.setMuted(m);
    setSettings({ muted: m });
    drawHud();
  }

  // 30 s sem input em qualquer tela → modo atração (reset limpo entre jogadores)
  if (Date.now() - input.lastInputAt > IDLE_MS) {
    const active = game.scene.getScenes(true)[0];
    if (active && active.scene.key !== 'Attract' && active.scene.key !== 'Boot') {
      input.touch();
      active.scene.start('Attract');
    }
  }
});

window.__quimia = game; // para depuração no console
