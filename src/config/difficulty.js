// Dificuldade por PONTOS (não por tempo). Tudo aqui é fácil de ajustar em playtest.
import { MAX_TIME_MS } from './game.js';

// Quantos pontos para subir 1 nível, por jogo.
// Atenção: aqui contam os pontos BRUTOS do jogo (ritmo da dificuldade). O que a pessoa vê/ranqueia é o brutos x SCORE_SCALE.
export const PONTOS_POR_NIVEL = { bolha: 4, sobe: 75, runner: 105 }; // (Pode Misturar? sobe por acertos: ver MIX_* abaixo)

// Escala comum: pontuação exibida = round(ponto bruto x SCORE_SCALE[jogo]). Calibrada com bots (ver CALIBRACAO.md); recalibre no admin.
export const SCORE_SCALE = { bolha: 15, misturar: 6, sobe: 5, runner: 0.62 };
// Fontes de pontos brutos por habilidade (não por tempo parado)
export const MIX_COMBO_MAX = 3; // combo máximo x3
export const SOBE_PT_ALTURA = 20; // 1 ponto bruto a cada 20 px de altura (antes 10)
export const SOBE_PT_POWERUP = 25; // bônus por power-up pego
export const RUNNER_PT_DIST = 120; // 1 ponto bruto a cada 120 px de distância (antes 40)
export const RUNNER_PT_BOLHA = 25; // por bolhinha
export const RUNNER_PT_OBSTACULO = 10; // por obstáculo superado
export const scaleScore = (game, raw) => Math.round((raw || 0) * (SCORE_SCALE[game] ?? 1));

// "par" de cada jogo: pontuação Quimia = round(pontos / par * 1000). (calibrar no admin com partidas reais)
// Com a escala comum, o par é o mesmo para todos os jogos (Pontuação Quimia comparável).
export const PARS = { bolha: 300, misturar: 300, sobe: 300, runner: 300 };

// Kemi Bolha — um item por nível (o último se repete). 1080p: vão de 300 a 224 px (passos de ~12), velocidade de 250 a 430 px/s.
// Nível a cada 4 pontos brutos. O pedido era chegar a 200 px, mas a física não deixa: o pulo sobe ~108 px, então o "ar livre" de
// um vão de 200 (raio de acerto ~52) é 96 px, menor que a oscilação mínima de um pulo; um bot quase perfeito já perdia as 3 vidas em ~47 s
// e com 216 em ~51 s. Com 224 px um bot quase perfeito chega ao teto de 120 s na maioria das vezes (jogo difícil, mas possível).
export const BUBBLE_LEVELS = [
  { gap: 300, speed: 250, maxDelta: 120, spacing: 580 },
  { gap: 288, speed: 275, maxDelta: 150, spacing: 570 },
  { gap: 276, speed: 300, maxDelta: 175, spacing: 560 },
  { gap: 264, speed: 325, maxDelta: 200, spacing: 550 },
  { gap: 252, speed: 350, maxDelta: 220, spacing: 540 },
  { gap: 240, speed: 375, maxDelta: 240, spacing: 535 },
  { gap: 232, speed: 400, maxDelta: 250, spacing: 525 },
  { gap: 224, speed: 430, maxDelta: 260, spacing: 520 },
];

// Kemi Bolha: a bolha da Kemi encolhe a cada vida perdida (100% → 82% → 66%). A hitbox acompanha; o desenho nunca passa de 66%
// (190 px x 0,66 = ~125 px de largura em 1080p: ainda bem legível).
export const BUBBLE_SHRINK_STEPS = [1, 0.82, 0.66];

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
  { gapMin: 115, gapMax: 160, w: 200, moving: 0, breaking: 0, cloud: 0 },
  { gapMin: 120, gapMax: 170, w: 200, moving: 0, breaking: 0, cloud: 0 },
  { gapMin: 125, gapMax: 180, w: 190, moving: 0, breaking: 0, cloud: 0 },
  { gapMin: 130, gapMax: 190, w: 185, moving: 0.35, breaking: 0, cloud: 0 },
  { gapMin: 135, gapMax: 195, w: 180, moving: 0.4, breaking: 0, cloud: 0.18 },
  { gapMin: 140, gapMax: 205, w: 175, moving: 0.4, breaking: 0.3, cloud: 0.22 },
  { gapMin: 145, gapMax: 210, w: 165, moving: 0.45, breaking: 0.35, cloud: 0.26 },
  { gapMin: 150, gapMax: 215, w: 160, moving: 0.45, breaking: 0.4, cloud: 0.3 },
  { gapMin: 155, gapMax: 218, w: 150, moving: 0.5, breaking: 0.4, cloud: 0.32 },
  { gapMin: 160, gapMax: 218, w: 140, moving: 0.5, breaking: 0.45, cloud: 0.35 },
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
  { speed: 540, tall: 0, vapor: 0, cluster: 0, gapMin: 1.3, gapMax: 1.8 },
  { speed: 575, tall: 0.25, vapor: 0, cluster: 0, gapMin: 1.25, gapMax: 1.7 },
  { speed: 610, tall: 0.3, vapor: 0.25, cluster: 0, gapMin: 1.2, gapMax: 1.6 },
  { speed: 645, tall: 0.3, vapor: 0.3, cluster: 0, gapMin: 1.15, gapMax: 1.55 },
  { speed: 680, tall: 0.35, vapor: 0.3, cluster: 0.2, gapMin: 1.1, gapMax: 1.5 },
  { speed: 720, tall: 0.35, vapor: 0.35, cluster: 0.25, gapMin: 1.08, gapMax: 1.45 },
  { speed: 755, tall: 0.4, vapor: 0.35, cluster: 0.3, gapMin: 1.05, gapMax: 1.4 },
  { speed: 790, tall: 0.4, vapor: 0.4, cluster: 0.3, gapMin: 1.05, gapMax: 1.35 },
  { speed: 820, tall: 0.45, vapor: 0.4, cluster: 0.35, gapMin: 1.05, gapMax: 1.3 },
  { speed: 845, tall: 0.45, vapor: 0.45, cluster: 0.35, gapMin: 1.05, gapMax: 1.3 },
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
