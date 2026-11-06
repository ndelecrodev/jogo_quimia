import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, drawQR, kemiKey, fitImage, reduceFx } from '../ui.js';
import { fmtNum } from '../core/format.js';
import { isRealUrl } from '../core/pendencias.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getSettings } from '../core/Storage.js';
import { generalRanking, gameRanking } from '../core/RankingSource.js';
import { Cloud } from '../core/Cloud.js';
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
    this.extras = []; // QR codes do painel de convite (ficam fora do container)
    this.renderBoard();
    this.time.addEvent({ delay: 8000, loop: true, callback: () => this.nextBoard() });

    // Contagem regressiva do campeão
    this.countdown = T(this, 1400, 840, '', 'h3', { color: COLORS.cyan, depth: 5 });
    this.updateCountdown();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateCountdown() });

    // Indicador discreto da nuvem (só aparece se a nuvem estiver configurada)
    this.cloudText = T(this, 30, 1058, '', 'caption', { origin: [0, 0.5], color: COLORS.sky2, depth: 6 }).setAlpha(0.7);
    const atualizaNuvem = () => this.cloudText.setText(Cloud.statusText());
    atualizaNuvem();
    this.time.addEvent({ delay: 2000, loop: true, callback: atualizaNuvem });
    // ranking novo da nuvem: redesenha o painel
    const offRank = Cloud.on('ranking', () => this.scene.isActive() && this.renderBoard());
    this.events.once('shutdown', offRank);

    // Chamada principal
    this.cta = T(this, 960, 960, 'APERTE  ESPAÇO  ou  ✕  PARA JOGAR', 'h1', { color: COLORS.white, depth: 6 });
    if (!reduceFx()) this.tweens.add({ targets: this.cta, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    T(this, 960, 1040, 'Em breve: o app Quimia, com a Kemi para tirar suas dúvidas.', 'bodyS', { color: COLORS.sky2, depth: 6 });
  }

  // Painéis que se alternam: rankings e o convite (Instagram/hashtag/QR). O convite só entra se houver o que mostrar.
  boards() {
    const s = getSettings();
    const jogos = GAMES.filter((g) => s.enabledGames.includes(g.id));
    const temConvite = !!(String(s.instagram || '').trim() || String(s.hashtag || '').trim() || isRealUrl(s.urlUser) || isRealUrl(s.urlCompany));
    const convite = temConvite ? [{ id: 'invite', name: 'Convite' }] : [];
    const meio = Math.ceil(jogos.length / 2);
    return [{ id: 'general', name: 'Ranking Geral' }, ...convite, ...jogos.slice(0, meio), ...convite, ...jogos.slice(meio)];
  }

  nextBoard() {
    this.boardIdx = (this.boardIdx + 1) % this.boards().length;
    this.tweens.add({
      targets: [this.panel, ...this.extras],
      alpha: 0,
      duration: 250,
      onComplete: () => {
        this.renderBoard();
        this.tweens.add({ targets: [this.panel, ...this.extras], alpha: 1, duration: 250 });
      },
    });
  }

  // Painel de convite: "Chame um amigo", marcação e QR codes (ou "Em breve" enquanto não houver link real)
  renderInvite() {
    const s = getSettings();
    this.panel.add(T(this, 0, 60, 'CHAME UM AMIGO!', 'h2', { color: COLORS.neon }));
    const marca = [s.instagram, s.hashtag].map((x) => String(x || '').trim()).filter(Boolean).join('  ');
    this.panel.add(T(this, 0, 130, marca ? `Marque ${marca}` : 'Bata o recorde dele!', 'h3', { color: COLORS.white, wordWrap: { width: 720 }, align: 'center' }));
    const itens = [
      { x: -190, titulo: 'PARA VOCÊ', url: s.urlUser },
      { x: 190, titulo: 'PARA EMPRESAS', url: s.urlCompany },
    ];
    const reais = itens.filter((i) => isRealUrl(i.url));
    if (!reais.length) {
      this.panel.add(T(this, 0, 400, 'App Quimia: em breve!', 'h2', { color: COLORS.mint2 }));
      return;
    }
    for (const i of reais) {
      const x = reais.length === 1 ? 0 : i.x;
      this.panel.add(T(this, x, 230, i.titulo, 'label', { color: COLORS.cyan }));
      try {
        const g = drawQR(this, 1400 + x, 150 + 440, 300, i.url).setDepth(5);
        this.extras.push(g);
      } catch (e) {
        /* QR indisponível: segue sem */
      }
    }
  }

  renderBoard() {
    this.panel.removeAll(true);
    this.extras.forEach((e) => e.destroy());
    this.extras = [];
    const b = this.boards()[this.boardIdx % this.boards().length];
    if (b.id === 'invite') return this.renderInvite();
    const isGeneral = b.id === 'general';
    const list = (isGeneral ? generalRanking() : gameRanking(b.id)).slice(0, 5);
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
      this.panel.add(T(this, 320, y, fmtNum(isGeneral ? p.quimia : p.points), 'h3', { color: COLORS.neon, origin: [1, 0.5] }));
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
