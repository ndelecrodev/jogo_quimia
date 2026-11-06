// Dificuldade por PONTOS (não por tempo). Tudo aqui é fácil de ajustar em playtest.
import { MAX_TIME_MS } from './game.js';

// Quantos pontos para subir 1 nível, por jogo.
export const PONTOS_POR_NIVEL = { bolha: 6, sobe: 200, runner: 160 }; // (Pode Misturar? sobe por acertos: ver MIX_* abaixo)

// "par" de cada jogo: pontuação Quimia = round(pontos / par * 1000). (calibrar no admin com partidas reais)
export const PARS = { bolha: 30, misturar: 40, sobe: 1200, runner: 1000 };

// Kemi Bolha — um item por nível (o último se repete). 1080p: vão de 300 a 240 px, velocidade de 250 a 380 px/s.
// Nível a cada 6 pontos. (Rodada de QA: antes chegava a 450 px/s e vão 210; era demais para o público geral.)
export const BUBBLE_LEVELS = [
  { gap: 300, speed: 250, maxDelta: 120, spacing: 580 },
  { gap: 288, speed: 270, maxDelta: 140, spacing: 575 },
  { gap: 276, speed: 290, maxDelta: 160, spacing: 570 },
  { gap: 266, speed: 310, maxDelta: 175, spacing: 565 },
  { gap: 256, speed: 330, maxDelta: 190, spacing: 560 },
  { gap: 248, speed: 350, maxDelta: 200, spacing: 555 },
  { gap: 242, speed: 365, maxDelta: 210, spacing: 550 },
  { gap: 240, speed: 380, maxDelta: 220, spacing: 550 },
];

// Pode Misturar? — tempo para decidir (3,0 s → 1,8 s) e quantos pares da lista já entraram.
// Só começa a acelerar depois de MIX_PRIMEIRO_DEGRAU acertos; depois, 1 degrau a cada MIX_ACERTOS_POR_NIVEL acertos.
// (Rodada de QA: 1,4 s com dois rótulos para ler era demais para o público geral.)
export const MIX_PRIMEIRO_DEGRAU = 10;
export const MIX_ACERTOS_POR_NIVEL = 5;
export const MIX_LEVELS = [
  { timeMs: 3000, unlocked: 10 },
  { timeMs: 2800, unlocked: 12 },
  { timeMs: 2600, unlocked: 14 },
  { timeMs: 2400, unlocked: 16 },
  { timeMs: 2200, unlocked: 18 },
  { timeMs: 2000, unlocked: 20 },
  { timeMs: 1800, unlocked: 24 },
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
  { speed: 550, tall: 0.25, vapor: 0, cluster: 0, gapMin: 1.3, gapMax: 1.8 },
  { speed: 580, tall: 0.3, vapor: 0.2, cluster: 0, gapMin: 1.25, gapMax: 1.7 },
  { speed: 615, tall: 0.3, vapor: 0.25, cluster: 0, gapMin: 1.2, gapMax: 1.65 },
  { speed: 650, tall: 0.3, vapor: 0.3, cluster: 0.15, gapMin: 1.15, gapMax: 1.6 },
  { speed: 690, tall: 0.35, vapor: 0.3, cluster: 0.2, gapMin: 1.1, gapMax: 1.55 },
  { speed: 725, tall: 0.35, vapor: 0.35, cluster: 0.25, gapMin: 1.1, gapMax: 1.5 },
  { speed: 760, tall: 0.4, vapor: 0.35, cluster: 0.25, gapMin: 1.05, gapMax: 1.45 },
  { speed: 785, tall: 0.4, vapor: 0.4, cluster: 0.3, gapMin: 1.05, gapMax: 1.4 },
  { speed: 800, tall: 0.4, vapor: 0.4, cluster: 0.3, gapMin: 1.05, gapMax: 1.4 },
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

/** acertos = quantas respostas certas a pessoa já deu (não os pontos, que crescem com o combo). */
export function mixParams(acertos, elapsedMs, capMs = MAX_TIME_MS) {
  const last = MIX_LEVELS.length - 1;
  const level = acertos < MIX_PRIMEIRO_DEGRAU ? 0 : Math.min(last, 1 + Math.floor((acertos - MIX_PRIMEIRO_DEGRAU) / MIX_ACERTOS_POR_NIVEL));
  const eff = Math.min(last, level + pressureBonus(elapsedMs, capMs));
  return { level, ...MIX_LEVELS[eff] };
}

export function bubbleParams(points, elapsedMs, capMs = MAX_TIME_MS) {
  const last = BUBBLE_LEVELS.length - 1;
  const level = levelFor(points, PONTOS_POR_NIVEL.bolha, last);
  const eff = Math.min(last, level + pressureBonus(elapsedMs, capMs));
  return { level, ...BUBBLE_LEVELS[eff] };
}
