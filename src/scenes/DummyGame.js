import { BaseScene } from './BaseScene.js';
import { COLORS } from '../theme.js';
import { addBackground, BubbleField, T, kemiKey, fitImage } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { gameById } from '../config/games.js';

// Jogo "dummy" para os jogos ainda não implementados: 10 s, ação = +1 ponto. Serve para testar o fluxo completo.
export default class DummyGame extends BaseScene {
  constructor() {
    super('DummyGame');
  }

  create(data) {
    this.begin();
    this.gameId = (data && data.gameId) || this.registry.get('gameId') || 'misturar';
    this.points = 0;
    this.left = 10000;
    addBackground(this);
    this.bubbles = new BubbleField(this, 14);
    T(this, 960, 120, gameById(this.gameId).name, 'h1', { color: COLORS.neon });
    T(this, 960, 200, 'EM CONSTRUÇÃO — aperte ESPAÇO ou ✕ para pontuar!', 'h3', { color: COLORS.cyan });
    this.kemi = fitImage(this.add.image(960, 540, kemiKey(this)), 320);
    this.score = T(this, 960, 800, '0', 'display');
    this.timer = T(this, 960, 900, '10', 'h2', { color: COLORS.mint2 });
  }

  update(_, delta) {
    this.bubbles.update(delta);
    this.left -= delta;
    this.timer.setText(String(Math.max(0, Math.ceil(this.left / 1000))));
    if (this.ready() && input.pressed('action')) {
      this.points++;
      this.score.setText(String(this.points));
      sfx.play('point');
      this.tweens.add({ targets: this.kemi, scale: this.kemi.baseScale * 1.12, duration: 80, yoyo: true });
    }
    if (this.left <= 0 && !this.done) {
      this.done = true;
      this.scene.start('GameOver', { game: this.gameId, points: this.points, durationMs: 10000, reason: 'time', acted: true });
    }
  }
}
