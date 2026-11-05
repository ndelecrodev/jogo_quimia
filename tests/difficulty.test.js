import { describe, it, expect } from 'vitest';
import { BUBBLE_LEVELS, MIX_LEVELS, levelFor, pressureBonus, bubbleParams, mixParams } from '../src/config/difficulty.js';
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

describe('Pode Misturar?: tempo para decidir', () => {
  it('vai de 3,0 s a 1,0 s e libera mais pares por nível, sem passar do total', () => {
    expect(MIX_LEVELS[0].timeMs).toBe(3000);
    expect(MIX_LEVELS[MIX_LEVELS.length - 1].timeMs).toBe(1000);
    for (let i = 1; i < MIX_LEVELS.length; i++) {
      expect(MIX_LEVELS[i].timeMs).toBeLessThan(MIX_LEVELS[i - 1].timeMs);
      expect(MIX_LEVELS[i].unlocked).toBeGreaterThanOrEqual(MIX_LEVELS[i - 1].unlocked);
    }
    expect(mixParams(0, 0)).toMatchObject(MIX_LEVELS[0]);
    expect(mixParams(9999, 0).timeMs).toBe(1000);
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
