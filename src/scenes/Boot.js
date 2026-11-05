import Phaser from 'phaser';
import { makeTextures } from '../ui.js';
import { COLORS, ts } from '../theme.js';

// Carrega o manifest e as imagens da Kemi. Arquivo faltando NÃO trava: usa a Kemi desenhada em código.
export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.add.text(960, 540, 'Carregando...', ts('h2', { color: COLORS.cyan })).setOrigin(0.5);
    this.missing = [];
    this.load.on('loaderror', (f) => this.missing.push(f.key));
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', () => {
      const m = this.cache.json.get('manifest') || {};
      Object.entries(m.images || {}).forEach(([key, url]) => this.load.image(key, url));
    });
  }

  create() {
    makeTextures(this);
    if (this.missing.length) console.info('[Quimia] Imagens ausentes (usando reserva):', this.missing.join(', '));
    // Espera as fontes empacotadas antes de desenhar textos.
    const fonts = ['800 40px Nunito', '700 40px Nunito', '400 40px "PT Sans"'].map((f) => document.fonts.load(f));
    Promise.allSettled(fonts).then(() => this.scene.start('Attract'));
  }
}
