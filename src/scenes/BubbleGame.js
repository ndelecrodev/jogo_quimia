import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, kemiKey, fitImage, floatText, burst, reduceFx } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getSettings } from '../core/Storage.js';
import { LIVES, W, H } from '../config/game.js';
import { BUBBLE_LEVELS, bubbleParams } from '../config/difficulty.js';

// ---- Constantes de física/visual (1080p) ----
const FLOOR_Y = 1010; // topo da "prateleira" (chão)
const KEMI_X = 560;
const KEMI_R = 40; // raio de colisão (um pouco menor que o sprite: perdoa)
const GRAV = 1900;
const FLAP = -640;
const BODY_W = 150; // corpo do frasco
const NECK_W = 76;
const NECK_LEN = 90;
const CAP_H = 24;
const INVULN_MS = 1500;

// Colisão círculo × retângulo.
function circleRect(cx, cy, r, rx, ry, rw, rh) {
  if (rw <= 0 || rh <= 0) return false;
  const nx = Phaser.Math.Clamp(cx, rx, rx + rw);
  const ny = Phaser.Math.Clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// Kemi Bolha (estilo "flappy"): aperte para subir, passe pelo vão entre os frascos.
export default class BubbleGame extends BaseScene {
  constructor() {
    super('BubbleGame');
  }

  create() {
    this.begin();
    const cfg = getSettings();
    this.maxTime = cfg.maxTimeMs;
    this.fxReduced = reduceFx();

    addBackground(this);
    this.bubbles = new BubbleField(this, 18);

    // Chão = prateleira
    const floor = this.add.graphics().setDepth(5);
    floor.fillStyle(hex(COLORS.elevated), 1);
    floor.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    floor.lineStyle(8, hex(COLORS.neon), 1);
    floor.lineBetween(0, FLOOR_Y, W, FLOOR_Y);

    // Estado
    this.points = 0;
    this.lives = LIVES;
    this.elapsed = 0;
    this.vy = 0;
    this.speed = BUBBLE_LEVELS[0].speed;
    this.level = 0;
    this.started = false;
    this.ended = false;
    this.paused = false;
    this.invUntil = 0;
    this.pipes = [];
    this.pickups = [];
    this.lastCenter = 540;
    this.hadPad = input.padConnected;

    // Kemi
    this.kemi = fitImage(this.add.image(KEMI_X, 540, kemiKey(this)).setDepth(10), 135);

    // HUD
    this.scoreText = T(this, 960, 70, '0', 'display', { depth: 20, stroke: COLORS.bg, strokeThickness: 8 });
    this.lifeIcons = [];
    for (let i = 0; i < LIVES; i++) {
      this.lifeIcons.push(this.add.image(80 + i * 78, 70, 'pickup').setScale(0.75).setDepth(20));
    }
    this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.card)).setOrigin(1, 0.5).setDepth(20);
    this.timeBar = this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.neon)).setOrigin(1, 0.5).setDepth(21);
    T(this, W - 60, 112, 'TEMPO', 'caption', { origin: [1, 0.5], color: COLORS.sky2, depth: 20 });
    this.startHint = T(this, 960, 800, 'Aperte ESPAÇO ou ✕ para começar', 'h2', { color: COLORS.white, depth: 20, stroke: COLORS.bg, strokeThickness: 8 });
    if (!this.fxReduced) this.tweens.add({ targets: this.startHint, alpha: 0.4, duration: 650, yoyo: true, repeat: -1 });

    // Pausa
    this.pauseUI = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.pauseUI.add(this.add.rectangle(960, 540, W, H, 0x000000, 0.7));
    this.pauseTitle = T(this, 960, 450, 'PAUSA', 'display', { color: COLORS.neon });
    this.pauseUI.add(this.pauseTitle);
    this.pauseUI.add(T(this, 960, 600, 'Ação: continuar     Voltar: sair', 'h3', { color: COLORS.white }));
  }

  // ---------- Frascos (desenhados em código) ----------
  drawBottle(g, length) {
    // origem na borda do vão, estendendo para +y
    const top = NECK_LEN - 6;
    g.fillStyle(hex(COLORS.elevated2), 0.95);
    g.fillRect(-NECK_W / 2, CAP_H, NECK_W, NECK_LEN - CAP_H + 20);
    g.lineStyle(8, hex(COLORS.sky), 1);
    g.strokeRect(-NECK_W / 2, CAP_H, NECK_W, NECK_LEN - CAP_H + 20);
    g.fillStyle(hex(COLORS.elevated2), 0.95);
    g.fillRoundedRect(-BODY_W / 2, top, BODY_W, length - top, 30);
    if (length - top > 200) {
      g.fillStyle(hex(COLORS.cyan), 0.35);
      g.fillRoundedRect(-BODY_W / 2 + 20, top + 60, BODY_W - 40, Math.min(150, length - top - 100), 18);
    }
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(-BODY_W / 2 + 14, top + 16, 16, Math.max(40, length - top - 60), 8);
    g.lineStyle(8, hex(COLORS.sky), 1);
    g.strokeRoundedRect(-BODY_W / 2, top, BODY_W, length - top, 30);
    g.fillStyle(hex(COLORS.neon), 1);
    g.fillRoundedRect(-(NECK_W + 16) / 2, 0, NECK_W + 16, CAP_H, 8);
  }

  spawnPipe(p, x) {
    const half = p.gap / 2;
    const lo = half + 160;
    const hi = FLOOR_Y - half - 160;
    const center = Phaser.Math.Clamp(this.lastCenter + Phaser.Math.Between(-p.maxDelta, p.maxDelta), lo, hi);
    this.lastCenter = center;
    const gt = center - half;
    const gb = center + half;

    const top = this.add.graphics().setDepth(6);
    this.drawBottle(top, gt + 20);
    top.setPosition(x, gt).setScale(1, -1);
    const bot = this.add.graphics().setDepth(6);
    this.drawBottle(bot, FLOOR_Y - gb + 20);
    bot.setPosition(x, gb);

    const pipe = { x, center, gap: p.gap, passed: false, top, bot };
    this.pipes.push(pipe);

    if (Math.random() < 0.4) {
      const s = this.add.image(x, center, 'pickup').setDepth(8);
      this.tweens.add({ targets: s, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
      this.pickups.push({ s, x, y: center });
    }
  }

  pipeRects(pipe) {
    const gt = pipe.center - pipe.gap / 2;
    const gb = pipe.center + pipe.gap / 2;
    const nw = NECK_W + 8;
    return [
      [pipe.x - nw / 2, gt - NECK_LEN, nw, NECK_LEN],
      [pipe.x - BODY_W / 2, 0, BODY_W, gt - NECK_LEN],
      [pipe.x - nw / 2, gb, nw, NECK_LEN],
      [pipe.x - BODY_W / 2, gb + NECK_LEN, BODY_W, FLOOR_Y - (gb + NECK_LEN)],
    ];
  }

  // ---------- Ações ----------
  doFlap() {
    this.vy = FLAP;
    sfx.play('flap');
    this.tweens.killTweensOf(this.kemi);
    const b = this.kemi.baseScale;
    this.kemi.setScale(b * 0.88, b * 1.15); // squash & stretch
    this.tweens.add({ targets: this.kemi, scaleX: b, scaleY: b, duration: 220, ease: 'Back.easeOut' });
  }

  addScore(n, x, y) {
    this.points += n;
    this.scoreText.setText(String(this.points));
    this.tweens.add({ targets: this.scoreText, scale: 1.25, duration: 90, yoyo: true });
    floatText(this, x, y, `+${n}`, n > 1 ? COLORS.cyanLight : COLORS.neon);
    if (!this.fxReduced) burst(this, x, y, n > 1 ? 14 : 6);
  }

  hit(kind) {
    this.lives--;
    sfx.play('hit');
    this.cameras.main.shake(this.fxReduced ? 0 : 220, 0.006);
    burst(this, KEMI_X, this.kemi.y, 12);
    this.invUntil = this.elapsed + INVULN_MS;
    if (kind === 'floor') this.vy = -760;
    this.lifeIcons.forEach((ic, i) => ic.setAlpha(i < this.lives ? 1 : 0.2));
    if (this.lives <= 0) this.finish('lives');
  }

  finish(reason) {
    if (this.ended) return;
    this.ended = true;
    sfx.play('end');
    burst(this, KEMI_X, this.kemi.y, 24);
    this.kemi.setVisible(false);
    this.time.delayedCall(900, () =>
      this.scene.start('GameOver', { game: 'bolha', points: this.points, durationMs: Math.round(this.elapsed), reason })
    );
  }

  setPause(on, title = 'PAUSA') {
    this.paused = on;
    this.pauseTitle.setText(title);
    this.pauseUI.setVisible(on);
  }

  levelBanner(n) {
    sfx.play('level');
    const t = T(this, 960, 300, `NÍVEL ${n + 1}`, 'display', { color: COLORS.cyanLight, depth: 40, stroke: COLORS.bg, strokeThickness: 10 });
    this.tweens.add({ targets: t, alpha: 0, y: 250, duration: 1100, onComplete: () => t.destroy() });
  }

  // ---------- Loop ----------
  update(_, delta) {
    this.bubbles.update(delta);
    if (this.ended) return;

    // Controle desconectou durante o jogo → pausa
    if (this.hadPad && !input.padConnected && !this.paused) this.setPause(true, 'CONTROLE DESCONECTADO');
    this.hadPad = input.padConnected;

    if (this.ready()) {
      if (this.paused) {
        if (input.pressed('action') || input.pressed('pause')) this.setPause(false);
        else if (input.pressed('back')) this.scene.start(this.registry.get('solo') ? 'Attract' : 'Hub');
        return;
      }
      if (this.started && (input.pressed('pause') || input.pressed('back'))) {
        this.setPause(true);
        return;
      }
    }

    const flap = this.ready() && (input.pressed('action') || input.pressed('up'));

    if (!this.started) {
      this.kemi.y = 540 + Math.sin(this.time.now / 300) * 14;
      if (flap) {
        this.started = true;
        this.startHint.destroy();
        this.spawnPipe(BUBBLE_LEVELS[0], 1700);
        this.doFlap();
      }
      return;
    }

    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += delta;

    // Dificuldade por pontos (+ pressão perto do teto de tempo)
    const p = bubbleParams(this.points, this.elapsed, this.maxTime);
    if (p.level > this.level) {
      this.level = p.level;
      this.levelBanner(p.level);
    }
    this.speed += (p.speed - this.speed) * Math.min(1, dt * 2);

    // Kemi
    if (flap) this.doFlap();
    this.vy += GRAV * dt;
    this.kemi.y += this.vy * dt;
    this.kemi.rotation = Phaser.Math.Clamp(this.vy / 1800, -0.3, 0.45);
    if (this.kemi.y < KEMI_R) {
      this.kemi.y = KEMI_R;
      this.vy = 0;
    }
    const inv = this.elapsed < this.invUntil;
    if (this.kemi.y > FLOOR_Y - KEMI_R) {
      this.kemi.y = FLOOR_Y - KEMI_R;
      if (!inv) this.hit('floor');
      else this.vy = -500;
    }
    this.kemi.alpha = inv ? (this.fxReduced ? 0.55 : Math.floor(this.elapsed / 100) % 2 ? 0.3 : 1) : 1;

    // Spawn de frascos
    const last = this.pipes[this.pipes.length - 1];
    if (!last || last.x + p.spacing <= 2100) this.spawnPipe(p, last ? Math.max(2100, last.x + p.spacing) : 1700);

    // Mover e colidir
    const dx = this.speed * dt;
    for (const pipe of this.pipes) {
      pipe.x -= dx;
      pipe.top.x = pipe.x;
      pipe.bot.x = pipe.x;
      if (!inv && Math.abs(pipe.x - KEMI_X) < BODY_W / 2 + KEMI_R) {
        const r = KEMI_R - 4;
        if (this.pipeRects(pipe).some((q) => circleRect(KEMI_X, this.kemi.y, r, ...q))) {
          this.hit('pipe');
          break;
        }
      }
      if (!pipe.passed && pipe.x + BODY_W / 2 < KEMI_X - KEMI_R) {
        pipe.passed = true;
        sfx.play('point');
        this.addScore(1, KEMI_X + 80, this.kemi.y - 60);
      }
    }
    this.pipes = this.pipes.filter((pp) => {
      if (pp.x < -200) {
        pp.top.destroy();
        pp.bot.destroy();
        return false;
      }
      return true;
    });

    // Bolhinhas coletáveis
    for (const pk of this.pickups) {
      pk.x -= dx;
      pk.s.x = pk.x;
      if (!pk.got && Phaser.Math.Distance.Between(pk.x, pk.y, KEMI_X, this.kemi.y) < 70) {
        pk.got = true;
        pk.s.destroy();
        sfx.play('bonus');
        this.addScore(2, pk.x, pk.y);
      }
    }
    this.pickups = this.pickups.filter((pk) => {
      if (!pk.got && pk.x < -100) {
        pk.s.destroy();
        return false;
      }
      return !pk.got;
    });

    // Barra de tempo e fim por tempo
    const frac = Phaser.Math.Clamp(1 - this.elapsed / this.maxTime, 0, 1);
    this.timeBar.width = 360 * frac;
    this.timeBar.fillColor = hex(frac < 0.125 ? COLORS.danger : COLORS.neon);
    if (this.elapsed >= this.maxTime) this.finish('time');
  }
}
