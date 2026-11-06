// Camada OPCIONAL de nuvem (Supabase), offline-first.
//
// Regras:
//  - Storage.js continua sendo a fonte de verdade LOCAL. Aqui só fica uma cópia que viaja para a nuvem.
//  - Escrita: toda partida/contato entra numa fila persistente (outbox, no localStorage) e um "worker" envia em segundo plano:
//    tenta de novo a cada 5 s, dobrando até 60 s, e também quando a internet volta e ao abrir o jogo.
//    Reenvio é idempotente (a função submit_play usa o id da partida: reenviar não duplica).
//  - Leitura: o ranking da nuvem é guardado em cache (memória + localStorage) e MESCLADO com o ranking local.
//    Se a nuvem falhar, vale o local — nada de erro na tela e nada trava.
//  - Sem URL/chave válidas (ver config/supabase.js) a camada fica desligada e o jogo é 100% local.
import { SUPABASE, supabaseReady } from '../config/supabase.js';
import { GAMES } from '../config/games.js';
import { getSettings, getPlays, setSyncHook, readOutbox, writeOutbox } from './Storage.js';

const CACHE_KEY = 'quimia_cloud_ranking_v1';
const ERR_KEY = 'quimia_cloud_errors_v1';
const FETCH_TIMEOUT_MS = 8000;
const POLL_MS = 10000;
const MAX_RETRIES_SEM_PARTIDA = 30;

let fetchImpl = (...a) => window.fetch(...a);
const listeners = { status: new Set(), ranking: new Set() };
const state = {
  timer: null, running: false, failures: 0, lastOkAt: 0, lastError: '', readOk: true,
  started: false, pollTimer: null, refreshing: false,
  ws: null, hb: null, rtTimer: null, rtBackoff: 1000, rtDeb: null,
};
let cache = loadCache();

export const enabled = () => !!(SUPABASE.enabled && SUPABASE.url && SUPABASE.anonKey);

/** Espera (ms) antes da próxima tentativa: 5 s, 10 s, 20 s, 40 s e no máximo 60 s. */
export const backoffMs = (falhas) => Math.min(60000, 5000 * 2 ** Math.max(0, falhas - 1));

function emit(evt) {
  for (const cb of listeners[evt]) {
    try {
      cb();
    } catch (e) {
      /* um ouvinte com problema não derruba os outros */
    }
  }
}

function loadCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Array.isArray(c.general)) return c;
  } catch (e) {
    /* cache inválido: começa vazio */
  }
  return { at: 0, general: [], games: {} };
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    /* sem espaço: tudo bem, continua em memória */
  }
}

function logCloudError(item, r) {
  try {
    const a = JSON.parse(localStorage.getItem(ERR_KEY) || '[]');
    a.push({ t: new Date().toISOString(), kind: item.k, id: item.id, status: r && r.status, resposta: r && r.json });
    localStorage.setItem(ERR_KEY, JSON.stringify(a.slice(-30)));
  } catch (e) {
    /* sem log */
  }
}

// ---------------- Chamada ao Supabase (REST/RPC com fetch, sem biblioteca e sem CDN) ----------------
const isJwt = (k) => /^eyJ[\w-]+\.[\w-]+\./.test(String(k || ''));

export async function rpc(fn, body = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const to = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    const headers = { apikey: SUPABASE.anonKey, 'Content-Type': 'application/json' };
    if (isJwt(SUPABASE.anonKey)) headers.Authorization = `Bearer ${SUPABASE.anonKey}`;
    const res = await fetchImpl(`${SUPABASE.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      /* resposta sem corpo */
    }
    return { status: res.status, ok: res.ok, json };
  } finally {
    if (to) clearTimeout(to);
  }
}

// ---------------- Fila de saída ----------------
const CLOUD_NICK_MAX = 13;
const stationId = () => String(getSettings().stationId || 'E1').slice(0, 12);

export function playBody(p) {
  return {
    id: p.id,
    nick: String(p.nick).slice(0, CLOUD_NICK_MAX), // o banco aceita até 13 (schema.sql); acima disso a jogada seria recusada
    game: p.game,
    points: p.points,
    quimia: p.quimia,
    duration_ms: p.durationMs || 0,
    played_at: new Date(p.ts || Date.now()).toISOString(),
    day: p.day && /^\d{4}-\d{2}-\d{2}$/.test(p.day) ? p.day : undefined,
    official: !!p.official,
    rankable: p.rankable !== false,
    attempt_no: p.attemptNo || null,
    code: p.code || null,
    prizes: p.prizes || [],
    station_id: stationId(),
  };
}

function push(item) {
  const q = readOutbox().filter((x) => !(x.k === item.k && x.id === item.id));
  q.push(item);
  writeOutbox(q);
  emit('status');
  clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    pump();
  }, 200);
}

export function enqueuePlay(play) {
  if (!enabled() || !play || !play.id) return;
  push({ k: 'play', id: play.id, body: playBody(play), n: 0 });
}

/** Contato: só vai para a nuvem com consentimento (LGPD). */
export function enqueueContact(play) {
  if (!enabled() || !play || !play.id || play.consent !== true || !play.contact) return;
  push({
    k: 'contact',
    id: play.id,
    n: 0,
    body: { p_play_id: play.id, p_contact: play.contact, p_type: play.contactType || null, p_company: !!play.company, p_consent: true },
  });
}

/** Reenfileira TODAS as partidas deste computador (seguro: o servidor ignora as que já existem). */
export function enqueueAllLocal() {
  let n = 0;
  for (const p of getPlays()) {
    enqueuePlay(p);
    enqueueContact(p);
    n++;
  }
  return n;
}

async function sendItem(item) {
  let r;
  try {
    r = await rpc(item.k === 'play' ? 'submit_play' : 'submit_contact', item.k === 'play' ? { p: item.body } : item.body);
  } catch (e) {
    state.lastError = 'sem conexão';
    return 'retry';
  }
  if (r.ok) {
    if (item.k === 'contact' && r.json && r.json.ok === false) {
      if (r.json.error === 'sem_partida') {
        item.n = (item.n || 0) + 1;
        if (item.n >= MAX_RETRIES_SEM_PARTIDA) {
          logCloudError(item, r);
          return 'drop';
        }
        state.lastError = 'contato aguardando a partida chegar';
        return 'defer'; // não trava a fila: vai para o fim e tenta de novo depois
      }
      logCloudError(item, r); // sem_consentimento etc.: reenviar não adianta
      return 'drop';
    }
    return 'ok';
  }
  if (r.status === 400 || r.status === 409 || r.status === 413 || r.status === 422) {
    logCloudError(item, r); // o servidor recusou os dados: reenviar não adianta
    return 'drop';
  }
  state.lastError = `servidor respondeu ${r.status}`; // 401/403/404 (config errada), 429, 5xx: tenta de novo mais tarde
  return 'retry';
}

function schedule(ms) {
  clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    pump();
  }, ms);
}

/** Envia a fila, uma a uma, em ordem. Falhou: espera (backoff) e tenta de novo. Nunca lança erro. */
export async function pump() {
  if (state.running || !enabled()) return;
  state.running = true;
  try {
    const adiados = new Set(); // itens que esperam outra coisa (ex.: contato antes da partida) nesta rodada
    for (;;) {
      const q = readOutbox();
      if (!q.length) {
        state.failures = 0;
        break;
      }
      const item = q[0];
      if (adiados.has(`${item.k}:${item.id}`)) {
        // só sobraram itens adiados: espera um pouco antes de tentar de novo (sem contar como falha de rede)
        schedule(backoffMs(1));
        emit('status');
        return;
      }
      const r = await sendItem(item);
      if (r === 'defer') {
        adiados.add(`${item.k}:${item.id}`);
        writeOutbox([...readOutbox().filter((x) => !(x.k === item.k && x.id === item.id)), { ...item, n: item.n || 0 }]);
        continue;
      }
      if (r === 'ok' || r === 'drop') {
        writeOutbox(readOutbox().filter((x) => !(x.k === item.k && x.id === item.id)));
        if (r === 'ok') {
          state.lastOkAt = Date.now();
          state.lastError = '';
        }
        emit('status');
        continue;
      }
      // 'retry': guarda o contador e espera
      writeOutbox(readOutbox().map((x) => (x.k === item.k && x.id === item.id ? { ...x, n: item.n || 0 } : x)));
      state.failures++;
      schedule(backoffMs(state.failures));
      emit('status');
      return;
    }
    emit('status');
    refreshRanking(); // fila vazia: aproveita para puxar o ranking atualizado
  } catch (e) {
    state.failures++;
    state.lastError = String((e && e.message) || e);
    schedule(backoffMs(state.failures));
    emit('status');
  } finally {
    state.running = false;
  }
}

/** Botão "Enviar pendentes agora". */
export function flushNow() {
  clearTimeout(state.timer);
  state.timer = null;
  state.failures = 0;
  return pump();
}

// ---------------- Ranking da nuvem (cache) ----------------
export async function refreshRanking() {
  if (!enabled() || state.refreshing) return false;
  state.refreshing = true;
  try {
    const rs = await Promise.all([rpc('get_ranking', { p_game: null, p_limit: 200 }), ...GAMES.map((g) => rpc('get_ranking', { p_game: g.id, p_limit: 200 }))]);
    if (rs.some((r) => !r.ok || !Array.isArray(r.json))) throw new Error('ranking indisponível');
    cache = { at: Date.now(), general: rs[0].json, games: Object.fromEntries(GAMES.map((g, i) => [g.id, rs[i + 1].json])) };
    saveCache();
    state.readOk = true;
    emit('ranking');
    emit('status');
    return true;
  } catch (e) {
    state.readOk = false;
    emit('status');
    return false;
  } finally {
    state.refreshing = false;
  }
}

/** Linhas do ranking da nuvem já em cache (sem repetir ids). Vazio se nunca conectou. */
export function cachedRows() {
  const m = new Map();
  for (const r of cache.general || []) m.set(r.id, r);
  for (const rows of Object.values(cache.games || {})) for (const r of rows || []) m.set(r.id, r);
  return [...m.values()];
}

// ---------------- Realtime (a TV atualiza na hora; o polling é a reserva) ----------------
function debouncedRefresh() {
  clearTimeout(state.rtDeb);
  state.rtDeb = setTimeout(refreshRanking, 300);
}

export function startRealtime() {
  if (!enabled() || state.ws || typeof WebSocket === 'undefined') return;
  const retry = () => {
    clearTimeout(state.rtTimer);
    state.rtTimer = setTimeout(connect, state.rtBackoff);
    state.rtBackoff = Math.min(30000, state.rtBackoff * 2);
  };
  const connect = () => {
    let ws;
    try {
      ws = new WebSocket(`${SUPABASE.url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE.anonKey)}&vsn=1.0.0`);
    } catch (e) {
      return retry();
    }
    state.ws = ws;
    let ref = 0;
    const send = (m) => {
      try {
        ws.send(JSON.stringify(m));
      } catch (e) {
        /* socket caiu: o onclose cuida */
      }
    };
    ws.onopen = () => {
      state.rtBackoff = 1000;
      send({
        topic: 'realtime:quimia-ranking',
        event: 'phx_join',
        payload: {
          config: { broadcast: { ack: false, self: false }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table: 'ranking_public' }] },
          access_token: SUPABASE.anonKey,
        },
        ref: String(++ref),
      });
      state.hb = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) }), 25000);
    };
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m.event === 'postgres_changes') debouncedRefresh();
      } catch (e) {
        /* mensagem que não interessa */
      }
    };
    ws.onclose = () => {
      clearInterval(state.hb);
      state.ws = null;
      retry();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch (e) {
        /* já fechado */
      }
    };
  };
  connect();
}

// ---------------- Status e ligação ----------------
export function status() {
  const pending = readOutbox().length;
  return {
    enabled: enabled(),
    pending,
    failures: state.failures,
    online: state.failures === 0 && state.readOk,
    lastOkAt: state.lastOkAt,
    lastError: state.lastError,
  };
}

/** Texto curtinho para o indicador (vazio quando a nuvem está desligada). */
export function statusText() {
  const s = status();
  if (!s.enabled) return '';
  if (!s.online) return `☁ sem conexão (${s.pending} pendentes)`;
  return s.pending ? `☁ enviando (${s.pending})…` : '☁ sincronizado';
}

export function on(evt, cb) {
  listeners[evt].add(cb);
  return () => listeners[evt].delete(cb);
}

// O Storage avisa aqui quando uma partida/contato é gravado (se a nuvem estiver desligada, não faz nada).
setSyncHook((kind, play) => (kind === 'play' ? enqueuePlay(play) : enqueueContact(play)));

/** Liga a nuvem (se houver configuração). Seguro chamar sempre: sem configuração não faz nada. */
export async function start({ realtime = false } = {}) {
  await supabaseReady;
  if (!enabled()) return false;
  if (state.started) {
    if (realtime) startRealtime();
    return true;
  }
  state.started = true;
  window.addEventListener('online', () => {
    state.failures = 0;
    pump();
    refreshRanking();
  });
  pump();
  refreshRanking();
  state.pollTimer = setInterval(() => {
    refreshRanking();
    if (readOutbox().length && !state.timer && !state.running) pump();
  }, POLL_MS);
  if (realtime) startRealtime();
  return true;
}

// Só para os testes
export function _setFetch(fn) {
  fetchImpl = fn || ((...a) => window.fetch(...a));
}
export function _reset() {
  clearTimeout(state.timer);
  state.timer = null;
  state.running = false;
  state.failures = 0;
  state.lastError = '';
  state.readOk = true;
  state.refreshing = false;
  cache = { at: 0, general: [], games: {} };
}

export const Cloud = {
  enabled, start, enqueuePlay, enqueueContact, enqueueAllLocal, flushNow, pump, status, statusText, on, rpc,
  refreshRanking, cachedRows, startRealtime, backoffMs, playBody,
};
