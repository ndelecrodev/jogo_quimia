// Configuração do Supabase que vai para a hospedagem (GitHub Pages).
//
// COMO DESLIGAR (plano B, 1 minuto): ponha enabled: false (ou esvazie url e anonKey), commit e push.
//
// A chave "publishable" (antiga "anon") é PÚBLICA por desenho: quem protege os dados é o RLS e as funções do banco.
// NUNCA coloque a chave "service_role" / "secret": o jogo a recusa, mas ela jamais deve entrar no repositório.
// (Alternativa automática: o workflow .github/workflows/pages.yml gera este arquivo a partir das Variables do GitHub.)
export default {
  enabled: true,
  url: 'https://jpuvgmhsuspvmqnlpmlp.supabase.co',
  anonKey: 'sb_publishable_33ZWZ8hbdPlCZo_V-5aLVw_SKMKLDtL',
};
