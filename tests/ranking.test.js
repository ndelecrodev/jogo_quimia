import { describe, it, expect } from 'vitest';
import {
  quimiaScore,
  minRank,
  rankGeneral,
  rankGame,
  positionOfNick,
  officialAttempts,
  generateCode,
  CODE_ALPHABET,
} from '../src/core/Ranking.js';

// A Pontuação Quimia é recalculada dos pontos e do par (300): aqui os pontos saem do "quimia" pedido, para o teste continuar legível.
const play = (o) => {
  const quimia = o.quimia ?? 333;
  return { nick: 'A', game: 'bolha', points: Math.round((quimia * 300) / 1000), quimia, durationMs: 50000, ts: 1, official: true, ...o };
};

describe('quimiaScore', () => {
  it('normaliza pelo par do jogo, sem teto', () => {
    expect(quimiaScore(30, 30)).toBe(1000);
    expect(quimiaScore(15, 30)).toBe(500);
    expect(quimiaScore(60, 30)).toBe(2000);
  });
});

describe('ranking geral', () => {
  it('ordena por pontuação Quimia', () => {
    const r = rankGeneral([play({ nick: 'A', quimia: 500 }), play({ nick: 'B', quimia: 900 })]);
    expect(r.map((p) => p.nick)).toEqual(['B', 'A']);
  });

  it('desempate: menos tempo vence; depois quem fez primeiro', () => {
    const r = rankGeneral([
      play({ nick: 'A', quimia: 800, durationMs: 60000, ts: 1 }),
      play({ nick: 'B', quimia: 800, durationMs: 40000, ts: 2 }),
      play({ nick: 'C', quimia: 800, durationMs: 40000, ts: 1 }),
    ]);
    expect(r.map((p) => p.nick)).toEqual(['C', 'B', 'A']);
  });

  it('conta só partidas oficiais e a melhor de cada apelido (sem diferenciar maiúsculas)', () => {
    const r = rankGeneral([
      play({ nick: 'Ana', quimia: 400 }),
      play({ nick: 'ANA', quimia: 700 }),
      play({ nick: 'Bia', quimia: 9999, official: false }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].quimia).toBe(700);
  });
});

describe('partidas abaixo do mínimo', () => {
  it('não entram no ranking (rankable: false), mas partidas antigas sem o campo continuam valendo', () => {
    const r = rankGeneral([play({ nick: 'A', quimia: 900, rankable: false }), play({ nick: 'B', quimia: 100 }), play({ nick: 'C', quimia: 50, rankable: true })]);
    expect(r.map((p) => p.nick)).toEqual(['B', 'C']);
    expect(rankGame([play({ nick: 'A', points: 3, rankable: false })], 'bolha')).toHaveLength(0);
  });

  it('mínimo para entrar no ranking: o configurado, ou metade da meta do brinde', () => {
    const settings = { minScores: { bolha: 15, sobe: 600 }, minRank: { sobe: 100 } };
    expect(minRank(settings, 'bolha')).toBe(8);
    expect(minRank(settings, 'sobe')).toBe(100);
  });
});

describe('ranking por jogo', () => {
  it('usa pontos reais e filtra o jogo', () => {
    const r = rankGame([play({ nick: 'A', points: 12 }), play({ nick: 'B', points: 20 }), play({ nick: 'C', game: 'sobe', points: 999 })], 'bolha');
    expect(r.map((p) => p.nick)).toEqual(['B', 'A']);
    expect(positionOfNick(r, 'a')).toBe(2);
    expect(positionOfNick(r, 'zzz')).toBeNull();
  });
});

describe('tentativas oficiais', () => {
  it('conta só as oficiais do apelido', () => {
    const plays = [play({ nick: 'A' }), play({ nick: 'a' }), play({ nick: 'A', official: false }), play({ nick: 'B' })];
    expect(officialAttempts(plays, 'A')).toBe(2);
  });
});

describe('código de resgate', () => {
  it('tem 4 caracteres do alfabeto sem ambíguos e não repete', () => {
    const used = new Set();
    for (let i = 0; i < 500; i++) {
      const c = generateCode(used);
      expect(c).toHaveLength(4);
      expect([...c].every((ch) => CODE_ALPHABET.includes(ch))).toBe(true);
      expect(used.has(c)).toBe(false);
      used.add(c);
    }
  });
});
