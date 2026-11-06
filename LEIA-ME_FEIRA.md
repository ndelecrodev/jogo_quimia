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
- **Partida parada ou abandonada** (nenhuma ação, ou 0 pontos em menos de 10 s): **não vale nada**, não gasta tentativa, sem código nem brinde. Aparece "Vamos de novo?".
- **Jogou de verdade, mas abaixo do mínimo do jogo:** gasta 1 tentativa e ganha o **brinde de participação** e o código, mas **não entra no ranking** (a tela diz quantos pontos faltam).
- **Fez o mínimo:** entra no ranking. Se bater a **meta**, ganha também o brinde da meta. Top 3 do jogo ou meta: pedimos o contato (opcional, com aceite LGPD).
- Depois das tentativas oficiais (padrão: 2 por apelido), a partida é só treino: sem código nem ranking.
- Os valores (meta, mínimo, par) se ajustam no admin; o **Calibrar** sugere números com as partidas já feitas.

## Brindes e código de resgate
1. A pessoa mostra o **código de 4 letras** da tela final.
2. Aperte **Ctrl + Shift + A** e digite o **PIN do admin**.
3. Digite o código no campo de busca: aparece quem é e se **já foi entregue**.
4. Clique em **Marcar entregue**. Nunca entregue se aparecer "JÁ ENTREGUE".

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
