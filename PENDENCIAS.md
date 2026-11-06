# Pendências antes de abrir o stand

O que a equipe precisa preencher ou conferir, e **onde** mudar cada coisa. O painel admin (`Ctrl+Shift+A`) também mostra essa lista num alerta vermelho enquanto faltar algo.

> Importante: o que for salvo no **painel admin** fica só no navegador onde foi salvo (por computador). Os valores públicos (links, Instagram, hashtag, hora, brindes) também podem ser gravados nos arquivos de `src/config/` para valerem em qualquer navegador. O **PIN nunca fica em arquivo**.

## 1. Preencher

| O quê | Se não preencher | Onde alterar |
|---|---|---|
| **Link do QR "Para você"** (landing de usuários / lista de espera, começa com `https://`) | O convite mostra "Em breve" no lugar do QR | Admin > Configurações, ou `src/config/event.js` (`urlUser`) |
| **Link do QR "Para empresas"** (landing B2B) | Idem: "Em breve" | Admin > Configurações, ou `src/config/event.js` (`urlCompany`) |
| **Instagram** (ex.: `@quimia.app`) | A marcação some do convite | Admin > Configurações, ou `src/config/event.js` (`instagram`) |
| **Hashtag** (ex.: `#QuimiaArcade`) | Idem | Admin > Configurações, ou `src/config/event.js` (`hashtag`) |
| **Hora do campeão** (`HH:MM`) | A contagem "Campeão em HH:MM:SS" não aparece | Admin > Configurações, ou `src/config/event.js` (`endTime`) |
| **Nomes dos 3 brindes** (participação, meta, Prêmio Master) | Aparecem os nomes padrão ("Adesivo da Kemi", "Brinde da Meta", "Prêmio Master") | Admin > Configurações, ou `src/config/prizes.js` |
| **PIN do admin** | O admin pede para criar o PIN na primeira abertura | Admin (primeira abertura) / Admin > Configurações > "Novo PIN" |

Links de QR de exemplo (`example`), de `localhost` ou sem `https://` são recusados no admin.

## 2. Conferir (segurança química)

- **Lista do Pode Misturar?** (`src/config/misturas.js`): os **24 pares** estão com `validar: true`, isto é, **ainda não conferidos com as FDS**. A equipe precisa revisar cada um e trocar para `validar: false`.
  - Para o jogo usar **só pares conferidos**, ponha `SOMENTE_VALIDADOS = true` no mesmo arquivo (ou gere o arquivo pelo importador).
  - Ou troque tudo pelas regras do simulador do app: `python scripts/importar_misturas.py dados/misturas.csv` (colunas `produto_a, produto_b, perigosa, porque, fonte`, e opcional `validar`).
  - Pares que **não** estão em uma base validada não devem ir para o público: confira principalmente os que não envolvem água sanitária (oxigenada + vinagre, amoníaco + removedor ácido, limpa-vidros + removedor ácido, desentupidor + vinagre, desentupidor + removedor ácido) e os "seguros" (vinagre + bicarbonato, bicarbonato + oxigenada, água sanitária + água etc.).
- **Frases do "Você sabia?"** (`src/config/fatos.js`): revisar com a equipe.

## 3. Calibrar com partidas reais

- **Metas dos brindes**, **mínimo para entrar no ranking** e **"par" de cada jogo**: depois de algumas partidas de teste de pessoas de verdade, use Admin > **Calibrar** (mostra mediana, P40 e P80 por jogo e sugere meta e par). Valores iniciais são palpites.
- Dificuldade dos jogos: `src/config/difficulty.js`.

## 4. Antes de abrir

- Admin > **Zerar tudo para abrir a feira** (pede o PIN): apaga partidas de teste, contatos e códigos. Faça isso **em cada navegador/computador** usado para testar.
- Conferir o `CHECKLIST_FEIRA.md` inteiro.
