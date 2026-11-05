// Dificuldade por PONTOS (não por tempo). Tudo aqui é fácil de ajustar em playtest.
import { MAX_TIME_MS } from './game.js';

// Quantos pontos para subir 1 nível, por jogo.
export const PONTOS_POR_NIVEL = { bolha: 4, misturar: 5, sobe: 200, runner: 160 };

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

// Kemi Sobe — física do quique e tabela por nível. Pontos = altura / 10.
// Nível 3+: prateleiras que andam. 4+: vapores (perdem vida). 5+: prateleiras que quebram.
export const SOBE_PHYSICS = { gravity: 2400, bounce: 1150, speedX: 650 };
export const SOBE_APEX = (SOBE_PHYSICS.bounce ** 2) / (2 * SOBE_PHYSICS.gravity); // ~275 px
export const SOBE_LEVELS = [
  { gapMin: 110, gapMax: 150, w: 210, moving: 0, breaking: 0, cloud: 0 },
  { gapMin: 115, gapMax: 160, w: 210, moving: 0, breaking: 0, cloud: 0 },
  { gapMin: 120, gapMax: 170, w: 200, moving: 0, breaking: 0, cloud: 0 },
  { gapMin: 125, gapMax: 180, w: 200, moving: 0.25, breaking: 0, cloud: 0 },
  { gapMin: 130, gapMax: 185, w: 190, moving: 0.3, breaking: 0, cloud: 0.12 },
  { gapMin: 135, gapMax: 195, w: 190, moving: 0.3, breaking: 0.25, cloud: 0.15 },
  { gapMin: 140, gapMax: 200, w: 180, moving: 0.35, breaking: 0.3, cloud: 0.18 },
  { gapMin: 145, gapMax: 205, w: 170, moving: 0.35, breaking: 0.3, cloud: 0.2 },
  { gapMin: 150, gapMax: 210, w: 160, moving: 0.4, breaking: 0.35, cloud: 0.22 },
  { gapMin: 155, gapMax: 215, w: 150, moving: 0.4, breaking: 0.35, cloud: 0.25 },
];

// Kemi Runner — pulo (segurar = mais alto) e abaixar. Pontos = distância/40 + 25 por bolhinha.
// Regras que garantem que NUNCA existe obstáculo impossível:
//  - a altura dos frascos cabe no pulo cheio com folga (altura <= 80% do ápice);
//  - o vazio entre grupos de obstáculos dura >= 1,05 s (tempo de pousar e pular de novo);
//  - o grupo de 2 frascos baixos só aparece quando cabe num único pulo (vão <= 42% da velocidade).
export const RUNNER_PHYSICS = { gravity: 3200, jump: 1250, cutJump: 420 };
export const RUNNER_APEX = (RUNNER_PHYSICS.jump ** 2) / (2 * RUNNER_PHYSICS.gravity); // ~244 px
export const RUNNER_OBSTACLES = { low: 110, tall: 180, bottleW: 70, tallW: 78, clusterGap: 110 };
export const RUNNER_CLUSTER_SPAN = RUNNER_OBSTACLES.bottleW * 2 + RUNNER_OBSTACLES.clusterGap;
export const RUNNER_LEVELS = [
  { speed: 520, tall: 0, vapor: 0, cluster: 0, gapMin: 1.35, gapMax: 1.9 },
  { speed: 560, tall: 0.25, vapor: 0, cluster: 0, gapMin: 1.3, gapMax: 1.8 },
  { speed: 600, tall: 0.3, vapor: 0.2, cluster: 0, gapMin: 1.25, gapMax: 1.7 },
  { speed: 640, tall: 0.3, vapor: 0.25, cluster: 0, gapMin: 1.2, gapMax: 1.65 },
  { speed: 690, tall: 0.3, vapor: 0.3, cluster: 0.15, gapMin: 1.15, gapMax: 1.6 },
  { speed: 740, tall: 0.35, vapor: 0.3, cluster: 0.2, gapMin: 1.1, gapMax: 1.55 },
  { speed: 790, tall: 0.35, vapor: 0.35, cluster: 0.25, gapMin: 1.1, gapMax: 1.5 },
  { speed: 840, tall: 0.4, vapor: 0.35, cluster: 0.25, gapMin: 1.05, gapMax: 1.45 },
  { speed: 890, tall: 0.4, vapor: 0.4, cluster: 0.3, gapMin: 1.05, gapMax: 1.4 },
  { speed: 940, tall: 0.4, vapor: 0.4, cluster: 0.3, gapMin: 1.05, gapMax: 1.4 },
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

export function runnerParams(points, elapsedMs, capMs = MAX_TIME_MS) {
  const last = RUNNER_LEVELS.length - 1;
  const level = levelFor(points, PONTOS_POR_NIVEL.runner, last);
  const eff = Math.min(last, level + pressureBonus(elapsedMs, capMs));
  return { level, ...RUNNER_LEVELS[eff] };
}

export function sobeParams(points, elapsedMs, capMs = MAX_TIME_MS) {
  const last = SOBE_LEVELS.length - 1;
  const level = levelFor(points, PONTOS_POR_NIVEL.sobe, last);
  const eff = Math.min(last, level + pressureBonus(elapsedMs, capMs));
  return { level, ...SOBE_LEVELS[eff] };
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
