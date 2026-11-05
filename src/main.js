import Phaser from 'phaser';

import { COLORS } from './theme.js';
import { W, H, IDLE_MS } from './config/game.js';
import { input } from './core/InputManager.js';
import { sfx } from './core/Sfx.js';
import { getSettings, setSettings, logError } from './core/Storage.js';

import Boot from './scenes/Boot.js';
import Attract from './scenes/Attract.js';
import Nickname from './scenes/Nickname.js';
import Hub from './scenes/Hub.js';
import Tutorial from './scenes/Tutorial.js';
import BubbleGame from './scenes/BubbleGame.js';
import DummyGame from './scenes/DummyGame.js';
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
  scene: [Boot, Attract, Nickname, Hub, Tutorial, BubbleGame, DummyGame, GameOver],
});

sfx.setMuted(getSettings().muted);

// ---- Indicador de controle ----
const hud = document.getElementById('hud');
const drawHud = () => {
  const bits = [];
  if (input.padConnected) bits.push('🎮 Controle conectado');
  else bits.push('🎮 Aperte qualquer botão do controle');
  if (sfx.muted) bits.push('🔇 Mudo (M)');
  hud.textContent = bits.join('   ');
};
input.onPadChange(drawHud);
drawHud();

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
