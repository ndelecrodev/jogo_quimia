// Tela da TV (/ranking): Top 10 ao vivo, alterna Geral e jogos. Atualiza quando a janela do jogo grava algo.
import { getPlays, getSettings, onChange } from '../core/Storage.js';
import { rankGeneral, rankGame } from '../core/Ranking.js';
import { championCountdown } from '../core/clock.js';
import { GAMES } from '../config/games.js';

const app = document.getElementById('app');
app.innerHTML = `
  <header><h1>QUIMIA ARCADE</h1><div class="live">Ranking ao vivo</div></header>
  <h2 id="title"></h2>
  <ol id="list"></ol>
  <footer id="foot"></footer>`;
const titleEl = document.getElementById('title');
const listEl = document.getElementById('list');
const footEl = document.getElementById('foot');

let idx = 0;
const boards = () => [{ id: 'general', name: 'Ranking Geral' }, ...GAMES.filter((g) => getSettings().enabledGames.includes(g.id))];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function render() {
  const bs = boards();
  const b = bs[idx % bs.length];
  const plays = getPlays();
  const general = b.id === 'general';
  const list = (general ? rankGeneral(plays) : rankGame(plays, b.id)).slice(0, 10);
  titleEl.textContent = b.name;
  listEl.innerHTML = list.length
    ? list
        .map(
          (p, i) => `<li><span class="pos">${i + 1}</span><span class="nick">${esc(p.nick)}</span>
            <span class="pts">${general ? p.quimia : p.points}<span class="sub">${general ? 'pts Quimia' : 'pontos'}</span></span></li>`
        )
        .join('')
    : '<div class="empty">Seja o primeiro do ranking!</div>';
}

function rotate() {
  titleEl.classList.add('fade');
  listEl.classList.add('fade');
  setTimeout(() => {
    idx++;
    render();
    titleEl.classList.remove('fade');
    listEl.classList.remove('fade');
  }, 300);
}

function tick() {
  const c = championCountdown(getSettings().eventEnd);
  footEl.textContent = c ? `Campeão em ${c}` : 'Prêmio Master: o campeão será anunciado!';
}

render();
tick();
setInterval(tick, 1000);
setInterval(rotate, 8000);
onChange(render);
