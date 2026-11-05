# Quimia Arcade: guia rápido do stand

Para quem vai operar o jogo na feira. Não precisa saber programar.

## O que você precisa
- 1 notebook (estação de jogo) com **Google Chrome** e **Python** instalados.
- Controle de PS5 (cabo USB ou Bluetooth) e/ou teclado.
- TV ou 2º monitor para o ranking (opcional).
- **Não precisa de internet.** Tudo roda no próprio notebook.

## Para iniciar
1. Conecte o controle (aperte um botão para o Chrome "acordar" o controle).
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
| Controle não responde | Aperte qualquer botão. Se não voltar, desconecte e reconecte. O jogo pausa sozinho se o controle sair. |
| Sem som | Tecla **M** liga/desliga. Também dá para mudar no admin. |
| Ranking da TV parado | Feche e abra o `iniciar_ranking.bat`. Veja se é no mesmo notebook do jogo. |

## Plano B: abrir só um jogo (se o hub falhar)
Abra o endereço direto com o jogo escolhido (sem hub):

- Kemi Bolha: `http://127.0.0.1:8000/?jogo=bolha`
- Pode Misturar?: `http://127.0.0.1:8000/?jogo=misturar`
- Kemi Sobe: `http://127.0.0.1:8000/?jogo=sobe`
- Kemi Runner: `http://127.0.0.1:8000/?jogo=runner`

Dá para colocar na barra do Chrome (F6) com o `iniciar.bat` aberto, ou editar o endereço no fim do `iniciar.bat`.
Se o servidor não subir, abra o Prompt de Comando na pasta e rode `python servir.py`.

## Brindes e código de resgate
1. A pessoa mostra o **código de 4 letras** da tela final.
2. Aperte **Ctrl + Shift + A** e digite o **PIN do admin**.
3. Digite o código no campo de busca: aparece quem é e se **já foi entregue**.
4. Clique em **Marcar entregue**. Nunca entregue se aparecer "JÁ ENTREGUE".

## Prêmio Master (campeão do evento)
O líder do **Ranking Geral** na hora marcada leva o Prêmio Master. O admin mostra o líder atual no topo. A contagem regressiva "Campeão em HH:MM:SS" aparece na tela de atração e no ranking. A hora se muda no admin.

## Exportar o ranking e guardar os dados
No admin (**Ctrl + Shift + A**):
- **Exportar CSV**: planilha com apelido, jogo, pontos, código, brinde, entrega e contato (abre no Excel).
- **Exportar JSON (backup)**: faça no **fim do dia** e guarde.
- **Resetar ranking do dia**: só quando quiser zerar. Ele baixa um backup antes.

> Os dados ficam **neste notebook, neste Chrome**. Não limpe os dados de navegação do perfil `QuimiaArcadeChrome` durante o evento.

### Mais de um notebook de jogo?
O ranking **não soma sozinho**. No fim, exporte o JSON de cada estação e, na principal, use **Importar JSON** (ele mescla sem duplicar).

## Contatos (LGPD)
O contato só é pedido a quem entra no Top 3 ou atinge a meta, com aceite. Ele aparece **só no admin e no CSV**, nunca na tela pública. Quem pedir para apagar: busque o apelido no admin e clique em **Apagar**.

## Antes de abrir o stand: conferir o admin
- Troque o **PIN** (o provisório fica em `src/config/event.js`).
- Confira **brindes, metas, hora do campeão, Instagram, hashtag e links dos QR**.
- **Pode Misturar?:** os pares são exemplos a validar com as FDS (`src/config/misturas.js`).
