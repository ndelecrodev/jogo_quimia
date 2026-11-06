import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, drawQR, kemiKey, fitImage } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getSettings } from '../core/Storage.js';
import { isRealUrl } from '../core/pendencias.js';

const DURATION = 4000;

// Tela de convite (4 s): chama o amigo, pede marcação e mostra os 2 QR codes (locais, sem internet).
export default class Viral extends BaseScene {
  constructor() {
    super('Viral');
  }

  create(data) {
    this.begin();
    this.next = (data && data.next) || { scene: 'Hub' };
    const s = getSettings();
    addBackground(this);
    this.bubbles = new BubbleField(this, 18);

    T(this, 960, 100, 'Chama um amigo pra bater seu recorde!', 'h1', { color: COLORS.neon });
    // Marcação só aparece se o Instagram/hashtag foram preenchidos (nada de texto de exemplo na tela)
    const marca = [s.instagram, s.hashtag].map((x) => String(x || '').trim()).filter(Boolean).join('  ');
    if (marca) T(this, 960, 185, `Marca ${marca}`, 'h3', { color: COLORS.white });

    // Dois QR codes
    this.qrBox(560, 'PARA VOCÊ', 'Em breve: entre na lista de espera', s.urlUser);
    this.qrBox(1360, 'PARA EMPRESAS', 'Conheça o painel da Quimia', s.urlCompany);
    fitImage(this.add.image(960, 560, kemiKey(this, 'wink')).setDepth(5), 200);

    // Progresso
    const bar = this.add.rectangle(560, 1010, 0, 12, hex(COLORS.neon)).setOrigin(0, 0.5);
    this.tweens.add({ targets: bar, width: 800, duration: DURATION, onComplete: () => this.go() });
    T(this, 960, 1050, 'Aperte ação para pular', 'caption', { color: COLORS.sky2 });
    this.gone = false;
  }

  qrBox(x, title, caption, url) {
    const g = this.add.graphics();
    drawCard(g, x - 330, 250, 660, 700, { fill: COLORS.card, stroke: COLORS.elevated2 });
    T(this, x, 305, title, 'h2', { color: COLORS.cyan });
    // Link ainda não definido (ou de exemplo): mostra "Em breve" em vez de um QR que não abre nada
    let ok = isRealUrl(url);
    if (ok) {
      try {
        drawQR(this, x, 600, 400, url);
      } catch (e) {
        ok = false;
      }
    }
    if (!ok) {
      const g2 = this.add.graphics();
      drawCard(g2, x - 200, 400, 400, 400, { fill: COLORS.elevated, stroke: COLORS.elevated2, sw: 3 });
      T(this, x, 600, 'Em breve', 'h1', { color: COLORS.neon });
      T(this, x, 840, caption, 'body', { color: COLORS.mint2, align: 'center', wordWrap: { width: 600 } });
      return;
    }
    T(this, x, 840, caption, 'body', { color: COLORS.mint2, align: 'center', wordWrap: { width: 600 } });
    T(this, x, 905, url.replace(/^https?:\/\//, ''), 'caption', { color: COLORS.sky2, wordWrap: { width: 600 }, align: 'center' });
  }

  go() {
    if (this.gone) return;
    this.gone = true;
    this.scene.start(this.next.scene, this.next.data);
  }

  update(_, delta) {
    this.bubbles.update(delta);
    if (this.ready(900) && (input.pressed('action') || input.pressed('back'))) {
      sfx.play('ok');
      this.go();
    }
  }
}
