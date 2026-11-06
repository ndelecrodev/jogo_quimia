# Supabase no Quimia Arcade (camada opcional)

O Supabase é uma **cópia na nuvem** das partidas, para: (1) várias estações e a TV verem o **mesmo ranking**; (2) ter **backup** das partidas e contatos; (3) o admin ver, exportar e marcar brindes **de qualquer computador**.

**O jogo continua funcionando sem internet e sem Supabase.** A nuvem só recebe uma cópia e lê o ranking quando há conexão. Sem URL/chave configuradas, tudo funciona em modo local, exatamente como antes.

## Como funciona (resumo)

- Terminou uma partida (ou salvou um contato com aceite LGPD)? Grava no computador **e** entra numa fila de envio (`quimia_outbox_v1`). Um envio em segundo plano tenta a cada 5 s, dobrando até 60 s, e também quando a internet volta. Reenviar é seguro: o servidor usa o `id` da partida e não duplica.
- O ranking mostrado = partidas deste computador **+** ranking da nuvem (guardado em cache), sem repetir. Se a nuvem falhar, vale o local.
- A TV (`ranking.html`) usa Realtime e, como reserva, consulta a cada 10 s.
- O visitante **não consegue** ler contatos, códigos ou apagar nada (RLS + funções no banco). O PIN de admin da nuvem é conferido **no servidor**.

---

## Passo a passo (no navegador, uns 15 minutos)

### 1) Criar o projeto no Supabase
1. Entre em https://supabase.com → **New project**.
2. Região: **South America (São Paulo)**. Guarde a senha do banco (não usaremos, mas guarde).
3. **Não ative login de usuários** (Auth): não precisamos. Nada para configurar em Authentication.

### 2) Colar o SQL (em ordem)
No projeto: **SQL Editor → New query**. Cole **um bloco por vez** do arquivo `supabase/schema.sql` e clique **Run**:

| Bloco | O que faz |
|---|---|
| 1 | Cria as tabelas (partidas, contatos, ranking público, configuração do admin) |
| 2 | Liga a segurança (RLS), libera só a **leitura** do ranking público e ativa o Realtime nessa tabela |
| 3 | Cria as funções que o jogo chama: enviar partida, enviar contato, ler ranking |
| 4 | Cria as funções de admin (PIN conferido no servidor, bloqueio após 5 erros) |
| 5 | Define o **seu PIN de admin da nuvem** (**troque o `123456`** por um PIN seu, mínimo 6 dígitos) |

Pode rodar de novo sem medo (é idempotente).

### 3) Conferir a segurança
Cole `supabase/verificar.sql` num New query e rode. Aparece uma tabela: **toda linha deve ter `ok = true`**. Ela finge ser o visitante (papel `anon`) e prova que ele não lê `plays`, `contacts` nem `admin_config`, não insere nem apaga direto, e que dados inválidos e PIN errado são barrados. (No fim ela apaga a partida de teste e desbloqueia o PIN.)

Se alguma linha vier `false`, **não abra o stand com a nuvem ligada**: mande a linha para a equipe técnica.

### 4) Realtime
O Bloco 2 já adiciona `ranking_public` ao Realtime. Para conferir: **Database → Publications** (ou **Database → Replication**) → `supabase_realtime` → a tabela `ranking_public` deve estar marcada. Se não estiver, marque. Em **Project Settings → API** não há nada para ligar. Se o Realtime falhar, a TV continua atualizando pela consulta a cada 10 s.

### 5) Pegar a URL e a chave
**Project Settings → API**:
- **Project URL** (ex.: `https://abcdefghijk.supabase.co`) → vira `SUPABASE_URL`.
- **anon public** (a chave "anon") → vira `SUPABASE_ANON_KEY`.

> ⚠️ **NUNCA use a `service_role` (ou "secret").** Ela dá poder total sobre o banco. A chave **anon** é **pública por desenho** (qualquer visitante a vê no site) e só funciona dentro do que o RLS e as funções permitem. O jogo recusa uma chave secreta colada por engano, mas ela jamais deve entrar no repositório.

### 6) Ligar no jogo (escolha UMA opção)

**Opção A (a que está ativa e não mexe no seu deploy atual): editar um arquivo**
1. Abra `src/config/supabase.runtime.js`.
2. Preencha `url` e `anonKey` e troque `enabled: false` por `enabled: true`.
3. Faça commit e push. O GitHub Pages publica como sempre.
   - *Por que é aceitável:* a chave anon é pública e protegida por RLS. O custo é que a chave fica visível no GitHub, como em qualquer site que usa Supabase.

**Opção B (variáveis do GitHub, só se o Pages estiver em "GitHub Actions")**
1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → aba Variables → New repository variable**: crie `SUPABASE_URL` e `SUPABASE_ANON_KEY` (podem ser Variables ou Secrets; como a anon é pública, Variables bastam; **nunca** a service_role).
3. **Actions → "Publicar no Pages (com variáveis do Supabase)" → Run workflow**.
   - Variáveis vazias = nuvem desligada. Se o Pages continuar em "Deploy from a branch", este workflow não faz nada e não atrapalha.

**Para testar só no seu computador:** copie `src/config/supabase.local.example.js` para `supabase.local.js` (ignorado pelo git) e preencha.

### 7) Cada estação
No painel admin do jogo (`Ctrl+Shift+A`) → **Configurações** → **Código desta estação**: `E1`, `E2`… (um diferente por computador de jogo). Ele vai junto com cada partida.

---

## PIN da nuvem

- Mínimo **6 dígitos**. É separado do PIN local do painel (que fica só no navegador).
- A **primeira** definição é feita no SQL Editor (Bloco 5): por segurança, o navegador **não** consegue criar o primeiro PIN (senão qualquer visitante que chegasse antes poderia tomá-lo).
- Para trocar depois: painel admin → **Nuvem → Trocar PIN da nuvem** (pede o antigo) ou rode o Bloco 5 de novo.
- **5 erros seguidos bloqueiam por 60 s** (até o PIN certo é negado nesse tempo). A resposta é sempre "acesso negado", exista PIN ou não.
- O PIN fica só na memória enquanto o painel está aberto; ações destrutivas (apagar, zerar) pedem o PIN de novo.

## Painel admin → seção "Nuvem"
Status (`☁ sincronizado` / `☁ sem conexão (N pendentes)`), **Enviar pendentes agora**, **Reenviar todas as partidas deste computador** (seguro), e, depois de entrar com o PIN da nuvem: lista de todas as estações, **marcar brinde entregue**, **apagar contato** / **apagar partida** (LGPD), **Exportar CSV (nuvem + local, sem duplicar)**, **Zerar o dia** e **Zerar TUDO** na nuvem.

> "Zerar tudo para abrir a feira" (do admin local) limpa **este computador**. Para limpar a **nuvem** use "Zerar TUDO na nuvem". Faça os dois antes de abrir.

## Testes para leigos

1. **Sem nuvem:** deixe `enabled: false`. Jogue uma partida: tudo igual a antes. ✔️
2. **Com nuvem:** ligue, jogue uma partida. No Supabase → **Table Editor → plays** a partida aparece em poucos segundos (e em `ranking_public`). A TV mostra o novo ranking.
3. **Wi-Fi caído:** desligue o Wi-Fi do computador, jogue 3 partidas (o admin mostra `☁ sem conexão (3 pendentes)`), religue o Wi-Fi. Em ~1 minuto as 3 aparecem na nuvem, **sem duplicar**. (Ou clique em **Enviar pendentes agora**.)
4. **Duas estações:** use `E1` num computador e `E2` em outro; as duas aparecem no mesmo ranking e na coluna "Estação" do admin.
5. **Segurança:** rode o `verificar.sql` (passo 3).
6. **Admin:** em Nuvem, entre com o PIN, marque um brinde pelo código, exporte o CSV, apague um contato, zere o dia.
7. **TV sem internet:** com a TV aberta, desligue a internet por alguns minutos: ela continua mostrando o ranking (local/em cache), sem erro. Ao voltar, atualiza sozinha.

### Se algo falhar
| Sintoma | O que fazer |
|---|---|
| Admin diz "A nuvem respondeu 404" | O SQL não foi colado (ou a URL está errada). Refaça o passo 2 e confira a URL. |
| "A nuvem respondeu 401/403" | Chave errada ou projeto pausado. Confira a chave **anon** (passo 5) e se o projeto está ativo. |
| Pendentes não saem | Clique em **Enviar pendentes agora**; veja o texto do erro ao lado do status; confira internet e a chave. |
| "PIN incorreto ou bloqueado" | Espere 60 s e tente de novo. Esqueceu? Rode o Bloco 5 no SQL Editor com um PIN novo. |
| TV não atualiza ao vivo | Confira o Realtime (passo 4). Mesmo sem ele, atualiza a cada 10 s. |
| Qualquer coisa estranha na hora da feira | **Plano B abaixo**: desligar a nuvem leva 1 minuto. |

## Plano B: desligar a nuvem em 1 minuto
1. Abra `src/config/supabase.runtime.js` e deixe `enabled: false` com `url` e `anonKey` vazios (ou, na Opção B, esvazie as Variables e rode o workflow).
2. Commit e push; espere o Pages publicar (1-2 min) e aperte `Ctrl+F5` nos computadores.
3. O jogo volta ao modo **local puro**. As partidas já feitas continuam salvas no computador (use "Reenviar todas as partidas deste computador" quando religar).
Se não puder publicar agora: o próprio computador do stand roda tudo local pelo `iniciar.bat`, sem depender do site hospedado.

## Depois da feira (LGPD)
Exporte o CSV (nuvem + local), guarde em 2 lugares e rode `supabase/limpar_apos_evento.sql` para apagar contatos e partidas da nuvem. Para remover tudo do projeto: `supabase/desfazer.sql`.

## Limites e riscos que continuam
- Quem tem a chave anon (qualquer pessoa que abra o site) pode **enviar partidas falsas** (o banco só confere formato e limites plausíveis). Não dá para impedir sem login de usuários; o admin consegue apagar partidas pela lista, e o ranking mostra só partidas com a regra do jogo (oficial e acima do mínimo).
- O apelido tem até **13** caracteres no banco (e não 10) porque o modo anônimo gera "Visitante-123".
- O código de resgate tem 4 caracteres e cada estação gera os seus: em estações diferentes pode haver o **mesmo código**. O admin avisa e a lista marca pela linha certa.
- O contato só é gravado uma vez por partida (ninguém sobrescreve o contato de outra pessoa).
