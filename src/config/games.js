// Catálogo de jogos do hub. `ready:false` usa o jogo "em construção" (DummyGame).
export const GAMES = [
  {
    id: 'bolha',
    name: 'Kemi Bolha',
    scene: 'BubbleGame',
    ready: true,
    enabledByDefault: true,
    desc: 'Suba e desvie dos frascos.',
    tip: 'Aperte para subir',
    keys: 'ESPAÇO  ou  ✕',
  },
  {
    id: 'misturar',
    name: 'Pode Misturar?',
    scene: 'MixGame',
    ready: true,
    enabledByDefault: true,
    desc: 'Seguro ou perigoso? Decida rápido.',
    tip: 'Escolha um lado',
    keys: '←  SEGURO     PERIGOSO  →',
  },
  {
    id: 'sobe',
    name: 'Kemi Sobe',
    scene: 'SobeGame',
    ready: true,
    enabledByDefault: true,
    desc: 'Quique de prateleira em prateleira.',
    tip: 'Mova para os lados',
    keys: '←   →',
  },
  {
    id: 'runner',
    name: 'Kemi Runner',
    scene: 'RunnerGame',
    ready: true,
    enabledByDefault: true,
    desc: 'Corra pela estante, pule os frascos e abaixe nos vapores.',
    tip: 'Segure para pular mais alto  ·  ↓ abaixa',
    keys: 'ESPAÇO  ou  ✕',
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);
