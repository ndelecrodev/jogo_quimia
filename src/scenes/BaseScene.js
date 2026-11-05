import Phaser from 'phaser';
import { input } from '../core/InputManager.js';
import { reduceFx } from '../ui.js';

/** Base das cenas: debounce de input logo após entrar (evita o clique "vazar" da cena anterior). */
export class BaseScene extends Phaser.Scene {
  begin() {
    this.enteredAt = performance.now();
    input.textMode = false;
    // transição suave (sem piscar): pula se o usuário/admin pediu para reduzir efeitos
    if (!reduceFx()) this.cameras.main.fadeIn(220, 20, 32, 36);
  }

  ready(ms = 350) {
    return performance.now() - this.enteredAt > ms;
  }
}
