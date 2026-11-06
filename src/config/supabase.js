// Configuração do Supabase (camada OPCIONAL de sincronização e backup).
//
// Sem URL + chave "anon" válidas, a nuvem fica DESLIGADA e o jogo funciona 100% em modo local, como antes.
// De onde vêm os valores (o primeiro arquivo que existir e for válido ganha):
//   1) ./supabase.local.js    só no seu computador (está no .gitignore). Modelo: supabase.local.example.js
//   2) ./supabase.runtime.js  o que vai para a hospedagem (editado à mão, ou gerado pelo workflow do GitHub)
//
// SEGURANÇA: aqui só entra a chave "anon"/"publishable" (pública por desenho, protegida por RLS no banco).
// NUNCA coloque a "service_role" / "secret": este arquivo vira público no GitHub Pages. Se alguém colar uma por engano,
// este código a recusa e deixa a nuvem desligada.
export const SUPABASE = { url: '', anonKey: '', enabled: false };

/** true se a chave parece ser a chave SECRETA (service_role / sb_secret_...). */
export function isSecretKey(key) {
  const k = String(key || '').trim();
  if (/^sb_secret_/i.test(k)) return true;
  try {
    const payload = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload && payload.role === 'service_role';
  } catch (e) {
    return false; // não é um JWT (ex.: sb_publishable_...): tudo bem
  }
}

// URL: https:// de verdade; http:// só vale para localhost (testes no seu computador).
const urlOk = (u) => /^https:\/\/[^/\s]+\.[^/\s]+/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u);

export function validConfig(c) {
  return !!c && c.enabled !== false && urlOk(String(c.url || '')) && String(c.anonKey || '').trim().length > 20 && !isSecretKey(c.anonKey);
}

/** Promessa que resolve quando a configuração foi lida (sempre resolve, nunca dá erro). */
export const supabaseReady = (async () => {
  for (const arquivo of ['./supabase.local.js', './supabase.runtime.js']) {
    try {
      const mod = await import(arquivo);
      const c = mod.default || {};
      if (validConfig(c)) {
        SUPABASE.url = String(c.url).replace(/\/+$/, '');
        SUPABASE.anonKey = String(c.anonKey).trim();
        SUPABASE.enabled = true;
        return SUPABASE;
      }
    } catch (e) {
      /* arquivo ausente ou inválido: segue para o próximo */
    }
  }
  return SUPABASE;
})();
