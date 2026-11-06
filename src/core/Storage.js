// Persistência 100% local (localStorage). Sem servidor.
// Lê/escreve direto do localStorage a cada chamada para funcionar com 2 janelas (jogo + /ranking).
import { MAX_ATTEMPTS, MAX_TIME_MS } from '../config/game.js';
import { PARS } from '../config/difficulty.js';
import { PRIZES } from '../config/prizes.js';
import { EVENT } from '../config/event.js';
import { GAMES } from '../config/games.js';

const KEY = 'quimia_arcade_v1';
const BACKUP = 'quimia_arcade_backup_v1';
const CHANNEL = 'quimia-arcade';
export const OUTBOX_KEY = 'quimia_outbox_v1'; // fila de envio para a nuvem (ver core/Cloud.js)

// Gancho para a camada de nuvem (Cloud.js). Storage continua sendo a fonte de verdade local e NÃO depende da nuvem.
let syncHook = null;
export function setSyncHook(fn) {
  syncHook = fn;
}
function emitSync(kind, play) {
  try {
    if (syncHook) syncHook(kind, play);
  } catch (e) {
    logError('Storage.syncHook', e); // nuvem com problema nunca atrapalha o jogo
  }
}

const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

export function defaultSettings() {
  return {
    maxAttempts: MAX_ATTEMPTS,
    maxTimeMs: MAX_TIME_MS,
    pars: { ...PARS },
    minScores: { ...PRIZES.minScores },
    minRank: {}, // vazio = metade da meta de cada jogo (ver Ranking.minRank)
    stationId: 'E1', // código curto desta estação de jogo (vai junto com cada partida para a nuvem)
    prizes: { ...PRIZES.names },
    enabledGames: GAMES.filter((g) => g.enabledByDefault).map((g) => g.id),
    muted: false,
    reduceFlash: false,
    eventEnd: EVENT.endTime,
    instagram: EVENT.instagram,
    hashtag: EVENT.hashtag,
    urlUser: EVENT.urlUser,
    urlCompany: EVENT.urlCompany,
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.plays = Array.isArray(s.plays) ? s.plays : [];
      s.settings = s.settings || {};
      return s;
    }
  } catch (e) {
    logError('Storage.read', e);
  }
  return { plays: [], settings: {} };
}

function write(state) {
  try {
    const old = localStorage.getItem(KEY);
    if (old) localStorage.setItem(BACKUP, old); // backup automático a cada gravação
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    logError('Storage.write', e);
  }
  if (bc) bc.postMessage({ type: 'changed' });
}

export function getSettings() {
  const d = defaultSettings();
  const s = read().settings;
  return {
    ...d,
    ...s,
    pars: { ...d.pars, ...(s.pars || {}) },
    minScores: { ...d.minScores, ...(s.minScores || {}) },
    prizes: { ...d.prizes, ...(s.prizes || {}) },
  };
}

export function setSettings(patch) {
  const st = read();
  st.settings = { ...st.settings, ...patch };
  write(st);
}

export function getPlays() {
  return read().plays;
}

export function addPlay(play) {
  const st = read();
  st.plays.push(play);
  write(st);
  emitSync('play', play);
}

export function updatePlay(id, patch) {
  const st = read();
  const p = st.plays.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
  write(st);
  // contato salvo COM consentimento: manda para a nuvem (Cloud.js confere de novo)
  if (p && patch && patch.consent === true && p.contact) emitSync('contact', p);
}

export function deletePlay(id) {
  const st = read();
  st.plays = st.plays.filter((x) => x.id !== id);
  write(st);
  pruneOutbox(new Set(st.plays.map((x) => x.id)));
}

// ---- Fila de saída (outbox) ----
export function readOutbox() {
  try {
    const a = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
}

export function writeOutbox(arr) {
  try {
    if (arr.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch (e) {
    logError('Storage.writeOutbox', e);
  }
}

/** Tira da fila o que já não existe mais nas partidas locais (ex.: depois de apagar ou zerar). */
export function pruneOutbox(validIds) {
  const q = readOutbox();
  const keep = q.filter((it) => validIds.has(it.id));
  if (keep.length !== q.length) writeOutbox(keep);
}

/** "Zerar tudo para abrir a feira": apaga partidas, contatos, códigos, o backup automático e o log de erros. Mantém as configurações. */
export function clearAllPlays() {
  const st = read();
  st.plays = [];
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
    localStorage.removeItem(BACKUP); // o backup automático também guarda partidas e contatos
    localStorage.removeItem('quimia_errors');
    localStorage.removeItem(OUTBOX_KEY); // e a fila de envio (senão as partidas de teste seguiriam para a nuvem)
  } catch (e) {
    logError('Storage.clearAllPlays', e);
  }
  if (bc) bc.postMessage({ type: 'changed' });
}

export function replacePlays(plays) {
  const st = read();
  st.plays = plays;
  write(st);
  pruneOutbox(new Set(plays.map((x) => x.id)));
}

/** Avisa quando outra janela (ou esta) gravou algo. */
export function onChange(cb) {
  if (bc) bc.addEventListener('message', cb);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) cb();
  });
}

export function logError(where, err) {
  try {
    const arr = JSON.parse(localStorage.getItem('quimia_errors') || '[]');
    arr.push({ t: new Date().toISOString(), where, msg: String((err && err.message) || err) });
    localStorage.setItem('quimia_errors', JSON.stringify(arr.slice(-50)));
  } catch (_) {
    /* sem log, sem problema */
  }
  console.error(where, err);
}
