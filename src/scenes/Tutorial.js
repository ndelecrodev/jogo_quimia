import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, kemiKey, fitImage, reduceFx } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { gameById } from '../config/games.js';

const DURATION = 3000;

// Mini-tutorial de 3 s: só ícones animados, sem parágrafo. Ação pula.
export default class Tutorial extends BaseScene {
  constructor() {
    super('Tutorial');
  }

  create(data) {
    this.begin();
    this.game_ = gameById((data && data.gameId) || this.registry.get('gameId') || 'bolha');
    addBackground(this);
    this.bubbles = new BubbleField(this, 14);

    T(this, 960, 150, this.game_.name, 'h1', { color: COLORS.neon });

    const kemi = fitImage(this.add.image(960, 480, kemiKey(this)), 300);
    this.tweens.add({ targets: kemi, y: 430, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });

    // Cápsula com a tecla/botão
    const g = this.add.graphics();
    drawCard(g, 560, 700, 800, 130, { fill: COLORS.card, stroke: COLORS.neon, sw: 5, r: 40 });
    const keys = T(this, 960, 765, this.game_.keys, 'h1', { color: COLORS.white });
    if (!reduceFx()) this.tweens.add({ targets: keys, scale: 1.08, duration: 420, yoyo: true, repeat: -1 });
    T(this, 960, 890, this.game_.tip, 'h3', { color: COLORS.mint2 });

    // Barra de progresso (3 s)
    const bar = this.add.rectangle(560, 990, 0, 14, hex(COLORS.neon)).setOrigin(0, 0.5);
    this.tweens.add({ targets: bar, width: 800, duration: DURATION, onComplete: () => this.start() });
    T(this, 960, 1040, input.padConnected ? '✕ para pular  ·  ○ para voltar' : 'ESPAÇO ou ✕ para pular  ·  Esc para voltar', 'bodyS', { color: COLORS.sky2 });
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.scene.start(this.game_.scene, { gameId: this.game_.id });
  }

  update(_, delta) {
    this.bubbles.update(delta);
    if (this.ready() && input.pressed('action')) { sfx.play('ok'); this.start(); }
    if (this.ready() && input.pressed('back')) { sfx.play('back'); this.started = true; this.scene.start(this.registry.get('solo') ? 'Attract' : 'Hub'); }
  }
}
