import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, kemiKey, fitImage, floatText, burst, reduceFx, glowKemi } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getSettings } from '../core/Storage.js';
import { LIVES, W, H } from '../config/game.js';
import { runnerParams, scaleScore, RUNNER_PT_DIST, RUNNER_PT_BOLHA, RUNNER_PT_OBSTACULO, RUNNER_PHYSICS, RUNNER_OBSTACLES, RUNNER_CLUSTER_SPAN, RUNNER_LEVELS } from '../config/difficulty.js';

const GROUND = 900; // topo da prateleira
const KX = 420; // posição horizontal da Kemi
const STAND_H = 130; // altura da caixa de colisão em pé (o desenho tem 180: perdoa)
const DUCK_H = 62; // abaixada (precisa ficar abaixo da nuvem baixa, que começa a 81 px do chão)
const HALF_W = 40;
const INVULN_MS = 1500;
const SPAWN_X = 2050;
const CLOUD_Y = GROUND - 98; // a nuvem ocupa de 71 a 125 px acima do chão // nuvem baixa: passa por baixo se abaixar, ou por cima se pular
const { gravity: G, jump: JUMP, cutJump: CUT } = RUNNER_PHYSICS;
const { low: LOW_H, tall: TALL_H, bottleW, tallW, clusterGap } = RUNNER_OBSTACLES;
const rand = (a, b) => a + Math.random() * (b - a);

// Kemi Runner (estilo "dino runner"): a Kemi corre na prateleira. Botão = pular (segurar = mais alto), ↓ = abaixar.
// Pontos = distância/40 + 25 por bolhinha. O espaçamento entre obstáculos é calculado pela física do pulo (ver difficulty.js).
export default class RunnerGame extends BaseScene {
  constructor() {
    super('RunnerGame');
  }

  create() {
    this.begin();
    const cfg = getSettings();
    this.maxTime = cfg.maxTimeMs;
    this.fxReduced = reduceFx();
    addBackground(this);
    this.bubbles = new BubbleField(this, 18);

    // Prateleira com marcas que correm
    const floor = this.add.graphics().setDepth(5);
    floor.fillStyle(hex(COLORS.elevated), 1);
    floor.fillRect(0, GROUND, W, H - GROUND);
    floor.lineStyle(8, hex(COLORS.neon), 1);
    floor.lineBetween(0, GROUND, W, GROUND);
    this.ticks = [];
    for (let i = 0; i < 14; i++) this.ticks.push(this.add.rectangle(i * 160, GROUND + 48, 70, 8, hex(COLORS.elevated2)).setDepth(6));

    // Estado
    this.points = 0;
    this.dist = 0;
    this.bubblesGot = 0;
    this.passedPts = 0;
    this.lives = LIVES;
    this.actions = 0; // pulos e agachadas do jogador (o 1º pulo é o que inicia a corrida)
    this.elapsed = 0;
    this.speed = RUNNER_LEVELS[0].speed;
    this.level = 0;
    this.feet = GROUND; // posição dos pés (y)
    this.vy = 0;
    this.onGround = true;
    this.cut = false;
    this.jumpBuf = -999;
    this.invUntil = 0;
    this.started = false;
    this.ended = false;
    this.paused = false;
    this.obstacles = [];
    this.pickups = [];
    this.lastEdge = 0;
    this.hadPad = input.padConnected;

    // Kemi (âncora nos pés, para agachar e esticar a partir do chão)
    this.kemi = this.add.image(KX, GROUND, kemiKey(this)).setOrigin(0.5, 1).setDepth(10);
    fitImage(this.kemi, 180);
    glowKemi(this.kemi);

    // HUD
    this.scoreText = T(this, 960, 70, '0', 'display', { depth: 20, stroke: COLORS.bg, strokeThickness: 8 });
    this.lifeIcons = [];
    for (let i = 0; i < LIVES; i++) this.lifeIcons.push(this.add.image(80 + i * 78, 70, 'pickup').setScale(0.75).setDepth(20));
    this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.card)).setOrigin(1, 0.5).setDepth(20);
    this.timeBar = this.add.rectangle(W - 60, 70, 360, 22, hex(COLORS.neon)).setOrigin(1, 0.5).setDepth(21);
    T(this, W - 60, 112, 'TEMPO', 'caption', { origin: [1, 0.5], color: COLORS.sky2, depth: 20 });
    this.startHint = T(this, 960, 520, 'Aperte ESPAÇO ou ✕ para correr', 'h2', { color: COLORS.white, depth: 30, stroke: COLORS.bg, strokeThickness: 8 });
    this.startHint2 = T(this, 960, 600, 'Segure para pular mais alto  ·  ↓ para abaixar', 'bodyL', { color: COLORS.mint2, depth: 30, stroke: COLORS.bg, strokeThickness: 6 });
    if (!this.fxReduced) this.tweens.add({ targets: this.startHint, alpha: 0.4, duration: 650, yoyo: true, repeat: -1 });

    // Pausa
    this.pauseUI = this.add.container(0, 0).setDepth(50).setVisible(false);
    this.pauseUI.add(this.add.rectangle(960, 540, W, H, 0x000000, 0.7));
    this.pauseTitle = T(this, 960, 450, 'PAUSA', 'display', { color: COLORS.neon });
    this.pauseUI.add(this.pauseTitle);
    this.pauseUI.add(T(this, 960, 600, 'Ação: continuar     Voltar: sair', 'h3', { color: COLORS.white }));
  }

  // ---------- Obstáculos (desenhados em código) ----------
  drawBottle(g, w, h) {
    const bodyH = h * 0.74;
    g.fillStyle(hex(COLORS.elevated2), 0.95);
    g.fillRect(-w * 0.2, -h, w * 0.4, h * 0.3);
    g.lineStyle(6, hex(COLORS.sky), 1);
    g.strokeRect(-w * 0.2, -h, w * 0.4, h * 0.3);
    g.fillRoundedRect(-w / 2, -bodyH, w, bodyH, 18);
    g.strokeRoundedRect(-w / 2, -bodyH, w, bodyH, 18);
    g.fillStyle(hex(COLORS.cyan), 0.3);
    g.fillRoundedRect(-w / 2 + 12, -bodyH * 0.72, w - 24, bodyH * 0.38, 10);
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(-w / 2 + 8, -bodyH + 10, 9, bodyH * 0.5, 4);
    g.fillStyle(hex(COLORS.neon), 1);
    g.fillRoundedRect(-w * 0.28, -h - 12, w * 0.56, 14, 5);
  }

  addBottle(cx, w, h) {
    const g = this.add.graphics().setDepth(7).setPosition(cx, GROUND);
    this.drawBottle(g, w, h);
    this.obstacles.push({ x: cx, w, h, y: GROUND, gfx: g, kind: 'bottle' });
  }

  addCloud(cx) {
    const s = this.add.image(cx, CLOUD_Y, 'vapor').setDepth(7).setDisplaySize(160, 106);
    this.obstacles.push({ x: cx, w: 120, h: 54, y: CLOUD_Y + 27, gfx: s, kind: 'cloud', baseY: CLOUD_Y });
  }

  // Cria um grupo de obstáculos. Devolve a largura total.
  spawnGroup(p, lead) {
    const r = Math.random();
    let width;
    if (r < p.vapor) {
      width = 120;
      this.addCloud(lead + width / 2);
    } else if (r < p.vapor + p.cluster && RUNNER_CLUSTER_SPAN <= 0.42 * p.speed) {
      // dois frascos baixos juntos: cabem num único pulo
      width = RUNNER_CLUSTER_SPAN;
      this.addBottle(lead + bottleW / 2, bottleW, LOW_H);
      this.addBottle(lead + width - bottleW / 2, bottleW, LOW_H);
    } else if (Math.random() < p.tall) {
      width = tallW;
      this.addBottle(lead + width / 2, tallW, TALL_H);
    } else {
      width = bottleW;
      this.addBottle(lead + width / 2, bottleW, LOW_H);
    }
    return width;
  }

  spawnNext(p) {
    // O vazio entre grupos é medido em SEGUNDOS na velocidade atual (com folga para a velocidade subir)
    const gapPx = (this.speed + 60) * rand(p.gapMin, p.gapMax);
    const lead = Math.max(SPAWN_X, this.lastEdge + gapPx);
    const width = this.spawnGroup(p, lead);
    // bolhinha no meio do vazio (baixa ou alta, para quem pula)
    if (this.lastEdge > 0 && Math.random() < 0.55) {
      const x = lead - gapPx / 2;
      const y = GROUND - (Math.random() < 0.5 ? 70 : rand(150, 200));
      const s = this.add.image(x, y, 'pickup').setDepth(8).setScale(0.8);
      this.tweens.add({ targets: s, scale: 0.95, duration: 450, yoyo: true, repeat: -1 });
      this.pickups.push({ s, x, y });
    }
    this.lastEdge = lead + width;
  }

  // ---------- Ações ----------
  jump() {
    this.actions++;
    this.vy = -JUMP;
    this.onGround = false;
    this.cut = false;
    sfx.play('flap');
    this.tweens.killTweensOf(this.kemi);
    const b = this.kemi.baseScale;
    this.kemi.setScale(b * 0.86, b * 1.18);
    this.tweens.add({ targets: this.kemi, scaleX: b, scaleY: b, duration: 200, ease: 'Back.easeOut' });
  }

  addPoints(n, x, y, color) {
    this.points += n;
    this.scoreText.setText(String(scaleScore('runner', this.points)));
    if (x !== undefined) floatText(this, x, y, `+${scaleScore('runner', n)}`, color);
  }

  hit() {
    this.lives--;
    sfx.play('hit');
    this.cameras.main.shake(this.fxReduced ? 0 : 220, 0.006);
    burst(this, KX, this.feet - 60, 12);
    this.invUntil = this.elapsed + INVULN_MS;
    this.lifeIcons.forEach((ic, i) => ic.setAlpha(i < this.lives ? 1 : 0.2));
    this.kemi.setTexture(kemiKey(this, 'down'));
    this.time.delayedCall(500, () => !this.ended && this.kemi.setTexture(kemiKey(this)));
    if (this.lives <= 0) this.finish('lives');
  }

  finish(reason) {
    if (this.ended) return;
    this.ended = true;
    sfx.play('end');
    burst(this, KX, this.feet - 60, 24);
    this.kemi.setVisible(false);
    this.time.delayedCall(900, () =>
      this.scene.start('GameOver', { game: 'runner', points: scaleScore('runner', this.points), durationMs: Math.round(this.elapsed), reason, acted: this.actions >= 2 })
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

    const pressJump = this.ready() && (input.pressed('action') || input.pressed('up'));
    const holdJump = input.held('action') || input.held('up');
    const ducking = input.held('down') && this.onGround;
    if (ducking) this.actions += 2; // agachar já mostra que a pessoa está jogando

    if (!this.started) {
      if (pressJump) {
        this.started = true;
        this.startHint.destroy();
        this.startHint2.destroy();
        this.lastEdge = 0;
        this.spawnNext({ ...RUNNER_LEVELS[0], speed: 520, vapor: 0, cluster: 0, tall: 0 }); // 1º obstáculo: sempre um frasco baixo
        this.jump();
      }
      return;
    }

    const dt = Math.min(delta, 50) / 1000;
    this.elapsed += delta;
    const p = runnerParams(this.points, this.elapsed, this.maxTime);
    if (p.level > this.level) {
      this.level = p.level;
      sfx.play('level');
      const t = T(this, 960, 300, `NÍVEL ${p.level + 1}`, 'display', { color: COLORS.cyanLight, depth: 40, stroke: COLORS.bg, strokeThickness: 10 });
      this.tweens.add({ targets: t, alpha: 0, y: 250, duration: 1100, onComplete: () => t.destroy() });
    }
    this.speed += (p.speed - this.speed) * Math.min(1, dt * 1.5);

    // Pulo: botão (com "buffer" de 110 ms antes de pousar); soltar cedo corta o pulo
    if (pressJump) this.jumpBuf = this.elapsed;
    if (this.onGround && this.elapsed - this.jumpBuf < 110) {
      this.jumpBuf = -999;
      this.jump();
    }
    if (!this.onGround) {
      this.vy += G * dt + (input.held('down') ? 4200 * dt : 0); // ↓ no ar: cai mais rápido
      if (!holdJump && !this.cut && this.vy < -CUT) {
        this.vy = -CUT;
        this.cut = true;
      }
      this.feet += this.vy * dt;
      if (this.feet >= GROUND) {
        this.feet = GROUND;
        this.vy = 0;
        this.onGround = true;
        const b = this.kemi.baseScale;
        this.kemi.setScale(b * 1.15, b * 0.85);
        this.tweens.add({ targets: this.kemi, scaleX: b, scaleY: b, duration: 160 });
      }
    }
    this.kemi.y = this.feet;
    this.kemi.rotation = this.onGround ? 0 : Phaser.Math.Clamp(this.vy / 6000, -0.15, 0.2);
    // Abaixar: achata (só no chão e fora das animações de pulo/pouso)
    if (this.onGround && !this.tweens.isTweening(this.kemi)) {
      const b = this.kemi.baseScale;
      this.kemi.setScale(ducking ? b * 1.12 : b + Math.sin(this.time.now / 90) * b * 0.02, ducking ? b * 0.58 : b - Math.sin(this.time.now / 90) * b * 0.02);
    }

    const inv = this.elapsed < this.invUntil;
    const kTop = this.feet - (ducking ? DUCK_H : STAND_H);

    // Mundo
    const dx = this.speed * dt;
    this.dist += dx;
    this.lastEdge -= dx;
    for (const t of this.ticks) {
      t.x -= dx;
      if (t.x < -80) t.x += 14 * 160;
    }
    if (this.lastEdge + (this.speed + 60) * p.gapMin <= SPAWN_X) this.spawnNext(p);

    for (const o of this.obstacles) {
      o.x -= dx;
      o.gfx.x = o.x;
      if (o.kind === 'cloud') o.gfx.y = o.baseY + Math.sin(this.time.now / 260 + o.x) * 6;
      if (!inv) {
        // caixa do obstáculo (encolhida 8 px) contra a caixa da Kemi
        const oL = o.x - o.w / 2 + 8;
        const oR = o.x + o.w / 2 - 8;
        const oT = o.y - o.h + 8;
        const oB = o.y - 4;
        if (KX + HALF_W > oL && KX - HALF_W < oR && this.feet - 6 > oT && kTop < oB) {
          o.hitSeen = true;
          this.hit();
          if (this.ended) return;
          break;
        }
      }
    }
    this.obstacles = this.obstacles.filter((o) => {
      if (o.x < -250) {
        o.gfx.destroy();
        return false;
      }
      return true;
    });

    // Bolhinhas
    for (const pk of this.pickups) {
      pk.x -= dx;
      pk.s.x = pk.x;
      if (!pk.got && Math.abs(pk.x - KX) < 60 && pk.y > kTop - 40 && pk.y < this.feet + 10) {
        pk.got = true;
        pk.s.destroy();
        this.bubblesGot++;
        sfx.play('bonus');
        this.kemi.setTexture(kemiKey(this, 'happy'));
        this.time.delayedCall(450, () => !this.ended && this.kemi.setTexture(kemiKey(this)));
        this.addPoints(RUNNER_PT_BOLHA, pk.x, pk.y - 40, COLORS.cyanLight);
        burst(this, pk.x, pk.y, 8);
      }
    }
    this.pickups = this.pickups.filter((pk) => {
      if (!pk.got && pk.x < -100) {
        pk.s.destroy();
        return false;
      }
      return !pk.got;
    });

    // Pontos por distância
    // Obstáculo superado (passou pela Kemi sem bater) vale pontos; a distância pesa pouco
    for (const o of this.obstacles) {
      if (!o.passed && o.x + o.w / 2 < KX - HALF_W) {
        o.passed = true;
        if (!o.hitSeen) this.passedPts += RUNNER_PT_OBSTACULO;
      }
    }
    const dpts = Math.floor(this.dist / RUNNER_PT_DIST) + this.bubblesGot * RUNNER_PT_BOLHA + this.passedPts;
    if (dpts !== this.points) {
      this.points = dpts;
      this.scoreText.setText(String(scaleScore('runner', dpts)));
    }

    this.kemi.alpha = inv ? (this.fxReduced ? 0.55 : Math.floor(this.elapsed / 100) % 2 ? 0.3 : 1) : 1;
    const frac = Phaser.Math.Clamp(1 - this.elapsed / this.maxTime, 0, 1);
    this.timeBar.width = 360 * frac;
    this.timeBar.fillColor = hex(frac < 0.125 ? COLORS.danger : COLORS.neon);
    if (this.elapsed >= this.maxTime) this.finish('time');
  }
}
