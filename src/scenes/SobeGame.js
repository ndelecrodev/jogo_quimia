import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, kemiKey, fitImage, floatText, burst, reduceFx, glowKemi } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getSettings } from '../core/Storage.js';
import { LIVES, W, H } from '../config/game.js';
import { sobeParams, SOBE_PHYSICS } from '../config/difficulty.js';

const KR = 66; // raio de colisão da Kemi (o desenho tem ~95: perdoa)
const SCROLL_Y = 420; // quando a Kemi passa daqui, o mundo desce
const PLAT_H = 28;
const INVULN_MS = 2000; // também vale ao começar e ao renascer
const STUCK_MS = 6000; // sem subir por tanto tempo: aparece uma prateleira de ajuda
const BOOST_MS = 1000;
const BOOST_VY = -1900;
const { gravity: G, bounce: BOUNCE, speedX: SPEED_X } = SOBE_PHYSICS;
const rand = (a, b) => Phaser.Math.Between(a, b);

// Kemi Sobe (estilo "doodle jump"): a Kemi quica sozinha de prateleira em prateleira; você só move ← →.
// Pontos = altura / 10. Sempre existe uma prateleira segura (normal ou que anda) por linha: o caminho nunca fecha.
export default class SobeGame extends BaseScene {
  constructor() {
    super('SobeGame');
  }

  create() {
    this.begin();
    const cfg = getSettings();
    this.maxTime = cfg.maxTimeMs;
    this.fxReduced = reduceFx();
    addBackground(this);
    this.bubbles = new BubbleField(this, 18);

    // Estado
    this.points = 0;
    this.height = 0;
    this.lives = LIVES;
    this.moved = false; // o jogador mexeu a Kemi pelo menos uma vez?
    this.elapsed = 0;
    this.vy = 0;
    this.vx = 0;
    this.level = 0;
    this.boost = 0;
    this.shield = false;
    this.invUntil = 0;
    this.bestHeight = 0;
    this.lastClimb = 0;
    this.started = false;
    this.ended = false;
    this.paused = false;
    this.plats = [];
    this.clouds = [];
    this.pups = [];
    this.hadPad = input.padConnected;

    // Primeira prateleira (larga, sob a Kemi) e linhas acima
    this.nextRowY = 960;
    this.lastX = W / 2;
    this.addPlatform(W / 2, 960, 'plat_n', 360);
    this.kemi = glowKemi(fitImage(this.add.image(W / 2, 960 - PLAT_H / 2 - KR, kemiKey(this)).setDepth(10), 190));
    this.fill(sobeParams(0, 0, this.maxTime));

    this.shieldRing = this.add.image(0, 0, 'bg_bubble').setScale(1.5).setAlpha(0.9).setDepth(11).setVisible(false);

    // HUD
    this.scoreText = T(this, 960, 70, '0', 'display', { depth: 20, stroke: COLORS.bg, strokeThickness: 8 });
    this.lifeIcons = [];
    for (let i = 0; i < LIVES; i++) this.lifeIcons.push(this.add.image(80 + i * 78, 70, 'pickup').setScale(0.75).setDepth(20));
    this.shieldIcon = this.add.image(80, 150, 'pu_shield').setScale(0.6).setDepth(20).setVisible(false);
    this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.card)).setOrigin(1, 0.5).setDepth(20);
    this.timeBar = this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.neon)).setOrigin(1, 0.5).setDepth(21);
    T(this, W - 60, 112, 'TEMPO', 'caption', { origin: [1, 0.5], color: COLORS.sky2, depth: 20 });
    this.startHint = T(this, 960, 600, 'Aperte ← ou → para começar', 'h2', { color: COLORS.white, depth: 30, stroke: COLORS.bg, strokeThickness: 8 });
    if (!this.fxReduced) this.tweens.add({ targets: this.startHint, alpha: 0.4, duration: 650, yoyo: true, repeat: -1 });

    // Pausa
    this.pauseUI = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.pauseUI.add(this.add.rectangle(960, 540, W, H, 0x000000, 0.7));
    this.pauseTitle = T(this, 960, 450, 'PAUSA', 'display', { color: COLORS.neon });
    this.pauseUI.add(this.pauseTitle);
    this.pauseUI.add(T(this, 960, 600, 'Ação: continuar     Voltar: sair', 'h3', { color: COLORS.white }));
  }

  // ---------- Geração ----------
  addPlatform(x, y, key, w) {
    const s = this.add.image(x, y, key).setDisplaySize(w, PLAT_H + 8).setDepth(6);
    const p = { s, key, w, x0: x, dir: Math.random() < 0.5 ? 1 : -1, broken: false };
    this.plats.push(p);
    return p;
  }

  spawnRow(p) {
    const y = this.nextRowY - rand(p.gapMin, p.gapMax);
    this.nextRowY = y;
    const x = Phaser.Math.Clamp(this.lastX + rand(-480, 480), p.w / 2 + 20, W - p.w / 2 - 20);
    this.lastX = x;
    const moving = Math.random() < p.moving;
    this.addPlatform(x, y, moving ? 'plat_m' : 'plat_n', p.w);

    // Chamariz que quebra: só EXTRA, nunca no lugar da prateleira segura
    if (Math.random() < p.breaking) {
      let x2 = rand(p.w / 2 + 20, W - p.w / 2 - 20);
      if (Math.abs(x2 - x) < p.w + 60) x2 = x < W / 2 ? W - p.w / 2 - 40 : p.w / 2 + 40;
      this.addPlatform(x2, y + rand(-20, 20), 'plat_b', p.w);
    }
    // Vapor entre esta linha e a anterior (longe da prateleira segura)
    if (Math.random() < p.cloud) {
      let cx = rand(120, W - 120);
      if (Math.abs(cx - x) < 220) cx = x < W / 2 ? x + 320 : x - 320;
      const s = this.add.image(cx, y + 90, 'vapor').setDepth(7).setAlpha(0.9);
      this.clouds.push({ s, vx: (Math.random() < 0.5 ? -1 : 1) * rand(40, 90) });
    }
    // Power-ups (a partir do nível 2 de altura)
    if (this.height > 600) {
      const r = Math.random();
      if (r < 0.04) this.addPowerup(x, y - 80, 'rocket');
      else if (r < 0.09) this.addPowerup(x, y - 80, 'shield');
    }
  }

  addPowerup(x, y, type) {
    const s = this.add.image(x, y, type === 'rocket' ? 'pu_rocket' : 'pu_shield').setDepth(8);
    this.tweens.add({ targets: s, scale: 1.15, duration: 450, yoyo: true, repeat: -1 });
    this.pups.push({ s, type });
  }

  fill(params) {
    while (this.nextRowY > -250) this.spawnRow(params);
  }

  shiftWorld(dy) {
    this.nextRowY += dy;
    for (const p of this.plats) p.s.y += dy;
    for (const c of this.clouds) c.s.y += dy;
    for (const u of this.pups) u.s.y += dy;
  }

  cull() {
    const keep = (arr, extra = 0) =>
      arr.filter((o) => {
        if (o.s.y > H + 160 + extra) {
          o.s.destroy();
          return false;
        }
        return true;
      });
    this.plats = keep(this.plats);
    this.clouds = keep(this.clouds);
    this.pups = keep(this.pups);
  }

  // ---------- Eventos ----------
  loseLife(kind) {
    this.lives--;
    sfx.play('hit');
    this.cameras.main.shake(this.fxReduced ? 0 : 220, 0.006);
    this.lifeIcons.forEach((ic, i) => ic.setAlpha(i < this.lives ? 1 : 0.2));
    this.invUntil = this.elapsed + INVULN_MS;
    if (this.lives <= 0) return this.finish('lives');
    if (kind === 'fall') this.respawn();
  }

  // Renasce na prateleira segura mais próxima (a mais baixa que está na tela).
  respawn() {
    const cand = this.plats.filter((p) => !p.broken && p.key !== 'plat_b' && p.s.y > 250 && p.s.y < H - 150);
    let target = cand.sort((a, b) => b.s.y - a.s.y)[0];
    if (!target) target = this.addPlatform(W / 2, H - 200, 'plat_n', 300);
    this.kemi.x = target.s.x;
    this.kemi.y = target.s.y - PLAT_H / 2 - KR - 4;
    this.vy = -BOUNCE;
    this.vx = 0;
    this.boost = 0;
  }

  finish(reason) {
    if (this.ended) return;
    this.ended = true;
    sfx.play('end');
    burst(this, this.kemi.x, Math.min(this.kemi.y, H - 100), 24);
    this.kemi.setVisible(false);
    this.shieldRing.setVisible(false);
    this.time.delayedCall(900, () =>
      this.scene.start('GameOver', { game: 'sobe', points: this.points, durationMs: Math.round(this.elapsed), reason, acted: this.moved })
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
      this.kemi.y = 960 - PLAT_H / 2 - KR + Math.sin(this.time.now / 300) * 8;
      if (this.ready() && (input.pressed('action') || input.pressed('left') || input.pressed('right'))) {
        this.started = true;
        this.startHint.destroy();
        this.invUntil = INVULN_MS; // começa protegida
        this.vy = -BOUNCE;
        sfx.play('flap');
      }
      return;
    }

    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += delta;
    const params = sobeParams(this.points, this.elapsed, this.maxTime);
    if (params.level > this.level) {
      this.level = params.level;
      sfx.play('level');
      const t = T(this, 960, 300, `NÍVEL ${params.level + 1}`, 'display', { color: COLORS.cyanLight, depth: 40, stroke: COLORS.bg, strokeThickness: 10 });
      this.tweens.add({ targets: t, alpha: 0, y: 250, duration: 1100, onComplete: () => t.destroy() });
    }

    // Movimento horizontal com wrap lateral
    if (Math.abs(input.axisX()) > 0.1) this.moved = true;
    const target = input.axisX() * SPEED_X;
    this.vx += (target - this.vx) * Math.min(1, dt * 10);
    this.kemi.x += this.vx * dt;
    if (this.kemi.x < -KR) this.kemi.x = W + KR;
    else if (this.kemi.x > W + KR) this.kemi.x = -KR;
    this.kemi.rotation = Phaser.Math.Clamp(this.vx / 2500, -0.25, 0.25);

    // Vertical
    let prevBottom = this.kemi.y + KR;
    if (this.boost > 0) {
      this.boost -= delta;
      this.vy = BOOST_VY;
      if (this.boost <= 0) this.vy = -700;
    } else {
      this.vy += G * dt;
    }
    this.kemi.y += this.vy * dt;

    // O mundo desce quando a Kemi sobe demais
    if (this.kemi.y < SCROLL_Y) {
      const dy = SCROLL_Y - this.kemi.y;
      this.kemi.y = SCROLL_Y;
      prevBottom += dy;
      this.shiftWorld(dy);
      this.height += dy;
      this.fill(params);
      this.cull();
      const pts = Math.floor(this.height / 10);
      if (pts !== this.points) {
        this.points = pts;
        this.scoreText.setText(String(pts));
      }
    }

    // Nunca fica presa: sem subir por STUCK_MS, aparece uma prateleira larga acima dela
    if (this.height > this.bestHeight + 5) {
      this.bestHeight = this.height;
      this.lastClimb = this.elapsed;
    } else if (this.elapsed - this.lastClimb > STUCK_MS) {
      this.addPlatform(Phaser.Math.Clamp(this.kemi.x, 200, W - 200), Math.max(120, this.kemi.y - 210), 'plat_n', 300);
      this.lastClimb = this.elapsed;
    }

    const inv = this.elapsed < this.invUntil;
    const bottom = this.kemi.y + KR;

    // Prateleiras: móveis andam, quebradas caem; aterrissa só descendo
    for (const p of this.plats) {
      if (p.key === 'plat_m' && !p.broken) {
        p.s.x += p.dir * 130 * dt;
        if (Math.abs(p.s.x - p.x0) > 150) p.dir *= -1;
      }
      if (p.broken) {
        p.s.y += 900 * dt;
        p.s.alpha = Math.max(0, p.s.alpha - dt * 1.5);
        continue;
      }
      if (this.vy > 0 && this.boost <= 0) {
        const top = p.s.y - PLAT_H / 2;
        if (prevBottom <= top + 6 && bottom >= top && Math.abs(this.kemi.x - p.s.x) < p.w / 2 + 14) {
          if (p.key === 'plat_b') {
            p.broken = true; // quebra e a Kemi NÃO quica
            sfx.play('error');
          } else {
            this.vy = -BOUNCE;
            sfx.play('flap');
            this.tweens.killTweensOf(this.kemi);
            const b = this.kemi.baseScale;
            this.kemi.setScale(b * 1.15, b * 0.85);
            this.tweens.add({ targets: this.kemi, scaleX: b, scaleY: b, duration: 220, ease: 'Back.easeOut' });
          }
        }
      }
    }

    // Vapores
    for (const c of this.clouds) {
      c.s.x += c.vx * dt;
      if (c.s.x < 100 || c.s.x > W - 100) c.vx *= -1;
      if (!inv && this.boost <= 0 && Phaser.Math.Distance.Between(c.s.x, c.s.y, this.kemi.x, this.kemi.y) < 115) {
        if (this.shield) {
          this.shield = false;
          this.invUntil = this.elapsed + 800;
          sfx.play('hit');
          burst(this, c.s.x, c.s.y, 12);
          c.s.destroy();
          c.dead = true;
        } else {
          this.loseLife('cloud');
          if (this.ended) return;
        }
      }
    }
    this.clouds = this.clouds.filter((c) => !c.dead);

    // Power-ups
    for (const u of this.pups) {
      if (!u.got && Phaser.Math.Distance.Between(u.s.x, u.s.y, this.kemi.x, this.kemi.y) < 90) {
        u.got = true;
        u.s.destroy();
        sfx.play('bonus');
        if (u.type === 'rocket') {
          this.boost = BOOST_MS;
          floatText(this, this.kemi.x, this.kemi.y - 60, 'TAMPINHA-FOGUETE!', COLORS.neon, 'h3');
        } else {
          this.shield = true;
          floatText(this, this.kemi.x, this.kemi.y - 60, 'ESCUDO-FDS!', COLORS.cyanLight, 'h3');
        }
      }
    }
    this.pups = this.pups.filter((u) => !u.got);

    // Cair da tela
    if (this.kemi.y > H + KR * 2) {
      this.loseLife('fall');
      if (this.ended) return;
    }

    // Visual
    this.shieldRing.setVisible(this.shield).setPosition(this.kemi.x, this.kemi.y);
    this.shieldIcon.setVisible(this.shield);
    this.kemi.alpha = inv ? (this.fxReduced ? 0.55 : Math.floor(this.elapsed / 100) % 2 ? 0.3 : 1) : 1;
    if (this.boost > 0) this.kemi.setTint(hex(COLORS.cyanLight));
    else this.kemi.clearTint();

    const frac = Phaser.Math.Clamp(1 - this.elapsed / this.maxTime, 0, 1);
    this.timeBar.width = 360 * frac;
    this.timeBar.fillColor = hex(frac < 0.125 ? COLORS.danger : COLORS.neon);
    if (this.elapsed >= this.maxTime) this.finish('time');
  }
}
