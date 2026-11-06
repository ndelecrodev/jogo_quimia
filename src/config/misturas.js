// Pares do "Pode Misturar?".
//
// Segurança química: a equipe do projeto conferiu TODOS os pares abaixo contra as FDS (`validar: false`).
// Ao incluir um par novo, ponha `validar: true` nele até conferir (o admin volta a avisar).
// Se quiser que só pares conferidos apareçam no jogo, ponha SOMENTE_VALIDADOS = true.
// Para trocar tudo pelas regras do simulador do app: python scripts/importar_misturas.py dados/misturas.csv
//
// A ORDEM importa: os primeiros pares entram no começo do jogo; os demais vão sendo liberados por nível.
// A lista alterna seguro/perigoso (12 de cada) e há perigosos SEM água sanitária e seguros com produtos parecidos,
// para não existir "atalho" do tipo "tem água sanitária = perigoso".
//
// cor  = nome de uma cor do theme.js ou um hex (#RRGGBB).
// forma = silhueta do frasco: galao, spray, frasco, garrafa, pote, squeeze, caixa, barra, copo, limao, lata.

export const SOMENTE_VALIDADOS = false;

export const PRODUTOS = {
  sanitaria: { nome: 'Água sanitária', cor: 'cyanLight', forma: 'galao' },
  vinagre: { nome: 'Vinagre', cor: 'mint1', forma: 'garrafa' },
  amoniaco: { nome: 'Amoníaco', cor: 'mint3', forma: 'frasco' },
  limpavidros: { nome: 'Limpa-vidros com amônia', cor: 'sky', forma: 'spray' },
  alcool: { nome: 'Álcool', cor: 'mint2', forma: 'garrafa' },
  removedor: { nome: 'Removedor ácido (limpa-pedra)', cor: 'greenDark', forma: 'galao' },
  oxigenada: { nome: 'Água oxigenada', cor: '#8B5A2B', forma: 'frasco' },
  limao: { nome: 'Suco de limão', cor: '#E8DE5A', forma: 'limao' },
  detergente: { nome: 'Detergente neutro', cor: 'cyan', forma: 'squeeze' },
  bicarbonato: { nome: 'Bicarbonato de sódio', cor: 'white', forma: 'pote' },
  sabaococo: { nome: 'Sabão de coco', cor: '#EFE6CE', forma: 'barra' },
  desentupidor: { nome: 'Desentupidor (soda cáustica)', cor: 'teal1', forma: 'lata' },
  desinfetante: { nome: 'Desinfetante', cor: 'success2', forma: 'garrafa' },
  sabaoempo: { nome: 'Sabão em pó', cor: 'sky2', forma: 'caixa' },
  agua: { nome: 'Água', cor: 'cyanLight', forma: 'copo' },
};

const F = 'FDS';
const OK = 'Não reagem de forma perigosa. Mesmo assim, leia o rótulo.';
const DIL = 'Diluir em água é o uso normal. Siga a dose do rótulo.';
// validar: true = ainda não conferido com a FDS (o admin avisa). Todos os pares atuais já foram conferidos pela equipe.
const par = (a, b, perigosa, porque, validar = false) => ({ a, b, perigosa, porque, fonte: F, validar });

export const MISTURAS_TODAS = [
  par('detergente', 'bicarbonato', false, OK),
  par('sanitaria', 'vinagre', true, 'Libera gás cloro, que é tóxico e irrita olhos e pulmões.'),
  par('detergente', 'vinagre', false, OK),
  par('oxigenada', 'vinagre', true, 'Forma um ácido corrosivo que irrita pele, olhos e pulmões.'),
  par('sanitaria', 'agua', false, DIL),
  par('sanitaria', 'amoniaco', true, 'Forma gases tóxicos (cloraminas) que atacam as vias respiratórias.'),
  par('sabaococo', 'bicarbonato', false, OK),
  par('desentupidor', 'removedor', true, 'A reação é forte, esquenta e pode espirrar produto na pele e nos olhos.'),
  par('vinagre', 'bicarbonato', false, 'Faz espuma, mas não solta gás perigoso. Nunca feche numa garrafa: pode estourar.'),
  par('sanitaria', 'alcool', true, 'Gera subprodutos tóxicos. Nunca misture água sanitária com álcool.'),
  par('detergente', 'alcool', false, OK),
  par('amoniaco', 'removedor', true, 'Solta uma fumaça branca irritante, que ataca olhos e pulmões.'),
  par('bicarbonato', 'oxigenada', false, OK),
  par('sanitaria', 'limpavidros', true, 'O limpa-vidros com amônia forma gases tóxicos com a água sanitária.'),
  par('amoniaco', 'agua', false, DIL),
  par('sanitaria', 'removedor', true, 'Libera gás cloro. É uma das misturas mais perigosas da casa.'),
  par('limpavidros', 'alcool', false, OK),
  par('desentupidor', 'vinagre', true, 'A reação esquenta e pode espirrar produto cáustico na pele e nos olhos.'),
  par('oxigenada', 'agua', false, DIL),
  par('sanitaria', 'limao', true, 'O ácido do limão faz a água sanitária liberar gás cloro.'),
  par('detergente', 'sabaococo', false, OK),
  par('limpavidros', 'removedor', true, 'Solta uma fumaça branca irritante, que ataca olhos e pulmões.'),
  par('sabaoempo', 'bicarbonato', false, OK),
  par('sanitaria', 'desinfetante', true, 'Misturar água sanitária com outro desinfetante pode soltar gases tóxicos.'),
];

/** Pares que o jogador pode ver. Nunca entra par com produto desconhecido. */
export const MISTURAS = MISTURAS_TODAS.filter((m) => PRODUTOS[m.a] && PRODUTOS[m.b] && (!SOMENTE_VALIDADOS || !m.validar));
