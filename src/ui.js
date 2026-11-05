// Helpers visuais compartilhados entre cenas.
import Phaser from 'phaser';
import { COLORS, hex, ts, RADIUS } from './theme.js';
import { W, H } from './config/game.js';
import { getSettings } from './core/Storage.js';

export const reduceFx = () =>
  getSettings().reduceFlash || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Texto no estilo do UI Kit. extra.origin = [x,y] (padrão centro). */
export function T(scene, x, y, str, kind = 'body', extra = {}) {
  const { origin = [0.5, 0.5], depth, ...style } = extra;
  const t = scene.add.text(x, y, str, ts(kind, style)).setOrigin(origin[0], origin[1]);
  if (depth !== undefined) t.setDepth(depth);
  return t;
}

/** Desenha um card arredondado num Graphics (limpa antes). */
export function drawCard(g, x, y, w, h, { fill = COLORS.card, stroke = COLORS.elevated2, sw = 3, r = RADIUS.card, alpha = 1 } = {}) {
  g.clear();
  g.fillStyle(hex(fill), alpha);
  g.fillRoundedRect(x, y, w, h, r);
  if (sw) {
    g.lineStyle(sw, hex(stroke), 1);
    g.strokeRoundedRect(x, y, w, h, r);
  }
}

/** Fundo verde-petróleo com brilhos neon sutis. */
export function addBackground(scene) {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(hex(COLORS.bg), 1);
  g.fillRect(0, 0, W, H);
  g.fillStyle(hex(COLORS.elevated), 0.35);
  g.fillCircle(240, 120, 520);
  g.fillStyle(hex(COLORS.elevated2), 0.18);
  g.fillCircle(1700, 980, 560);
  return g;
}

/** Bolhas de sabão subindo no fundo. */
export class BubbleField {
  constructor(scene, n = 20) {
    this.items = [];
    for (let i = 0; i < n; i++) {
      const s = scene.add
        .image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 'bg_bubble')
        .setAlpha(Phaser.Math.FloatBetween(0.1, 0.3))
        .setScale(Phaser.Math.FloatBetween(0.3, 1.1))
        .setDepth(1);
      s.vy = Phaser.Math.FloatBetween(15, 50);
      s.sway = Phaser.Math.FloatBetween(0, 6.28);
      this.items.push(s);
    }
  }

  update(dtMs) {
    for (const s of this.items) {
      s.y -= (s.vy * dtMs) / 1000;
      s.sway += dtMs / 1500;
      s.x += Math.sin(s.sway) * 0.3;
      if (s.y < -120) {
        s.y = H + 120;
        s.x = Phaser.Math.Between(0, W);
      }
    }
  }
}

export function kemiKey(scene) {
  return scene.textures.exists('kemi_idle') ? 'kemi_idle' : 'kemi';
}

/** Ajusta a imagem para caber num quadrado de `size` px, guardando a escala-base. */
export function fitImage(img, size) {
  const s = size / Math.max(img.width, img.height);
  img.setScale(s);
  img.baseScale = s;
  return img;
}

export function floatText(scene, x, y, str, color = COLORS.neon, size = 'h2') {
  const t = T(scene, x, y, str, size, { color, depth: 30, stroke: COLORS.bg, strokeThickness: 6 });
  scene.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

/** Estouro de bolhinhas. */
export function burst(scene, x, y, n = 10) {
  const em = scene.add.particles(x, y, 'bg_bubble', {
    speed: { min: 90, max: 300 },
    scale: { start: 0.4, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 650,
    emitting: false,
  });
  em.setDepth(25);
  em.explode(n);
  scene.time.delayedCall(900, () => em.destroy());
}

/** Gera as texturas vetoriais usadas em todo o jogo (bolhas e Kemi de reserva). */
export function makeTextures(scene) {
  const mk = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // Bolha de sabão genérica (fundo / vidas / bolhinha coletável).
  mk('bg_bubble', 128, 128, (g) => {
    g.fillStyle(0xbfe9ff, 0.12);
    g.fillCircle(64, 64, 58);
    g.lineStyle(6, hex(COLORS.cyan), 0.9);
    g.strokeCircle(64, 64, 58);
    g.lineStyle(4, 0xff9bd6, 0.45);
    g.strokeCircle(64, 64, 52);
    g.fillStyle(0xffffff, 0.75);
    g.fillEllipse(40, 36, 26, 14);
  });

  mk('pickup', 96, 96, (g) => {
    g.fillStyle(hex(COLORS.cyanLight), 0.3);
    g.fillCircle(48, 48, 42);
    g.lineStyle(6, hex(COLORS.cyanDark), 1);
    g.strokeCircle(48, 48, 42);
    g.lineStyle(3, 0xff9bd6, 0.6);
    g.strokeCircle(48, 48, 36);
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(30, 28, 20, 11);
  });

  // ---- Kemi Sobe: prateleiras, vapor e power-ups ----
  mk('plat_n', 256, 36, (g) => {
    g.fillStyle(hex(COLORS.elevated2), 1);
    g.fillRoundedRect(2, 4, 252, 28, 12);
    g.lineStyle(6, hex(COLORS.neon), 1);
    g.strokeRoundedRect(2, 4, 252, 28, 12);
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(16, 9, 224, 6, 3);
  });
  mk('plat_m', 256, 36, (g) => {
    g.fillStyle(hex(COLORS.elevated), 1);
    g.fillRoundedRect(2, 4, 252, 28, 12);
    g.lineStyle(6, hex(COLORS.sky), 1);
    g.strokeRoundedRect(2, 4, 252, 28, 12);
    g.fillStyle(hex(COLORS.sky), 1); // setinhas ◄ ►
    g.fillTriangle(24, 18, 40, 10, 40, 26);
    g.fillTriangle(232, 18, 216, 10, 216, 26);
  });
  mk('plat_b', 256, 36, (g) => {
    g.fillStyle(hex(COLORS.teal3), 1);
    g.fillRoundedRect(2, 4, 252, 28, 12);
    g.lineStyle(6, hex(COLORS.mint1), 1);
    g.strokeRoundedRect(2, 4, 252, 28, 12);
    g.lineStyle(4, hex(COLORS.bg), 1); // rachaduras
    g.beginPath();
    g.moveTo(80, 4); g.lineTo(96, 18); g.lineTo(84, 24); g.lineTo(100, 32);
    g.moveTo(170, 4); g.lineTo(158, 16); g.lineTo(174, 24); g.lineTo(162, 32);
    g.strokePath();
  });
  mk('vapor', 192, 128, (g) => {
    g.fillStyle(hex(COLORS.danger), 0.55);
    [[60, 78, 46], [110, 58, 54], [150, 80, 42], [98, 88, 46]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.fillStyle(0x10233f, 1);
    g.fillEllipse(84, 74, 9, 16);
    g.fillEllipse(116, 74, 9, 16);
  });
  mk('pu_rocket', 96, 96, (g) => {
    g.fillStyle(hex(COLORS.neon), 1);
    g.fillCircle(48, 48, 38);
    g.lineStyle(6, hex(COLORS.darkText), 1);
    g.strokeCircle(48, 48, 38);
    g.fillStyle(hex(COLORS.darkText), 1);
    g.fillTriangle(48, 20, 30, 56, 66, 56); // seta para cima
    g.fillRect(41, 56, 14, 16);
  });
  mk('pu_shield', 96, 96, (g) => {
    g.fillStyle(hex(COLORS.cyanDark), 1);
    g.fillCircle(48, 48, 38);
    g.lineStyle(6, 0xffffff, 1);
    g.strokeCircle(48, 48, 38);
    g.fillStyle(0xffffff, 1);
    g.fillRect(42, 26, 12, 44); // cruz de segurança
    g.fillRect(26, 42, 44, 12);
  });

  // Kemi de reserva (desenhada em código) — usada se assets/kemi/*.png não existirem.
  mk('kemi', 256, 256, (g) => {
    const blue = 0x9ed8f5;
    const line = 0x3f8fd9;
    // bolha
    g.fillStyle(0xbfe9ff, 0.2);
    g.fillCircle(128, 128, 122);
    g.lineStyle(8, 0xa78bfa, 0.85);
    g.strokeCircle(128, 128, 122);
    g.lineStyle(6, hex(COLORS.cyan), 0.75);
    g.strokeCircle(128, 128, 112);
    g.lineStyle(4, 0xff9bd6, 0.5);
    g.strokeCircle(128, 128, 104);
    // rabinho/antena enrolada
    g.lineStyle(6, line, 1);
    g.beginPath();
    g.arc(128, 62, 12, 0, Math.PI * 2);
    g.strokePath();
    // corpo
    g.fillStyle(blue, 1);
    g.fillEllipse(128, 150, 150, 112);
    g.lineStyle(6, line, 1);
    g.strokeEllipse(128, 150, 150, 112);
    // orelhas
    g.fillStyle(0x8fcdf0, 1);
    g.fillEllipse(58, 140, 40, 52);
    g.fillEllipse(198, 140, 40, 52);
    g.strokeEllipse(58, 140, 40, 52);
    g.strokeEllipse(198, 140, 40, 52);
    // focinho
    g.fillStyle(0xb3e3f9, 1);
    g.fillEllipse(128, 164, 48, 32);
    g.lineStyle(5, line, 1);
    g.strokeEllipse(128, 164, 48, 32);
    g.fillStyle(0x1e3a8a, 1);
    g.fillEllipse(118, 164, 6, 10);
    g.fillEllipse(138, 164, 6, 10);
    // olhos
    g.fillStyle(0x10233f, 1);
    g.fillEllipse(94, 138, 10, 18);
    g.fillEllipse(162, 138, 10, 18);
    // patinhas
    g.fillStyle(0xa9dcf6, 1);
    g.fillEllipse(88, 205, 44, 26);
    g.fillEllipse(168, 205, 44, 26);
    g.strokeEllipse(88, 205, 44, 26);
    g.strokeEllipse(168, 205, 44, 26);
    // brilho da bolha
    g.fillStyle(0xffffff, 0.8);
    g.fillEllipse(80, 62, 52, 26);
  });
}
