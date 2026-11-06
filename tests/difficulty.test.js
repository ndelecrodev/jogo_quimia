import { describe, it, expect } from 'vitest';
import { BUBBLE_LEVELS, MIX_LEVELS, SOBE_LEVELS, SOBE_APEX, RUNNER_LEVELS, RUNNER_APEX, RUNNER_OBSTACLES, RUNNER_CLUSTER_SPAN, runnerParams, levelFor, pressureBonus, bubbleParams, mixParams, sobeParams } from '../src/config/difficulty.js';
import { MAX_TIME_MS } from '../src/config/game.js';

describe('nível por pontos', () => {
  it('sobe com os pontos e respeita o máximo', () => {
    expect(levelFor(0, 4, 7)).toBe(0);
    expect(levelFor(3, 4, 7)).toBe(0);
    expect(levelFor(4, 4, 7)).toBe(1);
    expect(levelFor(9999, 4, 7)).toBe(7);
  });
});

describe('Kemi Bolha: tabela de níveis', () => {
  it('o vão só diminui e a velocidade só aumenta', () => {
    for (let i = 1; i < BUBBLE_LEVELS.length; i++) {
      expect(BUBBLE_LEVELS[i].gap).toBeLessThanOrEqual(BUBBLE_LEVELS[i - 1].gap);
      expect(BUBBLE_LEVELS[i].speed).toBeGreaterThanOrEqual(BUBBLE_LEVELS[i - 1].speed);
    }
  });

  it('a variação de altura entre frascos é sempre alcançável (~440 px/s de subida máxima)', () => {
    for (const l of BUBBLE_LEVELS) {
      const tempoEntreFrascos = l.spacing / l.speed;
      const subidaPossivel = 440 * tempoEntreFrascos * 0.6; // 60% de folga para humano
      expect(l.maxDelta).toBeLessThanOrEqual(subidaPossivel);
    }
  });
});

describe('Kemi Runner: obstáculos sempre superáveis', () => {
  it('os frascos cabem no pulo cheio com folga e o vazio entre grupos dá tempo de pousar e pular', () => {
    expect(RUNNER_OBSTACLES.tall).toBeLessThanOrEqual(RUNNER_APEX * 0.8);
    expect(RUNNER_OBSTACLES.low).toBeLessThan(RUNNER_OBSTACLES.tall);
    for (const l of RUNNER_LEVELS) {
      expect(l.gapMin).toBeGreaterThanOrEqual(1.05);
      expect(l.gapMax).toBeGreaterThanOrEqual(l.gapMin);
      if (l.cluster > 0) expect(RUNNER_CLUSTER_SPAN).toBeLessThanOrEqual(0.42 * l.speed); // cabe num único pulo
    }
    for (let i = 1; i < RUNNER_LEVELS.length; i++) expect(RUNNER_LEVELS[i].speed).toBeGreaterThan(RUNNER_LEVELS[i - 1].speed);
    expect(runnerParams(0, 0)).toMatchObject(RUNNER_LEVELS[0]);
    expect(RUNNER_LEVELS[0].vapor + RUNNER_LEVELS[0].cluster + RUNNER_LEVELS[0].tall).toBe(0); // começo fácil
  });
});

describe('Kemi Sobe: prateleiras sempre alcançáveis', () => {
  it('o vão máximo entre linhas cabe no pulo (com folga) e os obstáculos entram nos níveis certos', () => {
    for (const l of SOBE_LEVELS) expect(l.gapMax).toBeLessThanOrEqual(SOBE_APEX * 0.8);
    expect(SOBE_LEVELS[2].moving).toBe(0);
    expect(SOBE_LEVELS[3].moving).toBeGreaterThan(0); // nível 4 (índice 3): prateleiras que andam
    expect(SOBE_LEVELS[3].cloud).toBe(0);
    expect(SOBE_LEVELS[4].cloud).toBeGreaterThan(0); // vapores
    expect(SOBE_LEVELS[4].breaking).toBe(0);
    expect(SOBE_LEVELS[5].breaking).toBeGreaterThan(0); // prateleiras que quebram
    expect(sobeParams(0, 0)).toMatchObject(SOBE_LEVELS[0]);
  });
});

describe('Pode Misturar?: tempo para decidir', () => {
  it('vai de 3,0 s a no mínimo 1,8 s e libera mais pares por nível, sem passar do total', () => {
    expect(MIX_LEVELS[0].timeMs).toBe(3000);
    expect(MIX_LEVELS[MIX_LEVELS.length - 1].timeMs).toBe(1800);
    for (let i = 1; i < MIX_LEVELS.length; i++) {
      expect(MIX_LEVELS[i].timeMs).toBeLessThan(MIX_LEVELS[i - 1].timeMs);
      expect(MIX_LEVELS[i].unlocked).toBeGreaterThanOrEqual(MIX_LEVELS[i - 1].unlocked);
    }
    expect(mixParams(0, 0)).toMatchObject(MIX_LEVELS[0]);
    expect(mixParams(9999, 0).timeMs).toBe(1800);
  });

  it('só começa a acelerar depois de 10 acertos', () => {
    expect(mixParams(9, 0).timeMs).toBe(3000);
    expect(mixParams(10, 0).timeMs).toBe(2800);
    expect(mixParams(15, 0).timeMs).toBe(2600);
  });
});

describe('limites para o público geral (rodada de QA)', () => {
  it('Kemi Bolha: velocidade até 380 e vão mínimo 240; Runner: velocidade até 800', () => {
    expect(Math.max(...BUBBLE_LEVELS.map((l) => l.speed))).toBeLessThanOrEqual(380);
    expect(Math.min(...BUBBLE_LEVELS.map((l) => l.gap))).toBeGreaterThanOrEqual(240);
    expect(Math.max(...RUNNER_LEVELS.map((l) => l.speed))).toBeLessThanOrEqual(800);
    expect(bubbleParams(5, 0).level).toBe(0);
    expect(bubbleParams(6, 0).level).toBe(1); // nível a cada 6 pontos
  });
});

describe('pressão perto do teto de tempo', () => {
  it('não mexe nos primeiros 75% da partida e depois acelera', () => {
    expect(pressureBonus(0)).toBe(0);
    expect(pressureBonus(MAX_TIME_MS * 0.75)).toBe(0);
    expect(pressureBonus(MAX_TIME_MS * 0.75 + 1)).toBe(1);
    expect(pressureBonus(MAX_TIME_MS)).toBeGreaterThan(1);
  });

  it('começo do jogo é o mais fácil e usa o tempo para endurecer só no final', () => {
    const inicio = bubbleParams(0, 0);
    expect(inicio).toMatchObject(BUBBLE_LEVELS[0]);
    expect(bubbleParams(0, MAX_TIME_MS).gap).toBeLessThan(inicio.gap);
  });
});
