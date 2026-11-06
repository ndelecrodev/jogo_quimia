// Testes da camada de nuvem (fila de saída, idempotência, offline, segurança da chave).
// Eles usam o navegador (localStorage, window): rode em testes.html (sem Node). O Vitest ignora este arquivo.
import { describe, it, expect } from 'vitest';
import { SUPABASE, isSecretKey, validConfig } from '../src/config/supabase.js';
import * as Cloud from '../src/core/Cloud.js';
import { readOutbox, writeOutbox, addPlay, updatePlay, OUTBOX_KEY } from '../src/core/Storage.js';
import { mergePlays, rankGeneral, rankGame } from '../src/core/Ranking.js';

const CHAVES = ['quimia_arcade_v1', OUTBOX_KEY, 'quimia_cloud_ranking_v1', 'quimia_cloud_errors_v1', 'quimia_arcade_backup_v1'];

// Guarda e restaura o localStorage para o teste não bagunçar os dados reais deste navegador.
async function isolado(fn) {
  const salvo = Object.fromEntries(CHAVES.map((k) => [k, localStorage.getItem(k)]));
  const cfg = { ...SUPABASE };
  CHAVES.forEach((k) => localStorage.removeItem(k));
  Cloud._reset();
  try {
    await fn();
  } finally {
    Cloud._reset();
    Cloud._setFetch(null);
    Object.assign(SUPABASE, cfg);
    CHAVES.forEach((k) => (salvo[k] === null ? localStorage.removeItem(k) : localStorage.setItem(k, salvo[k])));
  }
}

const resp = (status, json) => ({ status, ok: status >= 200 && status < 300, json: async () => json });

// Servidor de mentira com o mesmo contrato do schema.sql (idempotente pelo id).
function servidor() {
  const plays = new Map();
  const s = { plays, chamadas: 0, modo: 'ok' };
  s.fetch = async (url, init) => {
    s.chamadas++;
    if (s.modo === 'caiu') throw new TypeError('Failed to fetch');
    if (s.modo === '503') return resp(503, { message: 'indisponivel' });
    const fn = url.split('/rpc/')[1];
    const body = JSON.parse(init.body);
    if (fn === 'submit_play') {
      const p = body.p;
      if (p.points < 0) return resp(400, { message: 'pontuacao invalida' });
      const inserted = !plays.has(p.id);
      if (inserted) plays.set(p.id, p);
      return resp(200, { ok: true, inserted });
    }
    if (fn === 'submit_contact') return plays.has(body.p_play_id) ? resp(200, { ok: true }) : resp(200, { ok: false, error: 'sem_partida' });
    if (fn === 'get_ranking') return resp(200, [...plays.values()].map((p) => ({ id: p.id, nick: p.nick, game: p.game, points: p.points, quimia: p.quimia, duration_ms: p.duration_ms, day: p.day, played_at: p.played_at, official: p.official })));
    return resp(404, {});
  };
  return s;
}

const ligar = (s) => {
  SUPABASE.url = 'https://teste.supabase.co';
  SUPABASE.anonKey = 'anon-key-de-teste-1234567890';
  SUPABASE.enabled = true;
  Cloud._setFetch(s.fetch);
};
const partida = (id, extra = {}) => ({ id: String(id), nick: `N${id}`, game: 'bolha', points: 20, quimia: 667, durationMs: 30000, ts: Date.now(), day: '2026-11-05', official: true, rankable: true, attemptNo: 1, code: `C${String(id).padStart(3, '0')}`.slice(0, 4), prizes: ['participacao'], ...extra });

describe('chave do Supabase', () => {
  it('recusa a chave secreta (service_role / sb_secret) e aceita a anon', () => {
    const jwt = (role) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.assinatura`;
    expect(isSecretKey(jwt('service_role'))).toBe(true);
    expect(isSecretKey('sb_secret_abcdefghijklmnopqrstuvwxyz')).toBe(true);
    expect(isSecretKey(jwt('anon'))).toBe(false);
    expect(isSecretKey('sb_publishable_abcdefghijklmnopqrstuvwxyz')).toBe(false);
  });

  it('só liga com https de verdade (http só em localhost) e chave válida', () => {
    const k = 'anon-key-de-teste-1234567890';
    expect(validConfig({ enabled: true, url: 'https://abc.supabase.co', anonKey: k })).toBe(true);
    expect(validConfig({ enabled: true, url: 'http://127.0.0.1:8787', anonKey: k })).toBe(true);
    expect(validConfig({ enabled: true, url: 'http://abc.supabase.co', anonKey: k })).toBe(false);
    expect(validConfig({ enabled: true, url: '', anonKey: k })).toBe(false);
    expect(validConfig({ enabled: true, url: 'https://abc.supabase.co', anonKey: '' })).toBe(false);
    expect(validConfig({ enabled: false, url: 'https://abc.supabase.co', anonKey: k })).toBe(false);
    expect(validConfig({ enabled: true, url: 'https://abc.supabase.co', anonKey: 'sb_secret_abcdefghijklmnopqrstuvwxyz' })).toBe(false);
  });
});

describe('espera entre tentativas', () => {
  it('5 s, 10 s, 20 s, 40 s e no máximo 60 s', () => {
    expect([1, 2, 3, 4, 5, 9].map(Cloud.backoffMs)).toEqual([5000, 10000, 20000, 40000, 60000, 60000]);
  });
});

describe('nuvem desligada', () => {
  it('não enfileira nem chama a rede: o jogo segue 100% local', async () => {
    await isolado(async () => {
      const s = servidor();
      Cloud._setFetch(s.fetch);
      SUPABASE.enabled = false;
      Cloud.enqueuePlay(partida(1));
      await Cloud.pump();
      expect(readOutbox().length).toBe(0);
      expect(s.chamadas).toBe(0);
      expect(Cloud.statusText()).toBe('');
    });
  });
});

describe('fila de saída (outbox)', () => {
  it('sem internet guarda tudo; ao voltar envia sem duplicar, mesmo reenviando', async () => {
    await isolado(async () => {
      const s = servidor();
      ligar(s);
      s.modo = 'caiu';
      [1, 2, 3].forEach((i) => Cloud.enqueuePlay(partida(i)));
      await Cloud.pump();
      expect(readOutbox().length).toBe(3);
      expect(s.plays.size).toBe(0);
      expect(Cloud.status().failures).toBe(1);
      expect(Cloud.statusText()).toBe('☁ sem conexão (3 pendentes)');

      s.modo = 'ok';
      await Cloud.flushNow();
      expect(readOutbox().length).toBe(0);
      expect(s.plays.size).toBe(3);
      expect(Cloud.statusText()).toBe('☁ sincronizado');

      [1, 2, 3].forEach((i) => Cloud.enqueuePlay(partida(i))); // reenvio do mesmo id
      await Cloud.flushNow();
      expect(s.plays.size).toBe(3);
    });
  });

  it('servidor fora do ar (503) segura a fila; dado recusado (400) é descartado sem travar o resto', async () => {
    await isolado(async () => {
      const s = servidor();
      ligar(s);
      s.modo = '503';
      Cloud.enqueuePlay(partida(1));
      await Cloud.pump();
      expect(readOutbox().length).toBe(1);

      s.modo = 'ok';
      Cloud.enqueuePlay(partida(2, { points: -5 })); // inválida: o servidor devolve 400
      Cloud.enqueuePlay(partida(3));
      await Cloud.flushNow();
      expect(readOutbox().length).toBe(0);
      expect([...s.plays.keys()].sort()).toEqual(['1', '3']);
    });
  });

  it('contato que chega antes da partida espera no fim da fila e não trava as outras', async () => {
    await isolado(async () => {
      const s = servidor();
      ligar(s);
      Cloud.enqueueContact(partida(9, { consent: true, contact: '@x', contactType: 'instagram' })); // partida 9 ainda não existe na nuvem
      Cloud.enqueuePlay(partida(8));
      await Cloud.pump();
      expect(s.plays.has('8')).toBe(true); // a partida 8 passou na frente
      expect(readOutbox().length).toBe(1); // o contato ficou esperando

      Cloud.enqueuePlay(partida(9));
      await Cloud.flushNow();
      await Cloud.flushNow();
      expect(readOutbox().length).toBe(0);
    });
  });

  it('o Storage empilha partida e contato; contato SEM consentimento nunca vai', async () => {
    await isolado(async () => {
      const s = servidor();
      ligar(s);
      addPlay(partida(21));
      expect(readOutbox().map((x) => `${x.k}:${x.id}`)).toEqual(['play:21']);
      updatePlay('21', { contact: '@sem', contactType: 'instagram', consent: false });
      expect(readOutbox().length).toBe(1);
      updatePlay('21', { contact: '@com', contactType: 'instagram', consent: true });
      expect(readOutbox().map((x) => x.k)).toEqual(['play', 'contact']);
      Cloud._reset();
    });
  });
});

describe('ranking: nuvem + local', () => {
  it('mescla sem duplicar (o local vale) e mantém o desempate: pontos, menor tempo, quem fez primeiro', () => {
    const local = [partida(1, { nick: 'ANA', quimia: 700 }), partida(2, { nick: 'BIA', quimia: 800, durationMs: 50000 })];
    const remoto = [
      { id: '1', nick: 'ANA', game: 'bolha', points: 21, quimia: 700, duration_ms: 30000, day: '2026-11-05', played_at: '2026-11-05T10:00:00Z', official: true },
      { id: '3', nick: 'CAIO', game: 'bolha', points: 24, quimia: 800, duration_ms: 40000, day: '2026-11-05', played_at: '2026-11-05T10:01:00Z', official: true },
    ];
    const todas = mergePlays(local, remoto);
    expect(todas.length).toBe(3); // id 1 só uma vez
    expect(rankGeneral(todas).map((p) => p.nick)).toEqual(['CAIO', 'BIA', 'ANA']); // CAIO e BIA empatam em 800: CAIO fez em menos tempo
    expect(rankGame(todas, 'bolha')[0].nick).toBe('CAIO');
  });
});
