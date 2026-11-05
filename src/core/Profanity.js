// Filtro simples de palavrões pt-BR para apelidos. Normaliza acentos e "leet" (4→a, 3→e, 0→o...).
const LONG = ['porra', 'caralho', 'merda', 'buceta', 'bosta', 'puta', 'foder', 'foda', 'viado', 'corno', 'cuzao', 'cuzinho', 'punheta', 'piranha', 'otario', 'babaca', 'arrombado', 'nazi', 'hitler', 'estupr'];
const EXACT = ['cu', 'fdp', 'pqp', 'vsf', 'tnc', 'krl', 'prr'];

function normalize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/[^a-z]/g, '');
}

export function isClean(nick) {
  const n = normalize(nick);
  if (EXACT.includes(n)) return false;
  return !LONG.some((w) => n.includes(w));
}
