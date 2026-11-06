import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, kemiKey, fitImage, floatText, burst, reduceFx, glowKemi } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getSettings } from '../core/Storage.js';
import { LIVES, W, H } from '../config/game.js';
import { mixParams, MIX_LEVELS, MIX_COMBO_MAX, scaleScore } from '../config/difficulty.js';
import { MISTURAS, PRODUTOS } from '../config/misturas.js';

const SHELF_Y = 700;
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
    this.correct = 0; // acertos (é o que define o nível)
    this.answers = 0; // respostas dadas pelo jogador (tempo esgotado não conta)
    this.elapsed = 0;
    this.streak = 0;
    this.level = 0;
    this.started = false;
    this.ended = false;
    this.paused = false;
    this.locked = true; // true enquanto mostra o feedback / antes de começar
    this.bag = [];
    this.recent = []; // últimos pares mostrados (para não repetir logo em seguida)
    this.poolSize = 0;
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
    this.comboText = T(this, 960, 345, '', 'h2', { color: COLORS.cyanLight, depth: 20 });

    // Pergunta e barra de tempo da rodada
    this.question = T(this, 960, 190, 'Pode misturar?', 'h1', { color: COLORS.white, depth: 20 });
    this.add.rectangle(960, 270, 700, 18, hex(COLORS.card)).setDepth(20);
    this.roundBar = this.add.rectangle(610, 270, 700, 18, hex(COLORS.neon)).setOrigin(0, 0.5).setDepth(21);
    this.plus = T(this, 960, 520, '+', 'display', { color: COLORS.cyan, depth: 8, fontSize: '150px' });

    // Botões de resposta
    this.btnSafe = this.makePrompt(480, 'SEGURO', '←', COLORS.neon);
    this.btnDanger = this.makePrompt(1440, 'PERIGOSO', '→', COLORS.danger);

    // Kemi reage
    this.kemi = glowKemi(fitImage(this.add.image(960, 975, kemiKey(this)).setDepth(10), 150));
    this.kemiY = this.kemi.y;

    this.startHint = T(this, 960, 410, 'Aperte ESPAÇO ou ✕ para começar', 'h2', { color: COLORS.white, depth: 30, stroke: COLORS.bg, strokeThickness: 8 });
    if (!this.fxReduced) this.tweens.add({ targets: this.startHint, alpha: 0.4, duration: 650, yoyo: true, repeat: -1 });

    // Pausa
    this.pauseUI = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.pauseUI.add(this.add.rectangle(960, 540, W, H, 0x000000, 0.7));
    this.pauseTitle = T(this, 960, 450, 'PAUSA', 'display', { color: COLORS.neon });
    this.pauseUI.add(this.pauseTitle);
    this.pauseUI.add(T(this, 960, 600, 'ESPAÇO ou ✕: continuar  ·  Esc ou ○: sair', 'h3', { color: COLORS.white }));

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

  // ---------- Produtos (cada um com silhueta e cor próprias, desenhados em código) ----------
  // Origem (0,0) = base do produto na prateleira; desenha para cima. Altura máxima ~300 px.
  drawProduto(g, forma, fill) {
    const sky = hex(COLORS.sky);
    const neon = hex(COLORS.neon);
    const corpo = (x, y, w, h, r) => {
      g.fillStyle(fill, 0.95);
      g.fillRoundedRect(x, y, w, h, r);
      g.lineStyle(8, sky, 1);
      g.strokeRoundedRect(x, y, w, h, r);
    };
    const rotulo = (x, y, w, h) => {
      g.fillStyle(0xffffff, 0.8);
      g.fillRoundedRect(x, y, w, h, 10);
    };
    const brilho = (x, y, h) => {
      g.fillStyle(0xffffff, 0.3);
      g.fillRoundedRect(x, y, 14, h, 7);
    };
    const tampa = (x, y, w, h) => {
      g.fillStyle(neon, 1);
      g.fillRoundedRect(x, y, w, h, 8);
    };
    switch (forma) {
      case 'galao': // galão com alça
        g.lineStyle(10, sky, 1);
        g.strokeRoundedRect(58, -215, 52, 110, 22);
        corpo(-95, -235, 190, 235, 28);
        corpo(-30, -268, 60, 36, 6);
        tampa(-38, -292, 76, 28);
        rotulo(-65, -170, 130, 90);
        brilho(-82, -215, 130);
        break;
      case 'spray': // frasco com gatilho
        corpo(-58, -190, 116, 190, 24);
        corpo(-22, -222, 44, 36, 6);
        g.fillStyle(neon, 1);
        g.fillRoundedRect(-52, -270, 112, 52, 12);
        g.fillRoundedRect(52, -256, 34, 16, 6);
        g.lineStyle(8, sky, 1);
        g.lineBetween(-10, -218, 30, -150);
        rotulo(-40, -140, 80, 70);
        brilho(-46, -175, 110);
        break;
      case 'frasco': // frasco pequeno de boca estreita
        corpo(-62, -160, 124, 160, 22);
        corpo(-24, -198, 48, 44, 6);
        tampa(-30, -222, 60, 26);
        rotulo(-42, -120, 84, 70);
        brilho(-50, -140, 90);
        break;
      case 'garrafa': // garrafa alta de gargalo
        corpo(-60, -215, 120, 215, 42);
        corpo(-25, -300, 50, 100, 8);
        tampa(-31, -322, 62, 26);
        rotulo(-42, -160, 84, 90);
        brilho(-48, -190, 120);
        break;
      case 'pote': // pote com tampa
        corpo(-100, -175, 200, 175, 32);
        g.fillStyle(neon, 1);
        g.fillRoundedRect(-108, -212, 216, 42, 12);
        rotulo(-70, -130, 140, 70);
        brilho(-88, -150, 100);
        break;
      case 'squeeze': // frasco de detergente (bico fino)
        corpo(-66, -200, 132, 200, 54);
        g.fillStyle(fill, 0.95);
        g.fillTriangle(-34, -196, 34, -196, 10, -250);
        g.fillTriangle(-34, -196, -10, -250, 10, -250);
        g.lineStyle(8, sky, 1);
        g.lineBetween(-34, -196, -10, -250);
        g.lineBetween(34, -196, 10, -250);
        tampa(-12, -276, 24, 30);
        rotulo(-44, -150, 88, 70);
        brilho(-54, -170, 100);
        break;
      case 'caixa': // caixa de sabão em pó
        corpo(-108, -235, 216, 235, 14);
        g.lineStyle(6, sky, 1);
        g.lineBetween(-108, -190, 108, -190);
        rotulo(-76, -150, 152, 100);
        brilho(-96, -175, 140);
        break;
      case 'barra': // barra de sabão
        corpo(-124, -125, 248, 125, 28);
        g.lineStyle(6, sky, 0.9);
        g.strokeRoundedRect(-96, -98, 192, 72, 18);
        brilho(-108, -108, 70);
        break;
      case 'copo': // copo de água
        g.fillStyle(0xffffff, 0.14);
        g.fillPoints([{ x: -84, y: -215 }, { x: 84, y: -215 }, { x: 62, y: 0 }, { x: -62, y: 0 }], true);
        g.fillStyle(fill, 0.95);
        g.fillPoints([{ x: -76, y: -130 }, { x: 76, y: -130 }, { x: 62, y: 0 }, { x: -62, y: 0 }], true);
        g.lineStyle(8, sky, 1);
        g.strokePoints([{ x: -84, y: -215 }, { x: -62, y: 0 }, { x: 62, y: 0 }, { x: 84, y: -215 }], false);
        brilho(-62, -190, 120);
        break;
      case 'limao': // limão
        g.fillStyle(fill, 1);
        g.fillEllipse(0, -80, 220, 150);
        g.fillTriangle(-110, -80, -128, -92, -112, -66);
        g.fillTriangle(110, -80, 128, -92, 112, -66);
        g.lineStyle(8, hex(COLORS.success), 1);
        g.strokeEllipse(0, -80, 220, 150);
        g.fillStyle(hex(COLORS.success), 1);
        g.fillEllipse(24, -170, 64, 30);
        g.fillStyle(0xffffff, 0.35);
        g.fillEllipse(-50, -110, 60, 26);
        break;
      case 'lata': // lata de produto forte
        corpo(-76, -235, 152, 235, 16);
        g.fillStyle(neon, 1);
        g.fillRoundedRect(-80, -252, 160, 24, 8);
        g.fillStyle(0x1e2222, 0.85);
        for (let k = -2; k < 3; k++) g.fillTriangle(-70 + k * 30, -90, -50 + k * 30, -90, -60 + k * 30, -150);
        brilho(-62, -215, 150);
        break;
      default: // garrafa genérica
        corpo(-62, -200, 124, 200, 30);
        corpo(-26, -262, 52, 68, 8);
        tampa(-32, -284, 64, 26);
        rotulo(-42, -150, 84, 80);
    }
  }

  makeProduct(id, x) {
    const p = PRODUTOS[id] || { nome: id };
    const cor = p.cor || FALLBACK_COLORS[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % FALLBACK_COLORS.length];
    const fill = typeof cor === 'string' && cor.startsWith('#') ? parseInt(cor.slice(1), 16) : hex(COLORS[cor] || COLORS.cyan);
    const c = this.add.container(x, SHELF_Y).setDepth(8);
    const g = this.add.graphics();
    this.drawProduto(g, p.forma, fill);
    c.add(g);
    // Rótulo grande (44 px em 1080p), legível de longe
    c.add(T(this, 0, 52, p.nome, 'h3', { fontSize: '44px', wordWrap: { width: 470 }, align: 'center', origin: [0.5, 0], stroke: COLORS.bg, strokeThickness: 6 }));
    return c;
  }

  // ---------- Rodadas ----------
  // "Sacola" embaralhada: todos os pares liberados saem uma vez antes de repetir, e nunca um dos últimos 6.
  pickPair(unlocked) {
    const pool = MISTURAS.slice(0, Math.min(unlocked, MISTURAS.length));
    if (pool.length > this.poolSize) {
      // subiu de nível: os pares novos entram já na sacola atual
      const novos = pool.slice(this.poolSize).filter((p) => !this.bag.includes(p));
      this.bag = Phaser.Utils.Array.Shuffle([...this.bag, ...novos]);
      this.poolSize = pool.length;
    }
    if (!this.bag.length) this.bag = Phaser.Utils.Array.Shuffle([...pool]);
    const memoria = Math.min(6, Math.max(0, pool.length - 2));
    let idx = this.bag.length - 1;
    for (let i = this.bag.length - 1; i >= 0; i--) {
      if (!this.recent.includes(this.bag[i])) {
        idx = i;
        break;
      }
    }
    const [pair] = this.bag.splice(idx, 1);
    this.recent.push(pair);
    if (this.recent.length > memoria) this.recent.shift();
    this.lastPair = pair;
    return pair;
  }

  nextRound() {
    this.items.forEach((o) => o.destroy());
    const p = mixParams(this.correct, this.elapsed, this.maxTime);
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
    if (choice !== null) this.answers++;
    const correct = choice !== null && (choice === 'danger') === pair.perigosa;
    const [l, r] = this.items;

    if (correct) {
      this.correct++;
      this.streak++;
      const mult = Math.min(MIX_COMBO_MAX, 1 + Math.floor(this.streak / 3));
      this.points += mult;
      this.scoreText.setText(String(scaleScore('misturar', this.points)));
      this.tweens.add({ targets: this.scoreText, scale: 1.25, duration: 90, yoyo: true });
      sfx.play('point');
      floatText(this, 960, 470, `+${scaleScore('misturar', mult)}`, COLORS.neon, 'display');
      this.question.setText(pair.perigosa ? 'PERIGOSO!' : 'SEGURO!').setColor(pair.perigosa ? COLORS.danger : COLORS.neon);
      this.plus.setText(pair.perigosa ? '✕' : '✓').setColor(pair.perigosa ? COLORS.danger : COLORS.neon);
      if (!this.fxReduced) burst(this, 960, 520, 10);
      this.tweens.add({ targets: l, x: LEFT_X + 70, duration: 160, yoyo: true });
      this.tweens.add({ targets: r, x: RIGHT_X - 70, duration: 160, yoyo: true });
      this.kemi.setTexture(kemiKey(this, Math.random() < 0.5 ? 'happy' : 'wink'));
      this.tweens.add({ targets: this.kemi, y: this.kemiY - 40, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
      this.comboText.setText(Math.min(MIX_COMBO_MAX, 1 + Math.floor(this.streak / 3)) > 1 ? `COMBO x${Math.min(MIX_COMBO_MAX, 1 + Math.floor(this.streak / 3))}` : '');
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
    const lvl = mixParams(this.correct, this.elapsed, this.maxTime).level;
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
        points: scaleScore('misturar', this.points),
        durationMs: Math.round(this.elapsed),
        reason,
        acted: this.answers >= 1,
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
