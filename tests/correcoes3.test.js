import { describe, it, expect } from 'vitest';
import { quimiaOf, rankGeneral, officialAttempts, contactKey } from '../src/core/Ranking.js';
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

describe('jogada oficial por contato', () => {
  const base = { game: 'bolha', points: 100, official: true, durationMs: 1, ts: 1 };
  const plays = [
    { ...base, id: '1', nick: 'MARIA', contact: '@maria.silva' },
    { ...base, id: '2', nick: 'JOAO', contact: '(11) 91234-5678' },
    { ...base, id: '3', nick: 'ANA', contact: null },
  ];
  it('mesmo apelido com contato diferente é outra pessoa', () => {
    expect(officialAttempts(plays, 'MARIA', '@outra.maria')).toBe(0);
    expect(officialAttempts(plays, 'OUTRO', 'maria.silva')).toBe(1); // @ e maiúsculas não importam
  });
  it('telefone vale pelos dígitos; sem contato, vale o apelido', () => {
    expect(contactKey('+11 91234-5678')).toBe(contactKey('11912345678'));
    expect(officialAttempts(plays, 'X', '11 91234 5678')).toBe(1);
    expect(officialAttempts(plays, 'ana', null)).toBe(1);
    expect(officialAttempts(plays, 'maria', null)).toBe(0);
  });
  it('ranking separa duas pessoas com o mesmo apelido', () => {
    const r = rankGeneral([{ ...plays[0], nick: 'LU', contact: '@a' }, { ...plays[1], nick: 'LU', contact: '@b' }], { pars: PARS });
    expect(r.length).toBe(2);
  });
});
