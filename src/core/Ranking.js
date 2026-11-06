// Regras de ranking (funções puras, testadas em tests/).
// Só partidas OFICIAIS contam; vale a melhor de cada apelido.

/** Pontos mínimos para entrar no ranking de um jogo: configurável no admin; padrão = metade da meta do brinde. */
export function minRank(settings, game) {
  const v = settings.minRank && Number(settings.minRank[game]);
  if (v > 0) return v;
  return Math.max(1, Math.ceil((settings.minScores[game] || 2) / 2));
}

export const quimiaScore = (points, par) => Math.round((points / par) * 1000);

/** Ranking geral: maior Pontuação Quimia; empate → menos tempo; persistindo → quem fez primeiro. */
export function compareQuimia(a, b) {
  if (b.quimia !== a.quimia) return b.quimia - a.quimia;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  return a.ts - b.ts;
}

/** Ranking por jogo: mesmos critérios, mas em pontos reais. */
export function compareGame(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  return a.ts - b.ts;
}

export function dayKey(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const nickKey = (n) => String(n).trim().toLowerCase();

function bestPerNick(plays, cmp) {
  const m = new Map();
  for (const p of plays) {
    if (!p.official || p.rankable === false) continue; // treino e abaixo do mínimo não entram no ranking
    const k = nickKey(p.nick);
    const cur = m.get(k);
    if (!cur || cmp(p, cur) < 0) m.set(k, p);
  }
  return [...m.values()].sort(cmp);
}

const byDay = (plays, day) => (day ? plays.filter((p) => dayKey(p.ts) === day) : plays);

/** opts.day = 'YYYY-MM-DD' (opcional) filtra por dia. */
export function rankGeneral(plays, opts = {}) {
  return bestPerNick(byDay(plays, opts.day), compareQuimia);
}

export function rankGame(plays, game, opts = {}) {
  return bestPerNick(byDay(plays, opts.day).filter((p) => p.game === game), compareGame);
}

/** Posição (1-based) do apelido no ranking, ou null. */
export function positionOfNick(ranking, nick) {
  const i = ranking.findIndex((p) => nickKey(p.nick) === nickKey(nick));
  return i < 0 ? null : i + 1;
}

export function officialAttempts(plays, nick) {
  return plays.filter((p) => p.official && nickKey(p.nick) === nickKey(nick)).length;
}

// Código de resgate: 4 caracteres sem letras/números ambíguos (0/O, 1/I/L).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(existing = new Set(), rand = Math.random) {
  for (let tries = 0; tries < 1000; tries++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
    if (!existing.has(c)) return c;
  }
  throw new Error('Sem códigos livres');
}
