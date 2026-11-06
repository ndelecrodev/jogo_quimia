import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { COLORS, hex } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, kemiKey, fitImage } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { addPlay, getPlays, getSettings } from '../core/Storage.js';
import { gameRanking, generalRanking } from '../core/RankingSource.js';
import { quimiaScore, positionOfNick, officialAttempts, generateCode, dayKey, minRank } from '../core/Ranking.js';
import { gameById } from '../config/games.js';
import { SHOW_VIRAL_AFTER_GAME } from '../config/game.js';
import { FATOS } from '../config/fatos.js';
import { SCORING_VERSION } from '../config/game.js';
import { fmtNum } from '../core/format.js';

// Fim de partida: pontos, posições, brinde (SEM código na tela: o código fica gravado e visível só no admin) e "Você sabia?".
export default class GameOver extends BaseScene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    this.begin();
    this.skipExit = false; // a cena é reaproveitada: zera a marca da partida abandonada anterior
    this.eligible = false;
    const { game, points, durationMs, reason, acted } = data;
    this.gameId = game;
    const g = gameById(game);
    const nick = this.registry.get('nick') || 'Visitante';
    const settings = getSettings();
    const before = getPlays();
    const solo = !!this.registry.get('solo'); // modo "um jogo isolado" (plano B): sem hub
    const home = solo ? 'Attract' : 'Hub';

    // Partida abandonada (nenhuma ação do jogador, ou 0 pontos em menos de 10 s): não grava, não gasta tentativa,
    // sem código nem brinde. Só convida a jogar de novo.
    if (acted === false || (points <= 0 && durationMs < 10000)) {
      this.eligible = false;
      this.play = { contact: null };
      this.skipExit = true;
      return this.abandoned(g, game, home, solo);
    }

    // --- Registro da partida ---
    const attempts = officialAttempts(before, nick);
    const official = attempts < settings.maxAttempts; // jogou de verdade e ainda tinha tentativa: gasta 1 e ganha código
    const minR = minRank(settings, game);
    const rankable = official && points >= minR; // só entra no ranking quem fez o mínimo do jogo
    const quimia = quimiaScore(points, settings.pars[game]);
    const prizes = [];
    if (official) {
      prizes.push('participacao');
      if (rankable && points >= settings.minScores[game]) prizes.push('meta');
    }
    const code = official ? generateCode(new Set(before.map((p) => p.code).filter(Boolean))) : null;
    const play = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      nick,
      game,
      points,
      quimia,
      scoringVersion: SCORING_VERSION,
      durationMs,
      ts: Date.now(),
      day: dayKey(Date.now()),
      official,
      rankable,
      attemptNo: attempts + 1,
      code,
      prizes,
      delivered: false,
      contact: null,
      consent: false,
    };
    addPlay(play);
    this.play = play;

    // posições: partidas locais + ranking da nuvem em cache (sem nuvem, só o local, como sempre)
    const posGame = rankable ? positionOfNick(gameRanking(game), nick) : null;
    const posGen = rankable ? positionOfNick(generalRanking(), nick) : null;

    // Captura de contato: só quem entrou no Top 3 do jogo ou atingiu a meta do brinde
    this.eligible = rankable && ((posGame !== null && posGame <= 3) || prizes.includes('meta'));

    // --- Tela ---
    addBackground(this);
    this.bubbles = new BubbleField(this, 18);
    sfx.play(official ? 'fanfare' : 'end');

    T(this, 960, 70, reason === 'time' ? 'TEMPO ESGOTADO!' : 'FIM DE PARTIDA', 'h1', { color: COLORS.neon });
    T(this, 960, 135, `${nick} · ${g.name}`, 'h3', { color: COLORS.cyan });

    // Card esquerdo: pontos e posições
    const left = this.add.graphics();
    drawCard(left, 120, 190, 800, 500, { stroke: COLORS.elevated2 });
    fitImage(this.add.image(300, 330, kemiKey(this, official ? 'happy' : 'sleepy')), 200);
    const scoreText = T(this, 640, 300, '0', 'display', { color: COLORS.white, fontSize: '170px' });
    T(this, 640, 400, 'PONTOS', 'overline', { color: COLORS.sky2 });
    this.tweens.addCounter({
      from: 0,
      to: points,
      duration: Math.min(1400, 400 + points * 40),
      onUpdate: (t) => scoreText.setText(fmtNum(Math.round(t.getValue()))),
    });
    if (official && !rankable) {
      T(this, 520, 505, 'Quase lá!', 'h2', { color: COLORS.cyanLight });
      T(this, 520, 580, `Para entrar no ranking: ${minR} pontos ou mais.`, 'body', { color: COLORS.white });
      T(this, 520, 630, 'Você ganhou o brinde de participação!', 'body', { color: COLORS.mint2 });
    } else if (official) {
      T(this, 520, 490, `Pontuação Quimia: ${fmtNum(quimia)}`, 'h3', { color: COLORS.neon });
      T(this, 520, 565, `${posGame}º lugar no ${g.name}`, 'h3', { color: COLORS.white });
      T(this, 520, 625, `${posGen}º lugar no Ranking Geral`, 'h3', { color: COLORS.mint2 });
    } else {
      T(this, 520, 520, 'Partida de treino', 'h2', { color: COLORS.cyan });
      T(this, 520, 595, 'Você já fez a sua jogada oficial.', 'body', { color: COLORS.white });
      T(this, 520, 635, 'Essa partida não vale ranking nem brinde.', 'body', { color: COLORS.white });
    }

    // Card direito: SÓ o brinde (o maior que ganhou) e o apelido bem grande, para a equipe conferir a olho.
    const right = this.add.graphics();
    drawCard(right, 1000, 190, 800, 500, { stroke: official ? COLORS.neon : COLORS.elevated2, sw: official ? 5 : 3 });
    if (official) {
      const premio = prizes.includes('meta') ? settings.prizes.meta : settings.prizes.participacao; // só o maior nível
      this.prizeIcon(1400, 285);
      T(this, 1400, 360, 'SEU BRINDE', 'overline', { color: COLORS.sky2 });
      T(this, 1400, 415, premio, 'h1', { color: COLORS.mint2, wordWrap: { width: 720 }, align: 'center' });
      const sizeNick = nick.length > 10 ? '72px' : nick.length > 7 ? '90px' : '108px';
      const nickText = T(this, 1400, 520, nick, 'display', { color: COLORS.neon, fontSize: sizeNick });
      this.tweens.add({ targets: nickText, scale: 1.05, duration: 600, yoyo: true, repeat: 2 });
      T(this, 1400, 615, 'Fale com a equipe no stand', 'bodyL', { color: COLORS.white });
      if (posGen === 1) T(this, 1400, 668, `Você está concorrendo ao Prêmio Master: ${settings.prizes.master}`, 'bodyS', { color: COLORS.neon, wordWrap: { width: 740 }, align: 'center' });
    } else {
      T(this, 1400, 420, 'Sem brinde desta vez.', 'h2', { color: COLORS.white });
      T(this, 1400, 500, 'Chame o próximo jogador!', 'body', { color: COLORS.mint2 });
    }

    // Aprendizado (Pode Misturar?): até 3 pares errados, com a resposta certa e o porquê.
    const wrong = (data.wrong || []).slice(0, 3);
    const fg = this.add.graphics();
    if (wrong.length) {
      drawCard(fg, 120, 705, 1680, 205, { fill: COLORS.elevated, stroke: COLORS.elevated2, sw: 2 });
      T(this, 160, 735, 'PARA LEMBRAR', 'overline', { color: COLORS.neon, origin: [0, 0.5] });
      wrong.forEach((w, i) => {
        const y = 782 + i * 42;
        T(this, 160, y, `${w.a} + ${w.b}`, 'bodyS', { origin: [0, 0.5], color: COLORS.white });
        T(this, 760, y, w.perigosa ? 'PERIGOSO' : 'SEGURO', 'bodyS', { origin: [0, 0.5], color: w.perigosa ? COLORS.danger : COLORS.neon, fontStyle: '800' });
        T(this, 920, y, w.porque, 'bodyS', { origin: [0, 0.5], color: COLORS.mint2, wordWrap: { width: 860 } });
      });
    } else {
      // "Você sabia?"
      const fact = Phaser.Utils.Array.GetRandom(FATOS);
      drawCard(fg, 120, 730, 1680, 140, { fill: COLORS.elevated, stroke: COLORS.elevated2, sw: 2 });
      T(this, 160, 770, data.game === 'misturar' ? 'VOCÊ SABIA? (E ainda acertou tudo!)' : 'VOCÊ SABIA?', 'overline', { color: COLORS.neon, origin: [0, 0.5] });
      T(this, 160, 825, fact, 'bodyL', { origin: [0, 0.5], wordWrap: { width: 1600 } });
    }
    T(this, 960, 925, 'Quer saber mais? Pergunte para a Kemi no app Quimia (em breve).', 'caption', { color: COLORS.sky2 });

    // Um único botão: Continuar (→ contato, se elegível → Hub). Sem "Jogar de novo": cada pessoa joga uma vez.
    this.btns = [{ label: 'CONTINUAR', do: () => this.leave(home) }].map((b) => {
      const gfx = this.add.graphics();
      const t = T(this, 960, 990, b.label, 'buttonL');
      return { ...b, gfx, t, x: 960 };
    });
    this.sel = 0;
    this.refresh();
  }

  /** Ícone do brinde: bolha com estrela. */
  prizeIcon(x, y) {
    const bolha = this.add.image(x, y, 'pickup').setScale(1.15).setDepth(6);
    const star = this.add.graphics().setDepth(7);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 13 : 29;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push({ x: x + Math.cos(a) * r, y: y + 4 + Math.sin(a) * r });
    }
    star.fillStyle(hex(COLORS.neon), 1);
    star.fillPoints(pts, true);
    star.lineStyle(4, hex(COLORS.bg), 1);
    star.strokePoints(pts, true);
    this.tweens.add({ targets: bolha, scale: 1.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Tela para partida abandonada: sem código, sem brinde, não gastou tentativa. */
  abandoned(g, game, home, solo) {
    addBackground(this);
    this.bubbles = new BubbleField(this, 18);
    sfx.play('back');
    T(this, 960, 150, 'Vamos de novo?', 'display', { color: COLORS.neon });
    fitImage(this.add.image(960, 450, kemiKey(this, 'sleepy')), 340);
    T(this, 960, 690, 'Parece que a partida nem começou de verdade.', 'h3', { color: COLORS.white });
    T(this, 960, 760, 'Essa não gastou a sua jogada oficial. Vamos tentar de novo?', 'bodyL', { color: COLORS.mint2 });
    this.btns = [
      { label: 'JOGAR DE NOVO', do: () => this.scene.start(g.scene, { gameId: game }) },
      { label: solo ? 'SAIR' : 'OUTRO JOGO', do: () => this.scene.start(home) },
    ].map((b, i) => {
      const gfx = this.add.graphics();
      const t = T(this, 640 + i * 640, 990, b.label, 'buttonL');
      return { ...b, gfx, t, x: 640 + i * 640 };
    });
    this.sel = 0;
    this.refresh();
  }

  /** Saída da tela final: contato (se elegível) → Hub. A tela de convite (Viral) só entra se SHOW_VIRAL_AFTER_GAME for true. */
  leave(scene, data) {
    const next = { scene, data };
    if (this.skipExit) return this.scene.start(scene, data); // abandonada: direto
    if (this.eligible && !this.play.contact) this.scene.start('Contact', { playId: this.play.id, next });
    else if (SHOW_VIRAL_AFTER_GAME) this.scene.start('Viral', { next });
    else this.scene.start(scene, data);
  }

  refresh() {
    this.btns.forEach((b, i) => {
      const on = i === this.sel;
      drawCard(b.gfx, b.x - 260, 950, 520, 80, {
        fill: on ? COLORS.neon : COLORS.card,
        stroke: on ? COLORS.white : COLORS.elevated2,
        sw: on ? 5 : 3,
        r: 20,
      });
      b.t.setColor(on ? COLORS.darkText : COLORS.white);
    });
  }

  update(_, delta) {
    this.bubbles.update(delta);
    if (!this.ready(600)) return;
    if (input.pressed('left') && this.sel > 0) { this.sel--; sfx.play('nav'); this.refresh(); }
    if (input.pressed('right') && this.sel < this.btns.length - 1) { this.sel++; sfx.play('nav'); this.refresh(); }
    if (input.pressed('action')) { sfx.play('ok'); this.btns[this.sel].do(); }
    if (input.pressed('back')) { sfx.play('back'); this.leave(this.registry.get('solo') ? 'Attract' : 'Hub'); }
  }
}
