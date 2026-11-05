import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { isClean } from '../core/Profanity.js';
import { getPlays } from '../core/Storage.js';
import { NICK_MAX } from '../config/game.js';

const ROWS = [
  'ABCDEFGHIJ'.split(''),
  'KLMNOPQRST'.split(''),
  'UVWXYZ0123'.split(''),
  ['4', '5', '6', '7', '8', '9', 'APAGAR', 'OK'],
  ['JOGAR ANÔNIMO'],
];

// Única tela de formulário: só o apelido. Teclado físico digita direto; senão, seletor estilo arcade.
export default class Nickname extends BaseScene {
  constructor() {
    super('Nickname');
  }

  create() {
    this.begin();
    input.textMode = true;
    this.name = '';
    this.typedByKeyboard = false;
    addBackground(this);
    this.bubbles = new BubbleField(this, 16);

    T(this, 960, 90, 'Qual é o seu apelido?', 'h1', { color: COLORS.neon });
    T(this, 960, 160, 'Até 10 letras ou números. Ele aparece no ranking.', 'bodyL', { color: COLORS.mint2 });

    this.boxG = this.add.graphics();
    drawCard(this.boxG, 560, 215, 800, 120, { fill: COLORS.card, stroke: COLORS.neon, sw: 4 });
    this.nameText = T(this, 960, 275, '', 'display');
    this.counter = T(this, 1330, 320, `0/${NICK_MAX}`, 'label', { color: COLORS.sky2, origin: [1, 1] });
    this.msg = T(this, 960, 375, '', 'h3', { color: COLORS.danger });

    // Teclado de tela
    this.keys = [];
    const y0 = 470;
    ROWS.forEach((row, r) => {
      const widths = row.map((l) => (l === 'APAGAR' || l === 'OK' ? 210 : l.length > 2 ? 520 : 118));
      const total = widths.reduce((a, b) => a + b, 0) + (row.length - 1) * 14;
      let x = 960 - total / 2;
      row.forEach((label, c) => {
        const w = widths[c];
        const y = y0 + r * 112;
        const g = this.add.graphics();
        const t = T(this, x + w / 2, y + 48, label, label.length > 2 ? 'buttonM' : 'h2');
        this.keys.push({ label, r, c, x, y, w, h: 96, g, t, cx: x + w / 2 });
        x += w + 14;
      });
    });
    this.fr = 3;
    this.fc = 7; // começa no "OK"
    this.focusKey = () => this.keys.find((k) => k.r === this.fr && k.c === this.fc);
    this.refresh();

    // Digitação pelo teclado físico
    this.input.keyboard.on('keydown', (e) => {
      if (!this.ready(200)) return;
      input.touch();
      if (/^[a-z0-9]$/i.test(e.key)) {
        this.typedByKeyboard = true;
        this.addChar(e.key.toUpperCase());
      } else if (e.key === 'Backspace') {
        this.del();
      } else if (e.key === 'Enter' && this.typedByKeyboard) {
        this.confirm();
        this.enterHandled = true;
      }
    });
    this.updateName();
  }

  refresh() {
    const f = this.focusKey();
    this.keys.forEach((k) => {
      const on = k === f;
      const special = k.label === 'OK' || k.label.length > 2;
      drawCard(k.g, k.x, k.y, k.w, k.h, {
        fill: on ? COLORS.neon : special ? COLORS.elevated : COLORS.card,
        stroke: on ? COLORS.white : COLORS.elevated2,
        sw: on ? 5 : 3,
        r: 18,
      });
      k.t.setColor(on ? COLORS.darkText : COLORS.white);
    });
  }

  updateName() {
    this.nameText.setText(this.name + (Math.floor(this.time.now / 450) % 2 ? '_' : ' '));
    this.counter.setText(`${this.name.length}/${NICK_MAX}`);
  }

  addChar(ch) {
    if (this.name.length >= NICK_MAX) return sfx.play('error');
    this.name += ch;
    sfx.play('nav');
    this.msg.setText('');
  }

  del() {
    if (!this.name.length) return;
    this.name = this.name.slice(0, -1);
    sfx.play('back');
  }

  shake() {
    sfx.play('error');
    this.tweens.add({ targets: this.nameText, x: 975, duration: 50, yoyo: true, repeat: 4, onComplete: () => this.nameText.setX(960) });
  }

  confirm() {
    const n = this.name.trim();
    if (!n.length) {
      this.msg.setText('Digite um apelido ou escolha jogar anônimo.');
      return this.shake();
    }
    if (!isClean(n)) {
      this.msg.setText('Ops! Escolha outro apelido.');
      return this.shake();
    }
    this.go(n);
  }

  anonymous() {
    const used = new Set(getPlays().map((p) => p.nick));
    let n;
    do {
      n = `Visitante-${String(Math.floor(Math.random() * 900) + 100)}`;
    } while (used.has(n));
    this.go(n);
  }

  go(nick) {
    sfx.play('ok');
    this.registry.set('nick', nick);
    const solo = this.registry.get('solo');
    if (solo) this.scene.start('Tutorial', { gameId: solo });
    else this.scene.start('Hub');
  }

  moveVertical(dir) {
    const cur = this.focusKey();
    const nr = Phaser_clamp(this.fr + dir, 0, ROWS.length - 1);
    if (nr === this.fr) return;
    const cand = this.keys.filter((k) => k.r === nr);
    const best = cand.reduce((a, b) => (Math.abs(b.cx - cur.cx) < Math.abs(a.cx - cur.cx) ? b : a));
    this.fr = nr;
    this.fc = best.c;
  }

  update(_, delta) {
    this.bubbles.update(delta);
    this.updateName();
    if (!this.ready()) return;

    let moved = false;
    if (input.pressed('left')) { this.fc = (this.fc - 1 + ROWS[this.fr].length) % ROWS[this.fr].length; moved = true; }
    if (input.pressed('right')) { this.fc = (this.fc + 1) % ROWS[this.fr].length; moved = true; }
    if (input.pressed('up')) { this.moveVertical(-1); moved = true; }
    if (input.pressed('down')) { this.moveVertical(1); moved = true; }
    if (moved) { sfx.play('nav'); this.refresh(); }

    if (input.pressed('action')) {
      if (this.enterHandled) { this.enterHandled = false; return; }
      const k = this.focusKey();
      if (k.label === 'OK') this.confirm();
      else if (k.label === 'APAGAR') this.del();
      else if (k.label === 'JOGAR ANÔNIMO') this.anonymous();
      else this.addChar(k.label);
    }
    if (input.pressed('back')) {
      // Esc volta; o Backspace do teclado físico apaga (tratado no keydown acima).
      if (input.held('back') && !this.typedByKeyboard) {
        sfx.play('back');
        this.scene.start('Attract');
      }
    }
  }
}

const Phaser_clamp = (v, a, b) => Math.min(Math.max(v, a), b);
