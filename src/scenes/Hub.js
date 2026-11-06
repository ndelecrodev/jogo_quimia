import { BaseScene } from './BaseScene.js';
import { COLORS } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, kemiKey, fitImage } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { getPlays, getSettings } from '../core/Storage.js';
import { HUB_RESET_MS } from '../config/game.js';
import { officialAttempts } from '../core/Ranking.js';
import { gameRanking } from '../core/RankingSource.js';
import { GAMES } from '../config/games.js';

const CARD_H = 640;

// Hub: um card grande por jogo. D-pad/setas navegam, ação confirma.
export default class Hub extends BaseScene {
  constructor() {
    super('Hub');
  }

  create() {
    this.begin();
    addBackground(this);
    this.bubbles = new BubbleField(this, 18);
    const nick = this.registry.get('nick') || 'Visitante';
    const settings = getSettings();
    const plays = getPlays();
    this.games = GAMES.filter((g) => settings.enabledGames.includes(g.id));
    this.sel = Math.min(this.registry.get('hubSel') || 0, this.games.length - 1);
    this.enterWall = Date.now();

    const used = officialAttempts(plays, nick);
    const left = Math.max(0, settings.maxAttempts - used);
    this.done = left <= 0; // a jogada oficial já foi: a próxima pessoa deve assumir
    if (this.done) {
      // Faixa no topo; nenhum apelido na tela (o próximo jogador não vê o de quem acabou de jogar)
      const faixa = this.add.graphics().setDepth(5);
      drawCard(faixa, 160, 40, 1600, 90, { fill: COLORS.elevated, stroke: COLORS.neon, sw: 4, r: 28 });
      T(this, 960, 85, 'Sua jogada oficial já foi! Chame o próximo jogador 🎉', 'h2', { color: COLORS.neon, depth: 6 });
      T(this, 960, 190, 'Quer treinar? Escolha um jogo (não vale ranking nem brinde)', 'h3', { color: COLORS.white });
    } else {
      T(this, 960, 90, `Olá, ${nick}!`, 'h1', { color: COLORS.neon });
      T(this, 960, 160, 'Escolha seu jogo', 'h3', { color: COLORS.white });
    }
    this.attemptsText = T(
      this,
      960,
      1010,
      this.done ? 'Sem apertar nada, voltamos ao início em alguns segundos.' : `Você tem ${left} ${left === 1 ? 'jogada oficial' : 'jogadas oficiais'}`,
      'bodyL',
      { color: this.done ? COLORS.cyan : COLORS.mint2 }
    );
    // rodapé: dica de teclas e (se houver) Instagram e hashtag
    T(this, 40, 1055, 'Esc / ○ = trocar de jogador', 'caption', { origin: [0, 0.5], color: COLORS.sky2 });
    const marca = [settings.instagram, settings.hashtag].map((x) => String(x || '').trim()).filter(Boolean).join('  ');
    if (marca) T(this, 960, 1055, `Marque ${marca}`, 'bodyS', { color: COLORS.sky2 });

    const n = this.games.length;
    const compact = n > 3; // 4 jogos: cards mais estreitos para caber nos 1920 px
    const CARD_W = compact ? 400 : 520;
    const GAP = compact ? 40 : 60;
    this.cardW = CARD_W;
    const total = n * CARD_W + (n - 1) * GAP;
    this.cards = this.games.map((g, i) => {
      const cx = 960 - total / 2 + CARD_W / 2 + i * (CARD_W + GAP);
      const c = this.add.container(cx, 600);
      const gfx = this.add.graphics();
      c.add(gfx);
      const kemi = fitImage(this.add.image(0, -170, kemiKey(this, g.pose)), compact ? 190 : 230);
      c.add(kemi);
      c.add(T(this, 0, 10, g.name, compact ? 'h3' : 'h2', { color: COLORS.white }));
      c.add(T(this, 0, 85, g.desc, 'body', { color: COLORS.mint2, align: 'center', wordWrap: { width: CARD_W - 50 } }));
      const best = gameRanking(g.id)[0];
      c.add(T(this, 0, 215, best ? `Melhor: ${best.points}` : 'Seja o primeiro!', 'h3', { color: COLORS.neon }));
      if (best && !this.done) c.add(T(this, 0, 262, best.nick, 'label', { color: COLORS.cyan })); // depois da jogada oficial, nenhum apelido na tela
      c.gfx = gfx;
      c.kemi = kemi;
      return c;
    });
    this.refresh();
  }

  refresh() {
    this.cards.forEach((c, i) => {
      const on = i === this.sel;
      drawCard(c.gfx, -this.cardW / 2, -CARD_H / 2, this.cardW, CARD_H, {
        fill: on ? COLORS.elevated : COLORS.card,
        stroke: on ? COLORS.neon : COLORS.elevated2,
        sw: on ? 8 : 3,
      });
      this.tweens.add({ targets: c, scale: on ? 1.05 : 0.96, duration: 140 });
      c.setAlpha(on ? 1 : 0.8);
    });
  }

  update(_, delta) {
    this.bubbles.update(delta);
    if (!this.ready()) return;
    // Jogada oficial já feita: sem apertar nada por HUB_RESET_MS, limpa o jogador e volta à atração
    if (this.done && Date.now() - Math.max(input.lastInputAt, this.enterWall) > HUB_RESET_MS) {
      this.registry.remove('nick');
      return this.scene.start('Attract');
    }
    if (input.pressed('left') && this.sel > 0) { this.sel--; sfx.play('nav'); this.refresh(); }
    if (input.pressed('right') && this.sel < this.games.length - 1) { this.sel++; sfx.play('nav'); this.refresh(); }
    if (input.pressed('action')) {
      sfx.play('ok');
      this.registry.set('hubSel', this.sel);
      this.registry.set('gameId', this.games[this.sel].id);
      this.scene.start('Tutorial', { gameId: this.games[this.sel].id });
    }
    if (input.pressed('back')) {
      // "Trocar de jogador": esquece o apelido atual e vai para a tela de apelido
      sfx.play('back');
      this.registry.remove('nick');
      this.scene.start('Nickname');
    }
  }
}
