// Tokens do UI Kit Quimia v2 (tema "Usuário"). Não invente novas cores: use estas.
export const COLORS = {
  // Fundos
  bg: '#142024',
  card: '#1A292F',
  elevated: '#12464D',
  elevated2: '#1D6670',
  base: '#34465A',
  darkText: '#1E2222',
  // Destaques
  neon: '#1EEE97', // CTA e destaques
  cyan: '#5ADFEA', // símbolo e ícones
  greenDark: '#2DBC93', // texto de destaque
  greenMid: '#00DC9D', // hover de botões
  cyanLight: '#4CF1FF', // fundos de seção
  cyanDark: '#02C1D6', // fundos de cards
  // Apoio (verdes e cianos do kit)
  success: '#0AA074',
  success2: '#25A783',
  success3: '#296553',
  teal1: '#176C83',
  teal2: '#0F6B78',
  teal3: '#2C7B82',
  sky: '#3EC5D4',
  sky2: '#54A8B1',
  mint1: '#86DEC6',
  mint2: '#88ECE5',
  mint3: '#73F1C9',
  // EXTENSÃO (não vem do kit): perigo/erro em vermelho-coral suave
  danger: '#FF7A7A',
  // Texto
  white: '#F4FFFE',
};

export const hex = (c) => parseInt(c.slice(1), 16);

export const FONT = {
  title: 'Nunito, sans-serif',
  body: '"PT Sans", sans-serif',
};

// Escala para tela grande de stand (visto a 2–3 m): UI Kit x 1,6.
export const SCALE = 1.6;

// Escala tipográfica do kit (px base, antes do SCALE).
export const TYPE = {
  display: { font: 'title', weight: 800, size: 56 },
  h1: { font: 'title', weight: 800, size: 40 },
  h2: { font: 'title', weight: 800, size: 32 },
  h3: { font: 'title', weight: 700, size: 24 },
  bodyL: { font: 'body', weight: 400, size: 18 },
  body: { font: 'body', weight: 400, size: 16 },
  bodyS: { font: 'body', weight: 400, size: 14 },
  caption: { font: 'body', weight: 400, size: 12 },
  label: { font: 'title', weight: 700, size: 14 },
  overline: { font: 'title', weight: 700, size: 12 },
  buttonL: { font: 'title', weight: 800, size: 18 },
  buttonM: { font: 'title', weight: 800, size: 16 },
  buttonS: { font: 'title', weight: 800, size: 14 },
};

/** Estilo de texto do Phaser a partir da escala do kit. */
export function ts(kind, extra = {}) {
  const t = TYPE[kind];
  return {
    fontFamily: t.font === 'title' ? FONT.title : FONT.body,
    fontStyle: String(t.weight),
    fontSize: `${Math.round(t.size * SCALE)}px`,
    color: COLORS.white,
    ...extra,
  };
}

export const RADIUS = { card: 24, button: 20 };
