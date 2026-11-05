// Pares do "Pode Misturar?". EXEMPLOS [VALIDAR]: a equipe precisa conferir CADA item contra as FDS
// antes da feira. Para trocar pelas regras do simulador do app, use: python scripts/importar_misturas.py
//
// A ORDEM importa: os primeiros pares entram no começo do jogo (mais fáceis); os demais vão liberando por nível.
// cor = nome de uma cor do theme.js; forma = 'bottle' (padrão) ou 'jar'.

export const PRODUTOS = {
  sanitaria: { nome: 'Água sanitária', cor: 'cyanLight' },
  vinagre: { nome: 'Vinagre', cor: 'mint1' },
  amoniaco: { nome: 'Amoníaco', cor: 'mint3' },
  limpavidros: { nome: 'Limpa-vidros com amônia', cor: 'mint2' },
  alcool: { nome: 'Álcool', cor: 'sky' },
  removedor: { nome: 'Removedor ácido (limpa-pedra)', cor: 'greenDark' },
  oxigenada: { nome: 'Água oxigenada', cor: 'sky2' },
  limao: { nome: 'Suco de limão', cor: 'success2' },
  detergente: { nome: 'Detergente neutro', cor: 'cyan' },
  bicarbonato: { nome: 'Bicarbonato de sódio', cor: 'white', forma: 'jar' },
  sabaococo: { nome: 'Sabão de coco', cor: 'cyanDark', forma: 'jar' },
  desentupidor: { nome: 'Desentupidor (soda cáustica)', cor: 'teal1' },
};

const F = 'Exemplo [VALIDAR com a FDS]';

export const MISTURAS = [
  { a: 'sanitaria', b: 'vinagre', perigosa: true, porque: 'Libera gás cloro, que é tóxico e irrita olhos e pulmões.', fonte: F },
  { a: 'detergente', b: 'bicarbonato', perigosa: false, porque: 'Não reagem de forma perigosa. Mesmo assim, leia o rótulo.', fonte: F },
  { a: 'sanitaria', b: 'amoniaco', perigosa: true, porque: 'Forma gases tóxicos (cloraminas) que atacam as vias respiratórias.', fonte: F },
  { a: 'detergente', b: 'vinagre', perigosa: false, porque: 'Não reagem de forma perigosa. Mesmo assim, leia o rótulo.', fonte: F },
  { a: 'sanitaria', b: 'alcool', perigosa: true, porque: 'Gera subprodutos tóxicos. Nunca misture água sanitária com álcool.', fonte: F },
  { a: 'sabaococo', b: 'bicarbonato', perigosa: false, porque: 'Não reagem de forma perigosa. Mesmo assim, leia o rótulo.', fonte: F },
  { a: 'sanitaria', b: 'removedor', perigosa: true, porque: 'Libera gás cloro. É uma das misturas mais perigosas da casa.', fonte: F },
  { a: 'detergente', b: 'alcool', perigosa: false, porque: 'Não reagem de forma perigosa. Mesmo assim, leia o rótulo.', fonte: F },
  { a: 'oxigenada', b: 'vinagre', perigosa: true, porque: 'Forma um ácido corrosivo que irrita pele, olhos e pulmões.', fonte: F },
  { a: 'sanitaria', b: 'limpavidros', perigosa: true, porque: 'O limpa-vidros com amônia forma gases tóxicos com a água sanitária.', fonte: F },
  { a: 'detergente', b: 'sabaococo', perigosa: false, porque: 'Não reagem de forma perigosa. Mesmo assim, leia o rótulo.', fonte: F },
  { a: 'sanitaria', b: 'limao', perigosa: true, porque: 'O ácido do limão faz a água sanitária liberar gás cloro.', fonte: F },
  { a: 'bicarbonato', b: 'oxigenada', perigosa: false, porque: 'Não reagem de forma perigosa. Mesmo assim, leia o rótulo.', fonte: F },
  { a: 'desentupidor', b: 'removedor', perigosa: true, porque: 'A reação é forte, esquenta e pode espirrar produto na pele e nos olhos.', fonte: F },
];
