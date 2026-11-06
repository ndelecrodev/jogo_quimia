# Quimia Arcade: guia rápido do stand

Para quem vai operar o jogo na feira. Não precisa saber programar.

> **Antes de tudo:** abra o `PENDENCIAS.md` e o painel admin (`Ctrl + Shift + A`). O admin mostra um **alerta vermelho** com tudo o que ainda falta preencher (links dos QR, Instagram, hashtag, hora, brindes, PIN).

## O que você precisa
- 1 notebook (estação de jogo) com **Google Chrome** e **Python** instalados.
- Controle de PS5 (cabo USB ou Bluetooth) e/ou teclado.
- TV ou 2º monitor para o ranking (opcional).
- **Não precisa de internet.** Tudo roda no próprio notebook.

## Para iniciar
1. Conecte o controle (aperte um botão para o Chrome "acordar" o controle). No canto da tela aparece o nome do controle detectado, por exemplo "DualSense (PS5) conectado".
2. Dê dois cliques em **`iniciar.bat`**. O jogo abre em tela cheia.
3. Para a TV: com a TV ligada como segunda tela (Windows + P → Estender), dê dois cliques em **`iniciar_ranking.bat`**.
   - Se a janela abrir no monitor errado, arraste para a TV e aperte **F11**.
   - **Importante:** o ranking só enxerga as partidas se for aberto no mesmo notebook e pelo `iniciar_ranking.bat` (mesmo perfil do Chrome).
4. Teste uma partida antes de abrir o stand (veja o `CHECKLIST_FEIRA.md`).

Para sair do modo tela cheia: **Alt+F4**.

## Se travar
| Problema | O que fazer |
|---|---|
| Tela parada ou "Ops!" | Aperte **ESPAÇO** ou **✕**: volta ao início. Os dados ficam salvos. |
| Jogo não responde | **F5** (recarregar). O ranking e os códigos **não** se perdem. |
| Chrome fechou | Rode o `iniciar.bat` de novo. O ranking continua lá. |
| Controle não responde | Aperte qualquer botão. Se não voltar, desconecte e reconecte. O jogo **pausa sozinho** se o controle sair e volta com ✕. |
| Sem som | Tecla **M** liga/desliga. Também dá para mudar no admin. |
| Ranking da TV parado | Feche e abra o `iniciar_ranking.bat`. Veja se é no mesmo notebook do jogo. |
| Jogo lento | Aperte **F3**: aparece um contador de FPS (e de memória) no canto. Abaixo de 30 FPS, feche outros programas e abas. F3 de novo esconde. |

## Plano B: abrir só um jogo (se o hub falhar)
Abra o endereço direto com o jogo escolhido (sem hub):

- Kemi Bolha: `http://127.0.0.1:8000/?jogo=bolha`
- Pode Misturar?: `http://127.0.0.1:8000/?jogo=misturar`
- Kemi Sobe: `http://127.0.0.1:8000/?jogo=sobe`
- Kemi Runner: `http://127.0.0.1:8000/?jogo=runner`

Dá para colocar na barra do Chrome (F6) com o `iniciar.bat` aberto, ou editar o endereço no fim do `iniciar.bat`.
Se o servidor não subir, abra o Prompt de Comando na pasta e rode `python servir.py`.

**Versão hospedada (GitHub Pages):** serve de plano B. Depois de aberta uma vez com internet, ela funciona offline (veja "Publicar" abaixo). Lembre que o ranking fica no navegador onde se joga.

## Quem entra no ranking e quem ganha brinde
- **Cada pessoa tem 1 jogada oficial** (por apelido). Depois dela o Hub mostra "Sua jogada oficial já foi! Chame o próximo jogador"; se ninguém apertar nada por 15 s, o jogo limpa o jogador e volta à tela de atração. **Esc / ○ no Hub = trocar de jogador.** Dá para treinar, mas treino não vale ranking nem brinde.
- **Partida parada ou abandonada** (nenhuma ação, ou 0 pontos em menos de 10 s): **não vale nada**, não gasta a jogada, sem código nem brinde. Aparece "Vamos de novo?".
- **Jogou de verdade, mas abaixo do mínimo do jogo:** gasta a jogada oficial e ganha o **brinde de participação** (e um código interno), mas **não entra no ranking** (a tela diz quantos pontos faltam).
- **Fez o mínimo:** entra no ranking. Se bater a **meta**, ganha também o brinde da meta. Top 3 do jogo ou meta: pedimos o contato (opcional, com aceite LGPD).
- As pontuações dos 4 jogos usam uma **escala comum** (`SCORE_SCALE` em `src/config/difficulty.js`) e o **par é 300 para todos**. Os valores (meta, mínimo, par) se ajustam no admin; o **Calibrar** sugere números com as partidas já feitas.
- **Atenção:** a escala de pontos mudou. **Zere todas as partidas de teste** (admin > "Zerar tudo", e "Zerar TUDO na nuvem") antes de abrir, senão o ranking mistura escalas.
- Se o admin já tinha "Tentativas oficiais" salvo com outro valor neste navegador, **confira que está 1** (Configurações).

## Brindes e código de resgate
A tela final mostra só o **brinde** (o maior que a pessoa ganhou) e o **apelido grande**; o código continua sendo gerado e fica no admin.
1. A pessoa diz o **apelido** (que está na tela final) e a equipe confere a olho.
2. Aperte **Ctrl + Shift + A** e digite o **PIN do admin**.
3. Digite o **apelido** (ou o código) no campo de busca: aparece o brinde e se **já foi entregue**.
4. Clique em **Marcar brinde entregue**. Nunca entregue se aparecer "JÁ ENTREGUE" (a lista também mostra "entregue ✓" ao lado do apelido).

**Convite (Instagram/hashtag/QR):** não aparece mais depois da partida. Ele alterna com o ranking na tela de atração e há uma linha discreta no rodapé do Hub. Para voltar a mostrar a tela depois do jogo: `SHOW_VIRAL_AFTER_GAME = true` em `src/config/game.js`.

## Prêmio Master (campeão do evento)
O líder do **Ranking Geral** na hora marcada leva o Prêmio Master. O admin mostra o líder atual no topo. A contagem regressiva "Campeão em HH:MM:SS" aparece na tela de atração e no ranking quando a hora está definida (admin > Configurações).

## PIN do admin
Não existe PIN padrão. Na **primeira vez** que abrir o admin neste navegador, ele pede para **criar** um PIN (mínimo 4 caracteres). Anote só com a equipe. Dá para trocar em Configurações > "Novo PIN". O PIN fica guardado de forma embaralhada (hash) só neste navegador, nunca em arquivo.

## Exportar o ranking e guardar os dados
No admin (**Ctrl + Shift + A**):
- **Exportar CSV**: planilha com apelido, jogo, pontos, pontuação Quimia, data, código, brinde, entrega, contato, consentimento LGPD e se é de empresa (abre no Excel).
- **Exportar JSON (backup)**: faça no **meio** e no **fim do dia** e guarde.
- **Restaurar backup (substitui tudo)**: volta um backup JSON (baixa antes um backup do estado atual).
- **Importar JSON (mesclar)**: junta partidas de outra estação sem duplicar.
- **Resetar ranking do dia**: apaga as partidas de hoje (baixa um backup antes).
- **Zerar tudo para abrir a feira**: pede o PIN e apaga **todas** as partidas, contatos, códigos e o backup automático deste navegador. **Faça isso antes de abrir**, em cada computador usado nos testes.

> Os dados ficam **neste notebook, neste Chrome**. Não limpe os dados de navegação do perfil `QuimiaArcadeChrome` durante o evento.

### Mais de um notebook de jogo?
O ranking **não soma sozinho**. No fim, exporte o JSON de cada estação e, na principal, use **Importar JSON** (ele mescla sem duplicar).

## Contatos (LGPD)
O contato só é pedido a quem entra no Top 3 ou atinge a meta, é **opcional** (○ ou Esc = "agora não") e exige aceite. Ele aparece **só no admin e no CSV**, nunca na tela pública. Quem pedir para apagar: busque o apelido no admin e clique em **Apagar**.

## Publicar (GitHub Pages) e funcionar offline
1. Antes de publicar, rode (precisa só de Python): `python scripts/gerar_sw.py`. Isso atualiza o `sw.js`, que guarda uma cópia do jogo para funcionar sem internet.
2. Faça o commit e o push. O Pages publica sozinho.
3. Abra o jogo hospedado **uma vez com internet** no notebook do stand; depois ele abre mesmo offline. (Se mudar qualquer arquivo, repita o passo 1.)
4. Para conferir os testes sem Node: abra `testes.html` (pelo `servir.py` ou hospedado). Tudo deve aparecer em verde.

## Antes de abrir o stand
Veja o `PENDENCIAS.md` (o que preencher e onde) e o `CHECKLIST_FEIRA.md`. Resumo: links dos 2 QR, Instagram, hashtag, hora do campeão, nomes dos brindes, PIN, **validar os pares do Pode Misturar? com as FDS** e **zerar tudo para abrir a feira**.

## Nuvem (Supabase), se estiver ligada
- No admin (`Ctrl + Shift + A`), a seção **Nuvem** mostra `☁ sincronizado` ou `☁ sem conexão (N pendentes)`. Na tela de atração aparece o mesmo, bem pequeno no canto.
- **Sem internet o jogo funciona normal**: as partidas ficam numa fila e seguem para a nuvem quando a internet voltar (ou clique em **Enviar pendentes agora**). Não duplica.
- Cada computador de jogo precisa de um **código de estação** diferente (admin > Configurações: E1, E2…).
- O PIN da nuvem é separado do PIN do painel. 5 erros bloqueiam por 60 s.
- **Zerar para abrir a feira:** faça no admin local **e** em Nuvem > "Zerar TUDO na nuvem".
- **Plano B (1 minuto):** desligar a nuvem = esvaziar `url` e `anonKey` em `src/config/supabase.runtime.js` (`enabled: false`), commit e push. O jogo volta ao modo local. Passo a passo e solução de problemas: `SUPABASE.md`.
