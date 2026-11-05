import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { COLORS } from '../theme.js';
import { addBackground, BubbleField, T, drawCard, kemiKey, fitImage } from '../ui.js';
import { input } from '../core/InputManager.js';
import { sfx } from '../core/Sfx.js';
import { addPlay, getPlays, getSettings } from '../core/Storage.js';
import { quimiaScore, rankGame, rankGeneral, positionOfNick, officialAttempts, generateCode, dayKey } from '../core/Ranking.js';
import { gameById } from '../config/games.js';
import { FATOS } from '../config/fatos.js';

// Fim de partida: pontos, posições, código de resgate, brinde e "Você sabia?".
export default class GameOver extends BaseScene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    this.begin();
    const { game, points, durationMs, reason } = data;
    this.gameId = game;
    const g = gameById(game);
    const nick = this.registry.get('nick') || 'Visitante';
    const settings = getSettings();
    const before = getPlays();

    // --- Registro da partida ---
    const attempts = officialAttempts(before, nick);
    const official = attempts < settings.maxAttempts;
    const quimia = quimiaScore(points, settings.pars[game]);
    const prizes = [];
    if (official) {
      prizes.push('participacao');
      if (points >= settings.minScores[game]) prizes.push('meta');
    }
    const code = official ? generateCode(new Set(before.map((p) => p.code).filter(Boolean))) : null;
    const play = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      nick,
      game,
      points,
      quimia,
      durationMs,
      ts: Date.now(),
      day: dayKey(Date.now()),
      official,
      attemptNo: attempts + 1,
      code,
      prizes,
      delivered: false,
      contact: null,
      consent: false,
    };
    addPlay(play);
    this.play = play;

    const all = getPlays();
    const posGame = official ? positionOfNick(rankGame(all, game), nick) : null;
    const posGen = official ? positionOfNick(rankGeneral(all), nick) : null;

    // Captura de contato: só quem entrou no Top 3 do jogo ou atingiu a meta do brinde
    this.eligible = official && ((posGame !== null && posGame <= 3) || prizes.includes('meta'));

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
      onUpdate: (t) => scoreText.setText(String(Math.round(t.getValue()))),
    });
    if (official) {
      T(this, 520, 490, `Pontuação Quimia: ${quimia}`, 'h3', { color: COLORS.neon });
      T(this, 520, 565, `#${posGame} no ${g.name}`, 'h3', { color: COLORS.white });
      T(this, 520, 625, `#${posGen} no Ranking Geral`, 'h3', { color: COLORS.mint2 });
    } else {
      T(this, 520, 520, 'Partida de treino', 'h2', { color: COLORS.cyan });
      T(this, 520, 595, 'Você já usou as tentativas oficiais.', 'body', { color: COLORS.white });
      T(this, 520, 635, 'Essa partida não vale ranking nem brinde.', 'body', { color: COLORS.white });
    }

    // Card direito: código e brinde
    const right = this.add.graphics();
    drawCard(right, 1000, 190, 800, 500, { stroke: official ? COLORS.neon : COLORS.elevated2, sw: official ? 5 : 3 });
    if (official) {
      T(this, 1400, 250, 'CÓDIGO DE RESGATE', 'overline', { color: COLORS.sky2 });
      const codeText = T(this, 1400, 360, code, 'display', { color: COLORS.neon, fontSize: '150px' });
      this.tweens.add({ targets: codeText, scale: 1.06, duration: 600, yoyo: true, repeat: 2 });
      T(this, 1400, 470, 'Mostre este código para a equipe.', 'body', { color: COLORS.white });
      const names = prizes.map((p) => settings.prizes[p]);
      names.forEach((n, i) => T(this, 1400, 540 + i * 56, `Brinde: ${n}`, 'h3', { color: i === 0 ? COLORS.mint2 : COLORS.cyanLight }));
      if (posGen === 1) T(this, 1400, 650, `1º no Geral: concorrendo ao ${settings.prizes.master}`, 'bodyS', { color: COLORS.neon });
      else if (!prizes.includes('meta')) T(this, 1400, 650, `Meta do brinde extra: ${settings.minScores[game]} pontos`, 'caption', { color: COLORS.sky2 });
    } else {
      T(this, 1400, 440, 'Sem código desta vez.', 'h2', { color: COLORS.white });
      T(this, 1400, 520, 'Chame um amigo para jogar!', 'body', { color: COLORS.mint2 });
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
    T(this, 960, 925, 'Quer saber mais? Pergunte pra Kemi no app Quimia (em breve).', 'caption', { color: COLORS.sky2 });

    // Botões
    const solo = !!this.registry.get('solo'); // modo "um jogo isolado" (plano B): sem hub
    const home = solo ? 'Attract' : 'Hub';
    this.btns = [
      { label: 'JOGAR DE NOVO', do: () => this.leave(g.scene, { gameId: game }) },
      { label: solo ? 'SAIR' : 'OUTRO JOGO', do: () => this.leave(home) },
    ].map((b, i) => {
      const gfx = this.add.graphics();
      const t = T(this, 640 + i * 640, 990, b.label, 'buttonL');
      return { ...b, gfx, t, x: 640 + i * 640 };
    });
    this.sel = 0;
    this.refresh();
  }

  /** Saída da tela final: contato (se elegível) → convite com 2 QR → destino. */
  leave(scene, data) {
    const next = { scene, data };
    if (this.eligible && !this.play.contact) this.scene.start('Contact', { playId: this.play.id, next });
    else this.scene.start('Viral', { next });
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
    if (input.pressed('right') && this.sel < 1) { this.sel++; sfx.play('nav'); this.refresh(); }
    if (input.pressed('action')) { sfx.play('ok'); this.btns[this.sel].do(); }
    if (input.pressed('back')) { sfx.play('back'); this.leave(this.registry.get('solo') ? 'Attract' : 'Hub'); }
  }
}
