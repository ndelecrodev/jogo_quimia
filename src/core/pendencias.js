// O que ainda falta preencher para a feira. Usado pelo painel admin (alerta vermelho) e pela tela do convite.
import { MISTURAS } from '../config/misturas.js';
import { PRIZES } from '../config/prizes.js';

/** URL "de verdade": http(s) com domínio, que não seja exemplo/localhost. */
export function isRealUrl(u) {
  const s = String(u || '').trim();
  const m = /^https?:\/\/([^\s/?#]+)/i.exec(s);
  if (!m) return false;
  const host = m[1].toLowerCase();
  return host.includes('.') && !host.includes('example') && !host.startsWith('localhost') && !host.startsWith('127.');
}

export function hasPin(settings) {
  return !!settings.adminPinHash || (!!settings.adminPin && settings.adminPin !== '2468');
}

/** Lista de pendências: { id, texto, onde } */
export function listarPendencias(s) {
  const p = [];
  if (!hasPin(s)) p.push({ id: 'pin', texto: 'PIN do admin ainda não foi criado', onde: 'Admin > Configurações > PIN' });
  if (!isRealUrl(s.urlUser)) p.push({ id: 'urlUser', texto: 'QR "Para você" ainda não tem link real (o jogo mostra "Em breve")', onde: 'Admin > Configurações, ou src/config/event.js (urlUser)' });
  if (!isRealUrl(s.urlCompany)) p.push({ id: 'urlCompany', texto: 'QR "Para empresas" ainda não tem link real (o jogo mostra "Em breve")', onde: 'Admin > Configurações, ou src/config/event.js (urlCompany)' });
  if (!String(s.instagram || '').trim()) p.push({ id: 'instagram', texto: 'Instagram não definido (a marcação some do convite)', onde: 'Admin > Configurações, ou src/config/event.js (instagram)' });
  if (!String(s.hashtag || '').trim()) p.push({ id: 'hashtag', texto: 'Hashtag não definida', onde: 'Admin > Configurações, ou src/config/event.js (hashtag)' });
  if (!/^\d{1,2}:\d{2}$/.test(String(s.eventEnd || '').trim())) p.push({ id: 'eventEnd', texto: 'Hora do campeão não definida (a contagem regressiva não aparece)', onde: 'Admin > Configurações, ou src/config/event.js (endTime)' });
  const igual = (a, b) => String(a).trim() === String(b).trim();
  if (igual(s.prizes.participacao, PRIZES.names.participacao) || igual(s.prizes.meta, PRIZES.names.meta) || igual(s.prizes.master, PRIZES.names.master)) {
    p.push({ id: 'prizes', texto: 'Nomes dos brindes ainda são os padrão: confirme os reais', onde: 'Admin > Configurações, ou src/config/prizes.js' });
  }
  const aValidar = MISTURAS.filter((m) => m.validar).length;
  if (aValidar) p.push({ id: 'misturas', texto: `${aValidar} par(es) do Pode Misturar? ainda sem validação das FDS`, onde: 'src/config/misturas.js (campo validar) — ver PENDENCIAS.md' });
  return p;
}
