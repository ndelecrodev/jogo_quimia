// Painel admin oculto (Ctrl+Shift+A + PIN). Para a equipe do stand: conferir código de resgate,
// marcar brinde entregue, exportar/importar dados, calibrar metas, zerar para abrir a feira e ajustar o evento.
import { getPlays, getSettings, setSettings, updatePlay, deletePlay, replacePlays, clearAllPlays } from '../core/Storage.js';
import { rankGeneral, dayKey, minRank } from '../core/Ranking.js';
import { GAMES, gameById } from '../config/games.js';
import { sfx } from '../core/Sfx.js';
import { isRealUrl, listarPendencias, hasPin } from '../core/pendencias.js';

let root = null;
let isOpen = false;
let filter = '';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const gameName = (id) => (gameById(id) ? gameById(id).name : id);

// ---------- PIN (guardado como hash; nunca em arquivo público) ----------
async function hashPin(pin) {
  const texto = `quimia-arcade:${pin}`;
  if (window.crypto && window.crypto.subtle) {
    const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return 'sha256:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `plain:${pin}`; // navegador sem crypto (http fora do localhost): o PIN fica só no navegador desta máquina
}

async function verifyPin(pin) {
  const s = getSettings();
  if (s.adminPinHash) return (await hashPin(pin)) === s.adminPinHash;
  if (s.adminPin && s.adminPin !== '2468') {
    // PIN antigo em texto puro: confere e migra para hash
    if (String(pin) !== String(s.adminPin)) return false;
    setSettings({ adminPinHash: await hashPin(pin), adminPin: null });
    return true;
  }
  return false;
}

export function toggleAdmin() {
  isOpen ? close() : show();
}

function ensureRoot() {
  if (root) return;
  root = document.createElement('div');
  root.id = 'admin';
  // O painel não deixa teclado/mouse "vazarem" para o jogo.
  ['keydown', 'keyup', 'pointerdown', 'pointerup', 'pointermove'].forEach((ev) => root.addEventListener(ev, (e) => e.stopPropagation()));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || (e.ctrlKey && e.shiftKey && e.code === 'KeyA')) close();
  });
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  document.body.appendChild(root);
}

function show() {
  ensureRoot();
  isOpen = true;
  root.style.display = 'block';
  if (hasPin(getSettings())) renderPin();
  else renderSetPin();
}

function close() {
  isOpen = false;
  if (root) root.style.display = 'none';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function renderPin(err = '') {
  root.innerHTML = `<div class="pin card"><h1>Admin Quimia</h1>
    <div>Digite o PIN</div>
    <input type="password" id="pin" autocomplete="off" inputmode="numeric">
    <div class="err">${esc(err)}</div>
    <button data-act="pin">Entrar</button> <button class="sec" data-act="close">Fechar</button></div>`;
  const pin = root.querySelector('#pin');
  pin.focus();
  pin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkPin();
  });
}

async function checkPin() {
  const v = root.querySelector('#pin').value;
  if (await verifyPin(v)) renderMain();
  else renderPin('PIN incorreto.');
}

// Primeira abertura: a pessoa cria o PIN (não existe PIN padrão)
function renderSetPin(err = '') {
  root.innerHTML = `<div class="pin card"><h1>Crie o PIN do admin</h1>
    <div>Primeira abertura neste navegador. Escolha um PIN (mínimo 4 números ou letras) e anote só com a equipe.</div>
    <input type="password" id="pin1" autocomplete="off" placeholder="PIN">
    <input type="password" id="pin2" autocomplete="off" placeholder="Repita o PIN">
    <div class="err">${esc(err)}</div>
    <button data-act="setpin">Criar PIN e entrar</button> <button class="sec" data-act="close">Fechar</button></div>`;
  root.querySelector('#pin1').focus();
}

async function createPin() {
  const a = root.querySelector('#pin1').value;
  const b = root.querySelector('#pin2').value;
  if (a.length < 4) return renderSetPin('O PIN precisa ter pelo menos 4 caracteres.');
  if (a !== b) return renderSetPin('Os dois PINs não são iguais.');
  setSettings({ adminPinHash: await hashPin(a), adminPin: null });
  renderMain();
}

// ---------- Estatísticas para calibrar metas ----------
function percentil(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function calibracao() {
  const plays = getPlays();
  const s = getSettings();
  return GAMES.map((g) => {
    const pts = plays.filter((p) => p.game === g.id && p.points > 0).map((p) => p.points).sort((a, b) => a - b);
    const med = percentil(pts, 0.5);
    return {
      g,
      n: pts.length,
      mediana: med,
      p40: percentil(pts, 0.4),
      p80: percentil(pts, 0.8),
      sugMeta: percentil(pts, 0.6), // ~40% das pessoas chegam nessa meta
      sugPar: med,
      meta: s.minScores[g.id],
      par: s.pars[g.id],
      minRank: minRank(s, g.id),
    };
  });
}
const num = (v) => (v == null ? '—' : String(Math.round(v)));

// ---------- Tela principal ----------
function renderMain() {
  const s = getSettings();
  const gameFields = (key, label, valor) =>
    GAMES.map((g) => `<label>${label} — ${esc(g.name)}<input type="number" min="1" id="${key}_${g.id}" value="${valor(g)}"></label>`).join('');
  root.innerHTML = `
    <div class="bar"><h1>Painel Admin Quimia</h1><button class="sec" data-act="close">Fechar (Esc)</button></div>
    <div id="pend"></div>
    <div class="stats" id="stats"></div>

    <h2>Buscar código de resgate</h2>
    <div class="card"><input type="text" id="filter" placeholder="Código (ex.: K7P2), apelido ou jogo" value="${esc(filter)}" style="width:min(420px,100%)">
      <div id="found"></div></div>

    <h2>Partidas</h2>
    <div class="card">
      <div class="bar" style="justify-content:flex-start">
        <button data-act="csv">Exportar CSV</button>
        <button data-act="json">Exportar JSON (backup)</button>
        <button class="sec" data-act="import">Importar JSON (mesclar)</button>
        <button class="sec" data-act="restore">Restaurar backup (substitui tudo)</button>
        <input type="file" id="importFile" accept=".json,application/json" style="display:none">
        <button class="danger" data-act="resetday">Resetar ranking do dia</button>
        <button class="danger" data-act="wipe">Zerar tudo para abrir a feira</button>
      </div>
      <div id="wipeBox"></div>
      <div id="table"></div>
    </div>

    <h2>Calibrar (metas e pares com as partidas já feitas)</h2>
    <div class="card"><div id="calib"></div>
      <p style="color:#54A8B1;margin:8px 0 0">Meta sugerida = percentil 60 (cerca de 40% das pessoas chegam). "Par" sugerido = mediana (a pessoa mediana faz 1000 pontos Quimia). "Usar" só preenche os campos abaixo: clique em <b>Salvar configurações</b> para valer.</p></div>

    <h2>Configurações</h2>
    <div class="card">
      <div class="grid">
        ${gameFields('minScores', 'Meta do brinde (pontos)', (g) => s.minScores[g.id])}
        ${gameFields('minRank', 'Mínimo para entrar no ranking', (g) => minRank(s, g.id))}
        ${gameFields('pars', 'Par (Pontuação Quimia)', (g) => s.pars[g.id])}
        <label>Brinde de participação<input type="text" id="prize_participacao" value="${esc(s.prizes.participacao)}"></label>
        <label>Brinde da meta<input type="text" id="prize_meta" value="${esc(s.prizes.meta)}"></label>
        <label>Prêmio Master<input type="text" id="prize_master" value="${esc(s.prizes.master)}"></label>
        <label>Tentativas oficiais por apelido<input type="number" min="1" id="maxAttempts" value="${s.maxAttempts}"></label>
        <label>Tempo máximo por partida (segundos)<input type="number" min="30" id="maxTimeSec" value="${Math.round(s.maxTimeMs / 1000)}"></label>
        <label>Hora do campeão (HH:MM, vazio = sem contagem)<input type="text" id="eventEnd" value="${esc(s.eventEnd)}"></label>
        <label>Instagram (ex.: @quimia.app)<input type="text" id="instagram" value="${esc(s.instagram)}"></label>
        <label>Hashtag (ex.: #QuimiaArcade)<input type="text" id="hashtag" value="${esc(s.hashtag)}"></label>
        <label>Link do QR "Para você" (https://…)<input type="text" id="urlUser" value="${esc(s.urlUser)}"></label>
        <label>Link do QR "Para empresas" (https://…)<input type="text" id="urlCompany" value="${esc(s.urlCompany)}"></label>
        <label>Novo PIN (vazio = manter)<input type="password" id="newPin" autocomplete="off"></label>
      </div>
      <h2 style="margin-top:16px">Jogos no hub e opções</h2>
      <div class="grid">
        ${GAMES.map((g) => `<label class="chk"><input type="checkbox" id="en_${g.id}" ${s.enabledGames.includes(g.id) ? 'checked' : ''}> ${esc(g.name)}</label>`).join('')}
        <label class="chk"><input type="checkbox" id="muted" ${s.muted ? 'checked' : ''}> Som mutado</label>
        <label class="chk"><input type="checkbox" id="reduceFlash" ${s.reduceFlash ? 'checked' : ''}> Reduzir efeitos de piscar</label>
      </div>
      <p><button data-act="save">Salvar configurações</button> <span class="err" id="saveMsg"></span></p>
      <p style="color:#54A8B1">As mudanças valem a partir da próxima tela/partida. Se link, Instagram, hashtag ou hora ficarem vazios, o jogo não mostra o item (os QR viram "Em breve").</p>
    </div>`;
  renderPend();
  renderStats();
  renderTable();
  renderCalib();
}

function renderPend() {
  const lista = listarPendencias(getSettings());
  root.querySelector('#pend').innerHTML = lista.length
    ? `<div class="card alert"><b>Falta preencher antes de abrir o stand (${lista.length}):</b><ul>${lista
        .map((p) => `<li>${esc(p.texto)} <span class="where">→ ${esc(p.onde)}</span></li>`)
        .join('')}</ul></div>`
    : '<div class="card okbox">Tudo preenchido: nenhuma pendência.</div>';
}

function playPrizes(p, s) {
  if (!p.official) return '<span class="tag">treino</span>';
  return (p.prizes || []).map((k) => esc(s.prizes[k])).join(' + ') || '—';
}

function renderStats() {
  const plays = getPlays();
  const s = getSettings();
  const official = plays.filter((p) => p.official);
  const withCode = official.filter((p) => p.code);
  const delivered = withCode.filter((p) => p.delivered).length;
  const leader = rankGeneral(plays)[0];
  root.querySelector('#stats').innerHTML = `
    <div class="stat"><b>${plays.length}</b>partidas</div>
    <div class="stat"><b>${official.length}</b>oficiais</div>
    <div class="stat"><b>${delivered}/${withCode.length}</b>brindes entregues</div>
    <div class="stat"><b>${plays.filter((p) => p.contact).length}</b>contatos</div>
    <div class="stat"><b>${leader ? esc(leader.nick) : '—'}</b>líder Master${leader ? ` (${leader.quimia} pts)` : ''} · ${esc(s.prizes.master)}</div>`;
}

function renderCalib() {
  const rows = calibracao().map(
    (c) => `<tr><td>${esc(c.g.name)}</td><td>${c.n}</td><td>${num(c.mediana)}</td><td>${num(c.p40)}</td><td>${num(c.p80)}</td>
      <td>${c.meta}</td><td>${c.par}</td><td>${c.minRank}</td>
      <td>${c.n >= 5 ? `meta ${num(c.sugMeta)} · par ${num(c.sugPar)} <button class="small sec" data-act="usesug" data-game="${c.g.id}">Usar</button>` : '<span class="tag">poucas partidas (mín. 5)</span>'}</td></tr>`
  );
  root.querySelector('#calib').innerHTML = `<table><tr><th>Jogo</th><th>Partidas</th><th>Mediana</th><th>P40</th><th>P80</th><th>Meta atual</th><th>Par atual</th><th>Mín. ranking</th><th>Sugestão</th></tr>${rows.join('')}</table>`;
}

function renderTable() {
  const s = getSettings();
  const q = filter.trim().toLowerCase();
  const all = getPlays().slice().sort((a, b) => b.ts - a.ts);
  const list = all.filter((p) => !q || (p.code || '').toLowerCase().includes(q) || p.nick.toLowerCase().includes(q) || gameName(p.game).toLowerCase().includes(q));

  // Resultado direto para código exato
  const exact = q.length === 4 ? all.find((p) => (p.code || '').toLowerCase() === q) : null;
  root.querySelector('#found').innerHTML = exact
    ? `<div class="card found"><b>${esc(exact.code)}</b> — ${esc(exact.nick)} · ${esc(gameName(exact.game))} · ${exact.points} pontos (${exact.quimia} Quimia)<br>
       Brindes: ${playPrizes(exact, s)} ·
       ${exact.delivered ? `<b style="color:#FF7A7A">JÁ ENTREGUE</b> em ${fmtDate(exact.deliveredAt || exact.ts)}` : '<b style="color:#1EEE97">AINDA NÃO ENTREGUE</b>'}
       <button class="small" data-act="deliver" data-id="${esc(exact.id)}">${exact.delivered ? 'Desmarcar entrega' : 'Marcar entregue'}</button></div>`
    : q.length === 4
    ? '<div class="err">Nenhum código com esse valor.</div>'
    : '';

  const rows = list.slice(0, 300).map(
    (p) => `<tr class="${p.official ? 'ok' : 'train'}">
      <td>${esc(fmtDate(p.ts))}</td><td>${esc(p.nick)}</td><td>${esc(gameName(p.game))}</td>
      <td>${p.points}</td><td>${p.quimia}</td><td><b>${esc(p.code || '—')}</b></td><td>${playPrizes(p, s)}</td>
      <td>${p.official && p.code ? `<button class="small ${p.delivered ? 'sec' : ''}" data-act="deliver" data-id="${esc(p.id)}">${p.delivered ? 'Entregue ✓' : 'Marcar entregue'}</button>` : '—'}</td>
      <td>${p.contact ? `${esc(p.contact)}${p.company ? '<span class="tag">empresa</span>' : ''}` : '—'}</td>
      <td><button class="small danger" data-act="del" data-id="${esc(p.id)}">Apagar</button></td></tr>`
  );
  root.querySelector('#table').innerHTML = `<table><tr><th>Data</th><th>Apelido</th><th>Jogo</th><th>Pontos</th><th>Quimia</th><th>Código</th><th>Brindes</th><th>Entrega</th><th>Contato</th><th></th></tr>${rows.join('')}</table>
    <div style="color:#54A8B1;margin-top:6px">${list.length} partida(s)${list.length > 300 ? ' (mostrando as 300 mais recentes)' : ''}</div>`;
}

// ---------- Eventos ----------
function onInput(e) {
  if (e.target.id === 'filter') {
    filter = e.target.value;
    renderTable();
  }
}

let restoreMode = false;

function onClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  const id = b.dataset.id;
  if (act === 'close') close();
  else if (act === 'pin') checkPin();
  else if (act === 'setpin') createPin();
  else if (act === 'deliver') {
    const p = getPlays().find((x) => x.id === id);
    if (p) updatePlay(id, { delivered: !p.delivered, deliveredAt: p.delivered ? null : Date.now() });
    renderStats();
    renderTable();
  } else if (act === 'del') {
    const p = getPlays().find((x) => x.id === id);
    if (p && confirm(`Apagar a partida de ${p.nick} (${gameName(p.game)}, ${p.points} pontos, código ${p.code || '—'})?`)) {
      deletePlay(id);
      renderStats();
      renderTable();
      renderCalib();
    }
  } else if (act === 'csv') exportCsv();
  else if (act === 'json') exportJson();
  else if (act === 'import') {
    restoreMode = false;
    root.querySelector('#importFile').click();
  } else if (act === 'restore') {
    if (confirm('Restaurar um backup JSON SUBSTITUI todas as partidas deste navegador pelas do arquivo.\n\nUm backup do estado atual será baixado antes. Continuar?')) {
      restoreMode = true;
      root.querySelector('#importFile').click();
    }
  } else if (act === 'resetday') resetDay();
  else if (act === 'wipe') renderWipe();
  else if (act === 'wipego') wipeEverything();
  else if (act === 'wipecancel') root.querySelector('#wipeBox').innerHTML = '';
  else if (act === 'usesug') useSuggestion(b.dataset.game);
  else if (act === 'save') saveSettings();
}

// ---------- Exportar / importar ----------
function download(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

function exportCsv() {
  const s = getSettings();
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['apelido', 'jogo', 'pontos', 'pontuacao_quimia', 'oficial', 'data_hora', 'codigo', 'brindes', 'entregue', 'contato', 'tipo_contato', 'consentimento_lgpd', 'empresa'];
  const lines = getPlays()
    .slice()
    .sort((a, b) => a.ts - b.ts)
    .map((p) =>
      [p.nick, gameName(p.game), p.points, p.quimia, p.official ? 'sim' : 'nao', new Date(p.ts).toLocaleString('pt-BR'), p.code || '',
        (p.prizes || []).map((k) => s.prizes[k]).join(' + '), p.delivered ? 'sim' : 'nao', p.contact || '', p.contactType || '', p.consent ? 'sim' : 'nao', p.company ? 'sim' : 'nao'].map(q).join(';')
    );
  download(`quimia-arcade-${stamp()}.csv`, '﻿' + [head.join(';'), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
}

function exportJson(prefix = 'quimia-arcade-backup') {
  const data = { versao: 1, exportadoEm: new Date().toISOString(), plays: getPlays(), settings: getSettings() };
  download(`${prefix}-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

// Importar mescla partidas de outra estação (ignora as que já existem pelo id). Restaurar substitui tudo.
function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.plays)) throw new Error('Arquivo sem lista de partidas.');
      const validas = data.plays.filter((p) => p && p.id && p.nick && p.game);
      if (restoreMode) {
        exportJson('quimia-arcade-backup-antes-de-restaurar');
        replacePlays(validas);
        alert(`Backup restaurado: ${validas.length} partida(s).`);
      } else {
        const mine = getPlays();
        const ids = new Set(mine.map((p) => p.id));
        const novos = validas.filter((p) => !ids.has(p.id));
        const codes = new Set(mine.map((p) => p.code).filter(Boolean));
        const repetidos = novos.filter((p) => p.code && codes.has(p.code)).length;
        replacePlays([...mine, ...novos]);
        alert(`Importadas ${novos.length} partida(s). ${data.plays.length - novos.length} já existiam.${repetidos ? `\nAtenção: ${repetidos} código(s) de resgate se repetem entre as estações; confira na entrega.` : ''}`);
      }
      restoreMode = false;
      renderStats();
      renderTable();
      renderCalib();
    } catch (err) {
      alert(`Não foi possível importar: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function resetDay() {
  const today = dayKey(Date.now());
  const todays = getPlays().filter((p) => p.day === today || dayKey(p.ts) === today);
  if (!todays.length) return alert('Não há partidas de hoje.');
  if (!confirm(`Apagar as ${todays.length} partida(s) de hoje do ranking?\n\nUm backup em JSON será baixado antes.`)) return;
  exportJson('quimia-arcade-backup-antes-do-reset');
  replacePlays(getPlays().filter((p) => dayKey(p.ts) !== today));
  renderStats();
  renderTable();
  renderCalib();
}

// "Zerar tudo para abrir a feira": confirma com o PIN, apaga partidas, contatos, códigos e o backup automático
function renderWipe() {
  const n = getPlays().length;
  root.querySelector('#wipeBox').innerHTML = `<div class="card alert">
    <b>Zerar tudo para abrir a feira</b><br>
    Apaga TODAS as ${n} partida(s), contatos, códigos de resgate e o backup automático deste navegador. As configurações ficam.<br>
    <label class="chk" style="margin:8px 0"><input type="checkbox" id="wipeBackup" checked> Baixar um backup JSON antes de apagar</label>
    <input type="password" id="wipePin" placeholder="Digite o PIN para confirmar" autocomplete="off">
    <button class="danger" data-act="wipego">Apagar tudo</button> <button class="sec" data-act="wipecancel">Cancelar</button>
    <div class="err" id="wipeMsg"></div></div>`;
  root.querySelector('#wipePin').focus();
}

async function wipeEverything() {
  const msg = root.querySelector('#wipeMsg');
  if (!(await verifyPin(root.querySelector('#wipePin').value))) return (msg.textContent = 'PIN incorreto.');
  if (root.querySelector('#wipeBackup').checked) exportJson('quimia-arcade-backup-antes-de-zerar');
  clearAllPlays();
  root.querySelector('#wipeBox').innerHTML = '<div class="card okbox">Tudo zerado. O ranking está vazio e pronto para abrir.</div>';
  renderStats();
  renderTable();
  renderCalib();
}

function useSuggestion(gameId) {
  const c = calibracao().find((x) => x.g.id === gameId);
  if (!c || c.n < 5) return;
  root.querySelector(`#minScores_${gameId}`).value = Math.max(1, Math.round(c.sugMeta));
  root.querySelector(`#pars_${gameId}`).value = Math.max(1, Math.round(c.sugPar));
  const msg = root.querySelector('#saveMsg');
  msg.style.color = '#5ADFEA';
  msg.textContent = `Sugestão de ${c.g.name} preenchida abaixo: clique em "Salvar configurações".`;
}

// ---------- Configurações ----------
function saveSettings() {
  const v = (id) => root.querySelector(`#${id}`);
  const n = (id) => Number(v(id).value);
  const msg = root.querySelector('#saveMsg');
  msg.style.color = '';
  const minScores = {};
  const pars = {};
  const minRankObj = {};
  for (const g of GAMES) {
    minScores[g.id] = n(`minScores_${g.id}`);
    pars[g.id] = n(`pars_${g.id}`);
    minRankObj[g.id] = n(`minRank_${g.id}`);
    if (!(minScores[g.id] > 0) || !(pars[g.id] > 0) || !(minRankObj[g.id] > 0)) return (msg.textContent = `Metas, mínimos e pares precisam ser números maiores que 0 (${g.name}).`);
  }
  const eventEnd = v('eventEnd').value.trim();
  if (eventEnd && !/^\d{1,2}:\d{2}$/.test(eventEnd)) return (msg.textContent = 'Hora do campeão deve ser HH:MM (ou vazia).');
  const urlUser = v('urlUser').value.trim();
  const urlCompany = v('urlCompany').value.trim();
  for (const [nome, u] of [['Para você', urlUser], ['Para empresas', urlCompany]]) {
    if (u && !isRealUrl(u)) return (msg.textContent = `Link do QR "${nome}": use um endereço real começando com https:// (não vale exemplo/localhost). Vazio mostra "Em breve".`);
  }
  const newPin = v('newPin').value;
  if (newPin && newPin.length < 4) return (msg.textContent = 'O novo PIN precisa ter pelo menos 4 caracteres.');
  const enabledGames = GAMES.filter((g) => v(`en_${g.id}`).checked).map((g) => g.id);
  if (!enabledGames.length) return (msg.textContent = 'Deixe pelo menos um jogo no hub.');
  const maxAttempts = n('maxAttempts');
  const maxTimeSec = n('maxTimeSec');
  if (!(maxAttempts >= 1) || !(maxTimeSec >= 30)) return (msg.textContent = 'Tentativas ≥ 1 e tempo ≥ 30 s.');

  const patch = {
    minScores, pars, minRank: minRankObj, enabledGames, eventEnd, maxAttempts, maxTimeMs: maxTimeSec * 1000,
    prizes: { participacao: v('prize_participacao').value.trim(), meta: v('prize_meta').value.trim(), master: v('prize_master').value.trim() },
    instagram: v('instagram').value.trim(), hashtag: v('hashtag').value.trim(), urlUser, urlCompany,
    muted: v('muted').checked, reduceFlash: v('reduceFlash').checked,
  };
  const finish = () => {
    setSettings(patch);
    sfx.setMuted(patch.muted);
    v('newPin').value = '';
    msg.style.color = '#1EEE97';
    msg.textContent = 'Salvo!';
    setTimeout(() => ((msg.textContent = ''), (msg.style.color = '')), 2500);
    renderPend();
    renderStats();
    renderCalib();
  };
  if (newPin) hashPin(newPin).then((h) => { patch.adminPinHash = h; patch.adminPin = null; finish(); });
  else finish();
}

// Arquivo escolhido no "Importar JSON"/"Restaurar"
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'importFile' && e.target.files[0]) {
    importJson(e.target.files[0]);
    e.target.value = '';
  }
});
