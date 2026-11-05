// Painel admin oculto (Ctrl+Shift+A + PIN). Para a equipe do stand: conferir código de resgate,
// marcar brinde entregue, exportar/importar dados, resetar o dia e ajustar metas/brindes/evento.
import { getPlays, getSettings, setSettings, updatePlay, deletePlay, replacePlays } from '../core/Storage.js';
import { rankGeneral, dayKey } from '../core/Ranking.js';
import { GAMES, gameById } from '../config/games.js';
import { sfx } from '../core/Sfx.js';

let root = null;
let isOpen = false;
let filter = '';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const gameName = (id) => (gameById(id) ? gameById(id).name : id);

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
  renderPin();
}

function close() {
  isOpen = false;
  if (root) root.style.display = 'none';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

// ---------- PIN ----------
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

function checkPin() {
  const v = root.querySelector('#pin').value;
  if (String(v) === String(getSettings().adminPin)) renderMain();
  else renderPin('PIN incorreto.');
}

// ---------- Tela principal ----------
function renderMain() {
  const s = getSettings();
  const gameFields = (key, label) =>
    GAMES.map((g) => `<label>${label} — ${esc(g.name)}<input type="number" min="1" id="${key}_${g.id}" value="${s[key][g.id]}"></label>`).join('');
  root.innerHTML = `
    <div class="bar"><h1>Painel Admin Quimia</h1><button class="sec" data-act="close">Fechar (Esc)</button></div>
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
        <input type="file" id="importFile" accept=".json,application/json" style="display:none">
        <button class="danger" data-act="resetday">Resetar ranking do dia</button>
      </div>
      <div id="table"></div>
    </div>

    <h2>Configurações</h2>
    <div class="card">
      <div class="grid">
        ${gameFields('minScores', 'Meta do brinde (pontos)')}
        ${gameFields('pars', 'Par (Pontuação Quimia)')}
        <label>Brinde de participação<input type="text" id="prize_participacao" value="${esc(s.prizes.participacao)}"></label>
        <label>Brinde da meta<input type="text" id="prize_meta" value="${esc(s.prizes.meta)}"></label>
        <label>Prêmio Master<input type="text" id="prize_master" value="${esc(s.prizes.master)}"></label>
        <label>Tentativas oficiais por apelido<input type="number" min="1" id="maxAttempts" value="${s.maxAttempts}"></label>
        <label>Tempo máximo por partida (segundos)<input type="number" min="30" id="maxTimeSec" value="${Math.round(s.maxTimeMs / 1000)}"></label>
        <label>Hora do campeão (HH:MM)<input type="text" id="eventEnd" value="${esc(s.eventEnd)}"></label>
        <label>Instagram<input type="text" id="instagram" value="${esc(s.instagram)}"></label>
        <label>Hashtag<input type="text" id="hashtag" value="${esc(s.hashtag)}"></label>
        <label>Link do QR "Para você"<input type="text" id="urlUser" value="${esc(s.urlUser)}"></label>
        <label>Link do QR "Para empresas"<input type="text" id="urlCompany" value="${esc(s.urlCompany)}"></label>
        <label>PIN do admin<input type="text" id="adminPin" value="${esc(s.adminPin)}"></label>
      </div>
      <h2 style="margin-top:16px">Jogos no hub e opções</h2>
      <div class="grid">
        ${GAMES.map((g) => `<label class="chk"><input type="checkbox" id="en_${g.id}" ${s.enabledGames.includes(g.id) ? 'checked' : ''}> ${esc(g.name)}</label>`).join('')}
        <label class="chk"><input type="checkbox" id="muted" ${s.muted ? 'checked' : ''}> Som mutado</label>
        <label class="chk"><input type="checkbox" id="reduceFlash" ${s.reduceFlash ? 'checked' : ''}> Reduzir efeitos de piscar</label>
      </div>
      <p><button data-act="save">Salvar configurações</button> <span class="err" id="saveMsg"></span></p>
      <p style="color:#54A8B1">As mudanças valem a partir da próxima tela/partida.</p>
    </div>`;
  renderStats();
  renderTable();
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

function onClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  const id = b.dataset.id;
  if (act === 'close') close();
  else if (act === 'pin') checkPin();
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
    }
  } else if (act === 'csv') exportCsv();
  else if (act === 'json') exportJson();
  else if (act === 'import') root.querySelector('#importFile').click();
  else if (act === 'resetday') resetDay();
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

// Importar mescla partidas de outra estação (ignora as que já existem pelo id). Não mexe nas configurações.
function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.plays)) throw new Error('Arquivo sem lista de partidas.');
      const mine = getPlays();
      const ids = new Set(mine.map((p) => p.id));
      const novos = data.plays.filter((p) => p && p.id && p.nick && p.game && !ids.has(p.id));
      // Código de resgate repetido entre estações: avisa em vez de sobrescrever
      const codes = new Set(mine.map((p) => p.code).filter(Boolean));
      const repetidos = novos.filter((p) => p.code && codes.has(p.code)).length;
      replacePlays([...mine, ...novos]);
      renderStats();
      renderTable();
      alert(`Importadas ${novos.length} partida(s). ${data.plays.length - novos.length} já existiam.${repetidos ? `\nAtenção: ${repetidos} código(s) de resgate se repetem entre as estações; confira na entrega.` : ''}`);
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
}

// ---------- Configurações ----------
function saveSettings() {
  const v = (id) => root.querySelector(`#${id}`);
  const num = (id) => Number(v(id).value);
  const msg = root.querySelector('#saveMsg');
  const minScores = {};
  const pars = {};
  for (const g of GAMES) {
    minScores[g.id] = num(`minScores_${g.id}`);
    pars[g.id] = num(`pars_${g.id}`);
    if (!(minScores[g.id] > 0) || !(pars[g.id] > 0)) return (msg.textContent = `Metas e pares precisam ser números maiores que 0 (${g.name}).`);
  }
  const eventEnd = v('eventEnd').value.trim();
  if (!/^\d{1,2}:\d{2}$/.test(eventEnd)) return (msg.textContent = 'Hora do campeão deve ser HH:MM.');
  const pin = v('adminPin').value.trim();
  if (!pin) return (msg.textContent = 'O PIN não pode ficar vazio.');
  const enabledGames = GAMES.filter((g) => v(`en_${g.id}`).checked).map((g) => g.id);
  if (!enabledGames.length) return (msg.textContent = 'Deixe pelo menos um jogo no hub.');
  const maxAttempts = num('maxAttempts');
  const maxTimeSec = num('maxTimeSec');
  if (!(maxAttempts >= 1) || !(maxTimeSec >= 30)) return (msg.textContent = 'Tentativas ≥ 1 e tempo ≥ 30 s.');

  const patch = {
    minScores, pars, enabledGames, eventEnd, adminPin: pin, maxAttempts, maxTimeMs: maxTimeSec * 1000,
    prizes: { participacao: v('prize_participacao').value.trim(), meta: v('prize_meta').value.trim(), master: v('prize_master').value.trim() },
    instagram: v('instagram').value.trim(), hashtag: v('hashtag').value.trim(),
    urlUser: v('urlUser').value.trim(), urlCompany: v('urlCompany').value.trim(),
    muted: v('muted').checked, reduceFlash: v('reduceFlash').checked,
  };
  setSettings(patch);
  sfx.setMuted(patch.muted);
  msg.style.color = '#1EEE97';
  msg.textContent = 'Salvo!';
  setTimeout(() => ((msg.textContent = ''), (msg.style.color = '')), 2500);
  renderStats();
}

// Arquivo escolhido no "Importar JSON"
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'importFile' && e.target.files[0]) {
    importJson(e.target.files[0]);
    e.target.value = '';
  }
});
