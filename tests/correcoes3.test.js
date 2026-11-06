import { describe, it, expect } from 'vitest';
import { quimiaOf, rankGeneral } from '../src/core/Ranking.js';
import { fmtNum } from '../src/core/format.js';
import { PARS, BUBBLE_SHRINK_STEPS } from '../src/config/difficulty.js';

describe('Pontuação Quimia recalculada', () => {
  it('ignora o valor gravado (escala antiga) e usa os pontos e o par atual', () => {
    const velha = { id: 'a', nick: 'QB1', game: 'bolha', points: 480, quimia: 16000, official: true, durationMs: 1, ts: 1 };
    expect(quimiaOf(velha, PARS)).toBe(1600);
    expect(rankGeneral([velha], { pars: PARS })[0].quimia).toBe(1600);
  });
});

describe('número pt-BR', () => {
  it('usa ponto como separador de milhar', () => {
    expect(fmtNum(16000)).toBe('16.000');
    expect(fmtNum(999)).toBe('999');
    expect(fmtNum(1234567)).toBe('1.234.567');
  });
});

describe('bolha encolhe', () => {
  it('100% → 82% → 66% e nunca abaixo de 66%', () => {
    expect(BUBBLE_SHRINK_STEPS).toEqual([1, 0.82, 0.66]);
  });
});
