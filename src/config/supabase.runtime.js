// Configuração do Supabase que vai para a hospedagem (GitHub Pages).
//
// COMO ATIVAR A NUVEM:
//   1) Preencha `url` e `anonKey` abaixo (Supabase > Project Settings > API: "Project URL" e a chave "anon public").
//   2) Troque `enabled` para true. Faça commit e push.
// COMO DESLIGAR (plano B, 1 minuto): esvazie url e anonKey (ou ponha enabled: false), commit e push.
//
// A chave "anon" é PÚBLICA por desenho (quem protege os dados é o RLS e as funções do banco), por isso pode ficar aqui.
// NUNCA coloque a chave "service_role" / "secret": o jogo a recusa, mas ela jamais deve entrar no repositório.
// (Alternativa automática: o workflow .github/workflows/pages.yml gera este arquivo a partir das Variables do GitHub.)
export default {
  enabled: false,
  url: '', // ex.: 'https://abcdefghijk.supabase.co'
  anonKey: '', // chave "anon public"
};
