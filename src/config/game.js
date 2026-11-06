// Parâmetros gerais. Valores podem ser sobrescritos no painel admin (Storage.getSettings).
export const W = 1920; // resolução lógica
export const H = 1080;
export const MAX_TIME_MS = 120000; // teto de tempo por partida
export const LIVES = 3;
export const IDLE_MS = 30000; // volta ao modo atração sem input
export const MAX_ATTEMPTS = 1; // jogada oficial única por apelido (depois disso, só treino). Também ajustável no admin.
export const NICK_MAX = 10;
// Versões: se a versão salva no navegador for diferente, os campos que dependem de escala (pars, minScores, minRank, maxAttempts)
// voltam aos padrões do código. Suba o número sempre que mudar SCORE_SCALE, PARS, minScores ou MAX_ATTEMPTS.
export const SETTINGS_VERSION = 4;
export const SCORING_VERSION = 2; // gravada em cada partida (qual escala de pontos valia)
export const SHOW_VIRAL_AFTER_GAME = false; // true = mostra a tela de convite (2 QR) no fim da partida. Padrão: só na atração e no rodapé do Hub.
export const HUB_RESET_MS = 15000; // no Hub, depois da jogada oficial: sem apertar nada por tanto tempo → limpa o jogador e volta à atração
