import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, kemiKey, fitImage, reduceFx } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getPlays, getSettings } from '../core/Storage.js';
import { rankGeneral, rankGame } from '../core/Ranking.js';
import { championText } from '../core/clock.js';
import { GAMES } from '../config/games.js';

// Modo Atração: Kemi, ranking rotativo e chamada para jogar.
export default class Attract extends BaseScene {
  constructor() {
    super('Attract');
  }

  create() {
    this.begin();
    this.registry.remove('nick'); // reset limpo entre jogadores
    addBackground(this);
    this.bubbles = new BubbleField(this, 26);

    // Kemi
    this.kemi = fitImage(this.add.image(520, 470, kemiKey(this)).setDepth(5), 460);
    this.tweens.add({ targets: this.kemi, y: 440, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // a Kemi troca de pose de tempos em tempos
    const poses = ['idle', 'wink', 'happy', 'sleepy', 'side'];
    let pi = 0;
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.kemi.setTexture(kemiKey(this, poses[++pi % poses.length])) });

    T(this, 520, 130, 'QUIMIA ARCADE', 'display', { color: COLORS.neon, depth: 5 });
    T(this, 520, 215, 'Jogue, suba no ranking e ganhe brindes!', 'bodyL', { color: COLORS.mint2, depth: 5 });

    // Painel de ranking
    this.panelG = this.add.graphics().setDepth(4);
    drawCard(this.panelG, 1000, 150, 800, 640, { stroke: COLORS.elevated2 });
    this.panel = this.add.container(1400, 150).setDepth(5);
    this.boardIdx = 0;
    this.renderBoard();
    this.time.addEvent({ delay: 6000, loop: true, callback: () => this.nextBoard() });

    // Contagem regressiva do campeão
    this.countdown = T(this, 1400, 840, '', 'h3', { color: COLORS.cyan, depth: 5 });
    this.updateCountdown();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateCountdown() });

    // Chamada principal
    this.cta = T(this, 960, 960, 'APERTE  ESPAÇO  ou  ✕  PARA JOGAR', 'h1', { color: COLORS.white, depth: 6 });
    if (!reduceFx()) this.tweens.add({ targets: this.cta, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    T(this, 960, 1040, 'Em breve: o app Quimia, com a Kemi para tirar suas dúvidas.', 'bodyS', { color: COLORS.sky2, depth: 6 });
  }

  boards() {
    const s = getSettings();
    return [{ id: 'general', name: 'Ranking Geral' }, ...GAMES.filter((g) => s.enabledGames.includes(g.id))];
  }

  nextBoard() {
    this.boardIdx = (this.boardIdx + 1) % this.boards().length;
    this.tweens.add({
      targets: this.panel,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.renderBoard();
        this.tweens.add({ targets: this.panel, alpha: 1, duration: 250 });
      },
    });
  }

  renderBoard() {
    this.panel.removeAll(true);
    const b = this.boards()[this.boardIdx % this.boards().length];
    const plays = getPlays();
    const isGeneral = b.id === 'general';
    const list = (isGeneral ? rankGeneral(plays) : rankGame(plays, b.id)).slice(0, 5);
    this.panel.add(T(this, 0, 60, `TOP 5 · ${b.name.toUpperCase()}`, 'h2', { color: COLORS.neon }));
    if (!list.length) {
      this.panel.add(T(this, 0, 330, 'Seja o primeiro do ranking!', 'h3', { color: COLORS.mint2 }));
      return;
    }
    list.forEach((p, i) => {
      const y = 170 + i * 96;
      const g = this.add.graphics();
      drawCard(g, -350, y - 38, 700, 76, { fill: i === 0 ? COLORS.elevated : COLORS.base, stroke: COLORS.elevated2, sw: 0, r: 18, alpha: i === 0 ? 1 : 0.5 });
      this.panel.add(g);
      this.panel.add(T(this, -310, y, `${i + 1}`, 'h2', { color: i === 0 ? COLORS.neon : COLORS.cyan, origin: [0, 0.5] }));
      this.panel.add(T(this, -230, y, p.nick, 'h3', { origin: [0, 0.5] }));
      this.panel.add(T(this, 320, y, `${isGeneral ? p.quimia : p.points}`, 'h3', { color: COLORS.neon, origin: [1, 0.5] }));
    });
  }

  updateCountdown() {
    this.countdown.setText(championText(getSettings().eventEnd));
  }

  update(_, delta) {
    this.bubbles.update(delta);
    if (this.ready() && input.pressed('action')) {
      sfx.ensure();
      sfx.play('ok');
      sfx.startMusic();
      this.scene.start('Nickname');
    }
  }
}
