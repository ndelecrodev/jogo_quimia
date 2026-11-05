import Phaser from 'phaser';
import { input } from '../core/InputManager.js';

/** Base das cenas: debounce de input logo após entrar (evita o clique "vazar" da cena anterior). */
export class BaseScene extends Phaser.Scene {
  begin() {
    this.enteredAt = performance.now();
    input.textMode = false;
  }

  ready(ms = 350) {
    return performance.now() - this.enteredAt > ms;
  }
}
