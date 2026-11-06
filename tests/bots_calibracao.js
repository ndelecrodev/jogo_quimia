// Bots para CALIBRAR dificuldade e pontuação (rode no navegador, em testes.html ou no jogo: window.__quimia).
// NÃO são humanos: servem para comparar os 4 jogos entre si e achar vãos impossíveis. Recalibre sempre com partidas reais.
//
// Uso (no console, com o jogo aberto): const { calibrar } = await import('./tests/bots_calibracao.js');
//   const r = await calibrar({ games: ['bolha'], skills: ['medio'], n: 10 }); console.table(r.resumo);
import { scaleScore, SCORE_SCALE } from '../src/config/difficulty.js';

const SKILLS = {
  // aim: erro de mira (px) | every: intervalo de decisão (ms) | lag: atraso de reação (ms)
  bolha: { iniciante: { aim: 55, every: 170, lag: 130 }, medio: { aim: 32, every: 110, lag: 80 }, bom: { aim: 16, every: 50, lag: 30 }, perfeito: { aim: 0, every: 16, lag: 0 } },
  // rt: tempo de reação mediano (ms) | acc: acerto
  misturar: { iniciante: { rt: 1700, acc: 0.72 }, medio: { rt: 1200, acc: 0.86 }, bom: { rt: 850, acc: 0.95 } },
  // jit: erro de tempo do pulo (s) | miss: chance de errar o pulo
  runner: { iniciante: { jit: 0.13, miss: 0.1 }, medio: { jit: 0.08, miss: 0.05 }, bom: { jit: 0.04, miss: 0.012 } },
  // react: ms entre decisões | err: erro de direção (px) | cloud: chance de desviar do vapor
  sobe: { iniciante: { react: 260, err: 130, cloud: 0.4 }, medio: { react: 160, err: 80, cloud: 0.75 }, bom: { react: 80, err: 35, cloud: 0.97 } },
};
const SCENE = { bolha: 'BubbleGame', misturar: 'MixGame', sobe: 'SobeGame', runner: 'RunnerGame' };
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
let OFF = 55;
// cede o fio sem sofrer o limite de 1 s dos temporizadores em aba escondida
const wait = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });

export const setOff = (v) => { OFF = v; };
export function pct(arr, q) {
  const a = [...arr].sort((x, y) => x - y);
  if (!a.length) return 0;
  const i = (a.length - 1) * q;
  const lo = Math.floor(i);
  return a[lo] + (a[Math.min(a.length - 1, lo + 1)] - a[lo]) * (i - lo);
}

function makeBot(game, skill, sc) {
  const S = SKILLS[game][skill];
  const st = { t: 0, acc: 0, next: 0, queue: [], held: new Set(), press: new Set(), axis: 0, memo: {} };
  const decide = {
    bolha() {
      // alvo: centro do próximo vão (com erro de mira fixo por frasco)
      const pipe = sc.pipes.find((p) => p.x + 75 > 560 - 56);
      if (!pipe) return;
      if (pipe.aimErr === undefined) pipe.aimErr = gauss() * S.aim;
      const tgt = pipe.center + pipe.aimErr;
      const dtp = (S.lag + 16) / 1000;
      const pred = sc.kemi.y + sc.vy * dtp + 0.5 * 1900 * dtp * dtp;
      if (window.__trace) window.__trace.push([Math.round(st.t), Math.round(sc.kemi.y), Math.round(sc.vy), Math.round(tgt), Math.round(pipe.x), sc.lives]);
      if (pred > tgt + OFF && sc.vy > -60) st.queue.push({ at: st.t + S.lag, a: 'flap' });
    },
    misturar() {
      const r = sc.round;
      if (!r || sc.locked) return;
      if (r.botRt === undefined) {
        r.botRt = S.rt * Math.exp(gauss() * 0.25) + 300;
        r.botOk = Math.random() < S.acc;
      }
      if (r.limit - r.left >= r.botRt) {
        const certa = r.pair.perigosa ? 'danger' : 'safe';
        const erra = certa === 'danger' ? 'safe' : 'danger';
        st.queue.push({ at: st.t, a: (r.botOk ? certa : erra) === 'danger' ? 'right' : 'left' });
        r.botRt = 1e9;
      }
    },
    runner() {
      const speed = sc.speed;
      const KX = 420;
      for (const o of sc.obstacles) {
        const d = o.x - o.w / 2 - (KX + 40);
        if (d < -20 || d > speed * 0.6) continue;
        if (o.botSeen === undefined) {
          o.botSeen = true;
          o.botMiss = Math.random() < S.miss;
          o.botLead = (o.kind === 'cloud' ? 0.35 : 0.27 + o.w / speed / 2) + gauss() * S.jit;
        }
        if (o.botMiss || !sc.onGround) continue;
        const tt = d / speed;
        if (o.kind === 'cloud') {
          if (tt < o.botLead) st.held.add('down');
        } else if (tt <= o.botLead && !o.botJumped) {
          o.botJumped = true;
          st.queue.push({ at: st.t, a: 'jump', hold: 520 });
        }
      }
    },
    sobe() {
      const k = sc.kemi;
      const plats = sc.plats.filter((p) => !p.broken && p.key !== 'plat_b');
      let tx = k.x;
      // compromete-se com uma prateleira-alvo até ela ficar inválida (senão a mira fica trocando de lado)
      const m = st.memo;
      const valido = m.plat && plats.includes(m.plat) && (m.dir === 'up' ? m.plat.s.y < k.y - 20 : m.plat.s.y > k.y + 20);
      const dir = sc.vy > 0 ? 'down' : 'up';
      if (!valido || m.dir !== dir) {
        m.dir = dir;
        const cand = dir === 'down'
          ? plats.filter((p) => p.s.y > k.y + 20 && p.s.y < k.y + 380 && Math.abs(p.s.x - k.x) < 320).sort((a, b) => a.s.y - b.s.y)
          : plats.filter((p) => p.s.y < k.y - 30 && p.s.y > k.y - 240).sort((a, b) => Math.abs(a.s.x - k.x) + (k.y - a.s.y) * -0.3 - (Math.abs(b.s.x - k.x) + (k.y - b.s.y) * -0.3));
        m.plat = cand[0] || null;
      }
      if (m.plat) tx = m.plat.s.x;
      tx += gauss() * S.err;
      for (const c of sc.clouds || []) {
        if (Math.abs(c.s.y - k.y) < 190 && Math.abs(c.s.x - tx) < 230 && Math.random() < S.cloud) tx = c.s.x + (tx >= c.s.x ? 260 : -260);
      }
      if (window.__trace) window.__trace.push([Math.round(st.t), Math.round(k.x), Math.round(k.y), Math.round(sc.vy), Math.round(tx), Math.round(sc.height), plats.length]);
      st.memo.tx = tx;
    },
  };
  return {
    tick(dtMs) {
      st.t += dtMs;
      st.press.clear();
      if (game !== 'misturar' || true) {
        if (st.t >= st.next) {
          decide[game]();
          st.next = st.t + (game === 'bolha' ? S.every : game === 'sobe' ? S.react : 16);
        }
      }
      for (let i = st.queue.length - 1; i >= 0; i--) {
        const q = st.queue[i];
        if (st.t >= q.at) {
          st.queue.splice(i, 1);
          if (q.a === 'flap') st.press.add('action');
          else if (q.a === 'left') st.press.add('left');
          else if (q.a === 'right') st.press.add('right');
          else if (q.a === 'jump') {
            st.press.add('action');
            st.held.add('action');
            st.releaseAt = st.t + q.hold;
          }
        }
      }
      if (st.releaseAt && st.t >= st.releaseAt) {
        st.held.delete('action');
        st.releaseAt = 0;
      }
      if (game === 'runner' && st.held.has('down') && sc.onGround) {
        // solta o "abaixar" quando o vapor já passou
        const c = sc.obstacles.find((o) => o.kind === 'cloud' && o.x + o.w / 2 > 420 - 40 && o.x - o.w / 2 < 420 + 300);
        if (!c) st.held.delete('down');
      }
      if (game === 'sobe') st.axis = Math.max(-1, Math.min(1, ((st.memo.tx ?? sc.kemi.x) - sc.kemi.x) / 160));
    },
    pressed: (a) => st.press.has(a),
    held: (a) => st.held.has(a),
    axisX: () => st.axis,
  };
}

async function umaPartida(game, skill, input) {
  const g = window.__quimia;
  const key = SCENE[game];
  g.registry.set('nick', 'BOT');
  g.registry.set('solo', true);
  for (const s of g.scene.getScenes(true)) if (s.scene.key !== key) g.scene.stop(s.scene.key);
  g.scene.start(key);
  let t = performance.now();
  const passo = (dt = 1000 / 60) => {
    t += dt;
    g.step(t, dt);
  };
  for (let i = 0; i < 6; i++) passo();
  const sc = g.scene.getScene(key);
  sc.sys.settings.visible = false; // sem desenhar: bem mais rápido
  sc.enteredAt = -1e9;
  let res = null;
  sc.finish = (reason) => {
    if (res) return;
    res = { raw: sc.points, score: scaleScore(game, sc.points), ms: Math.round(sc.elapsed), reason, level: sc.level };
    sc.ended = true;
  };
  const bot = makeBot(game, skill, sc);
  const orig = { pressed: input.pressed, held: input.held, axisX: input.axisX };
  input.pressed = (a) => bot.pressed(a);
  input.held = (a) => bot.held(a);
  input.axisX = () => bot.axisX();
  let first = true;
  try {
    for (let i = 0; i < 9000 && !res; i++) {
      if (first) {
        // apertar para começar
        bot.pressed = (a) => a === 'action' || a === 'right' || a === 'left';
        input.pressed = (a) => bot.pressed(a) && (game !== 'misturar' || a === 'right');
        passo();
        first = false;
        const b2 = makeBot(game, skill, sc);
        Object.assign(bot, b2);
        input.pressed = (a) => bot.pressed(a);
        input.held = (a) => bot.held(a);
        input.axisX = () => bot.axisX();
        continue;
      }
      bot.tick(1000 / 60);
      passo();
      if (i % 1500 === 1499) await wait();
    }
  } finally {
    Object.assign(input, orig);
  }
  if (!res) res = { raw: sc.points, score: scaleScore(game, sc.points), ms: Math.round(sc.elapsed), reason: 'limite', level: sc.level };
  return res;
}

export async function calibrar({ games = ['bolha', 'misturar', 'sobe', 'runner'], skills = ['iniciante', 'medio', 'bom'], n = 30, onProgress } = {}) {
  const { input } = await import('../src/core/InputManager.js');
  const S = await import('../src/config/supabase.js');
  await S.supabaseReady;
  S.SUPABASE.enabled = false; // nunca mandar partida de bot para a nuvem
  const g = window.__quimia;
  g.loop.sleep();
  input.touch();
  // guarda cada combinação pronta no localStorage ("bots_tmp"): se a aba cair (o WebGL do navegador esgota depois de centenas
  // de partidas), basta recarregar e chamar de novo: o que já terminou é pulado. Apague com localStorage.removeItem('bots_tmp').
  const guardado = JSON.parse(localStorage.getItem('bots_tmp') || '{}');
  const todos = {};
  const resumo = [];
  for (const game of games) {
    for (const skill of skills) {
      const chave = `${game}/${skill}/${n}`;
      let runs = guardado[chave];
      if (!runs) {
        runs = [];
        for (let i = 0; i < n; i++) {
          input.touch();
          runs.push(await umaPartida(game, skill, input));
          onProgress && onProgress(game, skill, i + 1);
        }
        guardado[chave] = runs;
        localStorage.setItem('bots_tmp', JSON.stringify(guardado));
      }
      todos[`${game}/${skill}`] = runs;
      const sc = runs.map((r) => scaleScore(game, r.raw)); // recalcula pela escala atual
      const ms = runs.map((r) => r.ms / 1000);
      resumo.push({
        jogo: game,
        nivel: skill,
        mediana: Math.round(pct(sc, 0.5)),
        p40: Math.round(pct(sc, 0.4)),
        p80: Math.round(pct(sc, 0.8)),
        seg_med: Math.round(pct(ms, 0.5)),
        seg_p20: Math.round(pct(ms, 0.2)),
        seg_p80: Math.round(pct(ms, 0.8)),
        no_teto: runs.filter((r) => r.reason === 'time' || r.reason === 'limite').length,
        escala: SCORE_SCALE[game],
      });
    }
  }
  return { resumo, todos };
}
