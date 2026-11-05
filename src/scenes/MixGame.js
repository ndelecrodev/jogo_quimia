import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, kemiKey, fitImage, floatText, burst, reduceFx } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getSettings } from '../core/Storage.js';
import { LIVES, W, H } from '../config/game.js';
import { mixParams, MIX_LEVELS } from '../config/difficulty.js';
import { MISTURAS, PRODUTOS } from '../config/misturas.js';

const SHELF_Y = 740;
const LEFT_X = 560;
const RIGHT_X = 1360;
const FALLBACK_COLORS = ['cyanLight', 'mint1', 'mint3', 'sky', 'greenDark', 'sky2'];

// Nome curto (sem o que vem entre parênteses) para a tela de aprendizado.
const nomeDe = (id) => (PRODUTOS[id] ? PRODUTOS[id].nome.replace(/\s*\(.*\)/, '') : id);

// Pode Misturar?: dois produtos na prateleira. ← SEGURO ou PERIGOSO →. Combo, 3 vidas, teto de tempo.
export default class MixGame extends BaseScene {
  constructor() {
    super('MixGame');
  }

  create() {
    this.begin();
    const cfg = getSettings();
    this.maxTime = cfg.maxTimeMs;
    this.fxReduced = reduceFx();
    addBackground(this);
    this.bubbles = new BubbleField(this, 16);

    // Prateleira
    const sh = this.add.graphics().setDepth(4);
    sh.fillStyle(hex(COLORS.elevated), 1);
    sh.fillRoundedRect(240, SHELF_Y, 1440, 26, 12);
    sh.lineStyle(5, hex(COLORS.neon), 1);
    sh.strokeRoundedRect(240, SHELF_Y, 1440, 26, 12);

    // Estado
    this.points = 0;
    this.lives = LIVES;
    this.elapsed = 0;
    this.streak = 0;
    this.level = 0;
    this.started = false;
    this.ended = false;
    this.paused = false;
    this.locked = true; // true enquanto mostra o feedback / antes de começar
    this.bag = [];
    this.lastPair = null;
    this.round = null;
    this.wrong = [];
    this.hadPad = input.padConnected;

    // HUD
    this.scoreText = T(this, 960, 70, '0', 'display', { depth: 20, stroke: COLORS.bg, strokeThickness: 8 });
    this.lifeIcons = [];
    for (let i = 0; i < LIVES; i++) this.lifeIcons.push(this.add.image(80 + i * 78, 70, 'pickup').setScale(0.75).setDepth(20));
    this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.card)).setOrigin(1, 0.5).setDepth(20);
    this.timeBar = this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.neon)).setOrigin(1, 0.5).setDepth(21);
    T(this, W - 60, 112, 'TEMPO', 'caption', { origin: [1, 0.5], color: COLORS.sky2, depth: 20 });
    this.comboText = T(this, 960, 890, '', 'h2', { color: COLORS.cyanLight, depth: 20 });

    // Pergunta e barra de tempo da rodada
    this.question = T(this, 960, 190, 'Pode misturar?', 'h1', { color: COLORS.white, depth: 20 });
    this.add.rectangle(960, 270, 700, 18, hex(COLORS.card)).setDepth(20);
    this.roundBar = this.add.rectangle(610, 270, 700, 18, hex(COLORS.neon)).setOrigin(0, 0.5).setDepth(21);
    this.plus = T(this, 960, 600, '+', 'display', { color: COLORS.cyan, depth: 8, fontSize: '150px' });

    // Botões de resposta
    this.btnSafe = this.makePrompt(480, 'SEGURO', '←', COLORS.neon);
    this.btnDanger = this.makePrompt(1440, 'PERIGOSO', '→', COLORS.danger);

    // Kemi reage
    this.kemi = fitImage(this.add.image(960, 975, kemiKey(this)).setDepth(10), 120);
    this.kemiY = this.kemi.y;

    this.startHint = T(this, 960, 560, 'Aperte ESPAÇO ou ✕ para começar', 'h2', { color: COLORS.white, depth: 30, stroke: COLORS.bg, strokeThickness: 8 });
    if (!this.fxReduced) this.tweens.add({ targets: this.startHint, alpha: 0.4, duration: 650, yoyo: true, repeat: -1 });

    // Pausa
    this.pauseUI = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.pauseUI.add(this.add.rectangle(960, 540, W, H, 0x000000, 0.7));
    this.pauseTitle = T(this, 960, 450, 'PAUSA', 'display', { color: COLORS.neon });
    this.pauseUI.add(this.pauseTitle);
    this.pauseUI.add(T(this, 960, 600, 'Ação: continuar     Voltar: sair', 'h3', { color: COLORS.white }));

    this.items = []; // objetos da rodada atual
  }

  makePrompt(x, label, arrow, color) {
    const g = this.add.graphics().setDepth(12);
    drawCard(g, x - 260, 935, 520, 90, { fill: COLORS.card, stroke: color, sw: 5, r: 24 });
    const t = T(this, x, 980, arrow === '←' ? `←  ${label}` : `${label}  →`, 'h2', { color, depth: 13 });
    return { g, t, x, color };
  }

  flashPrompt(btn) {
    drawCard(btn.g, btn.x - 260, 935, 520, 90, { fill: btn.color, stroke: COLORS.white, sw: 5, r: 24 });
    btn.t.setColor(COLORS.darkText);
    this.time.delayedCall(220, () => {
      drawCard(btn.g, btn.x - 260, 935, 520, 90, { fill: COLORS.card, stroke: btn.color, sw: 5, r: 24 });
      btn.t.setColor(btn.color);
    });
  }

  // ---------- Produtos (desenhados em código) ----------
  makeProduct(id, x) {
    const p = PRODUTOS[id] || { nome: id };
    const key = p.cor || FALLBACK_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK_COLORS.length];
    const fill = hex(COLORS[key] || COLORS.cyan);
    const c = this.add.container(x, SHELF_Y).setDepth(8);
    const g = this.add.graphics();
    g.fillStyle(fill, 0.9);
    g.lineStyle(8, hex(COLORS.sky), 1);
    if (p.forma === 'jar') {
      g.fillRoundedRect(-95, -180, 190, 180, 28);
      g.strokeRoundedRect(-95, -180, 190, 180, 28);
      g.fillStyle(hex(COLORS.neon), 1);
      g.fillRoundedRect(-105, -208, 210, 36, 10);
    } else {
      g.fillRect(-34, -270, 68, 70);
      g.strokeRect(-34, -270, 68, 70);
      g.fillRoundedRect(-80, -215, 160, 215, 30);
      g.strokeRoundedRect(-80, -215, 160, 215, 30);
      g.fillStyle(hex(COLORS.neon), 1);
      g.fillRoundedRect(-44, -298, 88, 32, 8);
    }
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(-62, -170, 14, 110, 7);
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(-52, -110, 104, 70, 12); // rótulo
    c.add(g);
    c.add(T(this, 0, 78, p.nome, 'h3', { wordWrap: { width: 440 }, align: 'center', origin: [0.5, 0] }));
    return c;
  }

  // ---------- Rodadas ----------
  pickPair(unlocked) {
    if (!this.bag.length) {
      const pool = MISTURAS.slice(0, Math.min(unlocked, MISTURAS.length));
      this.bag = Phaser.Utils.Array.Shuffle([...pool]);
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.lastPair) this.bag.reverse();
    }
    const pair = this.bag.pop();
    this.lastPair = pair;
    return pair;
  }

  nextRound() {
    this.items.forEach((o) => o.destroy());
    const p = mixParams(this.points, this.elapsed, this.maxTime);
    const pair = this.pickPair(p.unlocked);
    const swap = Math.random() < 0.5;
    const idL = swap ? pair.b : pair.a;
    const idR = swap ? pair.a : pair.b;
    const l = this.makeProduct(idL, -300);
    const r = this.makeProduct(idR, W + 300);
    this.items = [l, r];
    this.tweens.add({ targets: l, x: LEFT_X, duration: 240, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: r, x: RIGHT_X, duration: 240, ease: 'Cubic.easeOut' });
    this.plus.setText('+').setColor(COLORS.cyan);
    this.question.setText('Pode misturar?').setColor(COLORS.white);
    this.round = { pair, limit: p.timeMs, left: p.timeMs };
    this.locked = false;
  }

  answer(choice) {
    if (this.locked || !this.round) return;
    this.locked = true;
    const { pair } = this.round;
    const correct = choice !== null && (choice === 'danger') === pair.perigosa;
    const [l, r] = this.items;

    if (correct) {
      this.streak++;
      const mult = Math.min(5, 1 + Math.floor(this.streak / 3));
      this.points += mult;
      this.scoreText.setText(String(this.points));
      this.tweens.add({ targets: this.scoreText, scale: 1.25, duration: 90, yoyo: true });
      sfx.play('point');
      floatText(this, 960, 520, `+${mult}`, COLORS.neon, 'display');
      this.question.setText(pair.perigosa ? 'PERIGOSO!' : 'SEGURO!').setColor(pair.perigosa ? COLORS.danger : COLORS.neon);
      this.plus.setText(pair.perigosa ? '✕' : '✓').setColor(pair.perigosa ? COLORS.danger : COLORS.neon);
      if (!this.fxReduced) burst(this, 960, 600, 10);
      this.tweens.add({ targets: l, x: LEFT_X + 70, duration: 160, yoyo: true });
      this.tweens.add({ targets: r, x: RIGHT_X - 70, duration: 160, yoyo: true });
      this.kemi.setTexture(kemiKey(this, Math.random() < 0.5 ? 'happy' : 'wink'));
      this.tweens.add({ targets: this.kemi, y: this.kemiY - 40, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
      this.comboText.setText(Math.min(5, 1 + Math.floor(this.streak / 3)) > 1 ? `COMBO x${Math.min(5, 1 + Math.floor(this.streak / 3))}` : '');
      this.time.delayedCall(380, () => this.afterFeedback());
    } else {
      this.streak = 0;
      this.comboText.setText('');
      this.lives--;
      this.lifeIcons.forEach((ic, i) => ic.setAlpha(i < this.lives ? 1 : 0.2));
      sfx.play('hit');
      this.cameras.main.shake(this.fxReduced ? 0 : 200, 0.005);
      this.question.setText(choice === null ? 'Tempo!' : 'Ops!').setColor(COLORS.danger);
      this.plus.setText(pair.perigosa ? 'Era PERIGOSO' : 'Era SEGURO').setColor(COLORS.danger).setFontSize('64px');
      this.kemi.setTexture(kemiKey(this, 'down'));
      this.kemi.setTint(0xff7a7a);
      this.tweens.add({ targets: this.kemi, x: 985, duration: 50, yoyo: true, repeat: 4, onComplete: () => { this.kemi.setX(960); this.kemi.clearTint(); } });
      if (!this.wrong.some((w) => w.pair === pair)) this.wrong.push({ pair });
      this.time.delayedCall(950, () => this.afterFeedback());
    }
  }

  afterFeedback() {
    if (this.ended) return;
    this.kemi.setTexture(kemiKey(this));
    this.plus.setFontSize('150px');
    if (this.lives <= 0) return this.finish('lives');
    const lvl = mixParams(this.points, this.elapsed, this.maxTime).level;
    if (lvl > this.level) {
      this.level = lvl;
      sfx.play('level');
      const t = T(this, 960, 400, `NÍVEL ${lvl + 1}`, 'display', { color: COLORS.cyanLight, depth: 40, stroke: COLORS.bg, strokeThickness: 10 });
      this.tweens.add({ targets: t, alpha: 0, y: 350, duration: 1000, onComplete: () => t.destroy() });
    }
    this.nextRound();
  }

  finish(reason) {
    if (this.ended) return;
    this.ended = true;
    this.locked = true;
    sfx.play('end');
    this.time.delayedCall(700, () =>
      this.scene.start('GameOver', {
        game: 'misturar',
        points: this.points,
        durationMs: Math.round(this.elapsed),
        reason,
        wrong: this.wrong.map(({ pair }) => ({ a: nomeDe(pair.a), b: nomeDe(pair.b), perigosa: pair.perigosa, porque: pair.porque })),
      })
    );
  }

  setPause(on, title = 'PAUSA') {
    this.paused = on;
    this.pauseTitle.setText(title);
    this.pauseUI.setVisible(on);
  }

  // ---------- Loop ----------
  update(_, delta) {
    this.bubbles.update(delta);
    if (this.ended) return;

    if (this.hadPad && !input.padConnected && !this.paused) this.setPause(true, 'CONTROLE DESCONECTADO');
    this.hadPad = input.padConnected;

    if (this.ready()) {
      if (this.paused) {
        if (input.pressed('action') || input.pressed('pause')) this.setPause(false);
        else if (input.pressed('back')) this.scene.start(this.registry.get('solo') ? 'Attract' : 'Hub');
        return;
      }
      if (this.started && (input.pressed('pause') || input.pressed('back'))) return this.setPause(true);
    }

    if (!this.started) {
      if (this.ready() && (input.pressed('action') || input.pressed('left') || input.pressed('right'))) {
        this.started = true;
        this.startHint.destroy();
        this.nextRound();
      }
      return;
    }

    this.elapsed += delta;
    const frac = Phaser.Math.Clamp(1 - this.elapsed / this.maxTime, 0, 1);
    this.timeBar.width = 360 * frac;
    this.timeBar.fillColor = hex(frac < 0.125 ? COLORS.danger : COLORS.neon);
    if (this.elapsed >= this.maxTime) return this.finish('time');

    if (this.locked || !this.round) return;

    this.round.left -= delta;
    const rf = Phaser.Math.Clamp(this.round.left / this.round.limit, 0, 1);
    this.roundBar.width = 700 * rf;
    this.roundBar.fillColor = hex(rf < 0.3 ? COLORS.danger : COLORS.neon);

    if (input.pressed('left')) { this.flashPrompt(this.btnSafe); this.answer('safe'); }
    else if (input.pressed('right')) { this.flashPrompt(this.btnDanger); this.answer('danger'); }
    else if (this.round.left <= 0) this.answer(null);
  }
}
