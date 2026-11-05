// Dificuldade por PONTOS (não por tempo). Tudo aqui é fácil de ajustar em playtest.
import { MAX_TIME_MS } from './game.js';

// Quantos pontos para subir 1 nível, por jogo.
export const PONTOS_POR_NIVEL = { bolha: 4, misturar: 5, sobe: 150, runner: 120 };

// "par" de cada jogo: pontuação Quimia = round(pontos / par * 1000). [VALIDAR em playtest]
export const PARS = { bolha: 30, misturar: 40, sobe: 1200, runner: 1000 };

// Kemi Bolha — um item por nível (o último se repete). Resolução 1080p:
// o vão vai de 300 a 210 px (equivale a ~190→130 do prompt, escalado para a tela grande).
export const BUBBLE_LEVELS = [
  { gap: 300, speed: 250, maxDelta: 120, spacing: 580 },
  { gap: 285, speed: 275, maxDelta: 150, spacing: 570 },
  { gap: 270, speed: 300, maxDelta: 180, spacing: 560 },
  { gap: 255, speed: 325, maxDelta: 200, spacing: 550 },
  { gap: 240, speed: 350, maxDelta: 220, spacing: 540 },
  { gap: 228, speed: 375, maxDelta: 240, spacing: 530 },
  { gap: 218, speed: 400, maxDelta: 250, spacing: 520 },
  { gap: 210, speed: 420, maxDelta: 260, spacing: 520 },
  // Do nível 8 em diante (a partir de ~32 pontos) o jogo fica bem mais rápido e apertado.
  // O tempo entre frascos (spacing/speed) fica ~1 s para a variação de altura continuar alcançável.
  { gap: 200, speed: 450, maxDelta: 250, spacing: 520 },
  { gap: 194, speed: 480, maxDelta: 250, spacing: 520 },
  { gap: 188, speed: 510, maxDelta: 245, spacing: 530 },
  { gap: 182, speed: 540, maxDelta: 240, spacing: 560 },
  { gap: 176, speed: 570, maxDelta: 235, spacing: 590 },
  { gap: 170, speed: 600, maxDelta: 230, spacing: 620 },
  { gap: 165, speed: 630, maxDelta: 225, spacing: 650 },
];

// Pode Misturar? — tempo para decidir (3,0 s → 1,0 s) e quantos pares da lista já entraram, por nível.
export const MIX_LEVELS = [
  { timeMs: 3000, unlocked: 6 },
  { timeMs: 2700, unlocked: 8 },
  { timeMs: 2400, unlocked: 10 },
  { timeMs: 2100, unlocked: 12 },
  { timeMs: 1850, unlocked: 14 },
  { timeMs: 1600, unlocked: 14 },
  { timeMs: 1400, unlocked: 14 },
  { timeMs: 1200, unlocked: 14 },
  { timeMs: 1000, unlocked: 14 },
];

export function levelFor(points, perLevel, maxLevel) {
  return Math.min(Math.max(0, Math.floor(points / perLevel)), maxLevel);
}

// Perto do teto de tempo o jogo acelera (final emocionante): +1 nível a cada 10 s após 75% do teto.
export function pressureBonus(elapsedMs, capMs = MAX_TIME_MS) {
  const start = capMs * 0.75;
  if (elapsedMs <= start) return 0;
  return 1 + Math.floor((elapsedMs - start) / 10000);
}

export function mixParams(points, elapsedMs, capMs = MAX_TIME_MS) {
  const last = MIX_LEVELS.length - 1;
  const level = levelFor(points, PONTOS_POR_NIVEL.misturar, last);
  const eff = Math.min(last, level + pressureBonus(elapsedMs, capMs));
  return { level, ...MIX_LEVELS[eff] };
}

export function bubbleParams(points, elapsedMs, capMs = MAX_TIME_MS) {
  const last = BUBBLE_LEVELS.length - 1;
  const level = levelFor(points, PONTOS_POR_NIVEL.bolha, last);
  const eff = Math.min(last, level + pressureBonus(elapsedMs, capMs));
  return { level, ...BUBBLE_LEVELS[eff] };
}
