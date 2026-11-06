// Catálogo de jogos do hub. `ready:false` usa o jogo "em construção" (DummyGame).
export const GAMES = [
  {
    id: 'bolha',
    name: 'Kemi Bolha',
    scene: 'BubbleGame',
    pose: 'side', // pose da Kemi no card do hub
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
    pose: 'wink',
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
    pose: 'happy',
    ready: true,
    enabledByDefault: true,
    desc: 'Pule de prateleira em prateleira.',
    tip: 'Mova para os lados',
    keys: '←   →',
  },
  {
    id: 'runner',
    name: 'Kemi Runner',
    scene: 'RunnerGame',
    pose: 'idle',
    ready: true,
    enabledByDefault: true,
    desc: 'Corra pela estante, pule os frascos e abaixe nos vapores.',
    tip: 'Segure para pular mais alto  ·  ↓ abaixa',
    keys: 'ESPAÇO  ou  ✕',
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id);
