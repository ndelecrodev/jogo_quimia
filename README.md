# jogo_quimia

**Quimia Arcade:** minijogos para o stand do projeto Quimia, com ranking ao vivo, brindes e aprendizado sobre segurança química doméstica. Roda 100% offline, no navegador, com teclado ou controle de PS5.

## Sobre

A Quimia é uma plataforma de segurança química doméstica: transforma as Fichas de Dados de Segurança (FDS) de saneantes em orientações simples, como alertas de misturas perigosas. O Arcade leva essa ideia para a feira: a pessoa joga em menos de 10 segundos, disputa o ranking e sai sabendo que certas misturas não se fazem.

## Jogos

| Jogo | Como funciona |
|---|---|
| **Kemi Bolha** | Suba com a Kemi e passe pelos vãos entre os frascos. 3 vidas, bolhinhas bônus. |
| **Pode Misturar?** | Dois produtos aparecem: seguro ou perigoso? Combo, tempo cada vez menor e, no fim, os pares que você errou com o porquê. |
| **Kemi Sobe** | Quique de prateleira em prateleira. Prateleiras que andam e quebram, vapores, tampinha-foguete e escudo-FDS. |
| **Kemi Runner** | A Kemi corre pela prateleira: segure o botão para pular mais alto, ↓ para abaixar nos vapores. Os obstáculos sempre dão para superar. |

Cada partida termina por 3 vidas ou 120 s. A dificuldade sobe por pontos, não por tempo, e os primeiros segundos são fáceis de propósito.

## Recursos

- Ranking geral (Pontuação Quimia normalizada entre jogos) e por jogo, com desempate por menor tempo.
- Tela `ranking.html` para TV ou segundo monitor, atualizada ao vivo.
- Modo atração, apelido em tela estilo arcade, tutorial de 3 s e navegação 100% sem mouse.
- Código de resgate de 4 caracteres, brindes em 3 níveis e contagem regressiva do campeão.
- Captura de contato opcional, com aceite LGPD, e QR codes gerados localmente.
- Painel admin oculto: conferir código, marcar entrega, exportar CSV/JSON, importar, resetar o dia e ajustar metas e brindes.
- Acessibilidade: textos grandes, contraste AA e opção de reduzir efeitos de piscar.

## Como rodar

### Sem Node (só Python)

```bash
python servir.py
```

Abra http://127.0.0.1:8000/ (jogo) e http://127.0.0.1:8000/ranking (TV). No Windows, `iniciar.bat` abre o jogo em tela cheia (modo quiosque) e `iniciar_ranking.bat` abre a TV do ranking. Em um só jogo (plano B): `?jogo=bolha`, `?jogo=misturar`, `?jogo=sobe` ou `?jogo=runner` no endereço.

### Com Node (desenvolvimento)

```bash
npm install
npm run dev      # jogo em http://127.0.0.1:5173/
npm test         # testes unitários (ranking e dificuldade)
```

### Hospedagem

Não há build: publique a raiz do repositório (por exemplo no GitHub Pages). O jogo é `index.html` e a TV do ranking é `ranking.html`. Todos os caminhos são relativos.

## Controles

| Ação | Teclado | Controle |
|---|---|---|
| Mover | ← → ↑ ↓ ou A D W S | D-pad ou analógico |
| Ação | Espaço ou Enter | ✕ (PlayStation) / A (Xbox) |
| Voltar | Esc ou Backspace | ○ / B |
| Pausar | P | Options / Start |
| Mudo | M | — |

## Estrutura

```
index.html, ranking.html   páginas do jogo e da TV
src/scenes/                telas e jogos (Phaser)
src/core/                  input, ranking, armazenamento, som, QR
src/config/                dificuldade, brindes, evento, misturas, fatos
src/admin/                 painel admin
assets/                    manifest.json e imagens da Kemi
vendor/, fonts/            Phaser, gerador de QR e fontes locais
scripts/                   importador de misturas e recorte da Kemi
tests/                     testes (Vitest)
```

## Configuração

- `src/config/difficulty.js`: níveis, pontos por nível e "par" de cada jogo.
- `src/config/prizes.js` e `src/config/event.js`: brindes, PIN do admin, hora do campeão, Instagram, hashtag e links dos QR. Os valores atuais são provisórios; tudo também pode ser alterado no painel admin (`Ctrl+Shift+A`).
- `src/config/fatos.js`: frases do "Você sabia?".
- `assets/manifest.json` e `assets/kemi/`: imagens da Kemi. Arquivo ausente = a Kemi é desenhada em código.

### Conteúdo do Pode Misturar?

Os pares de `src/config/misturas.js` são **exemplos a validar**: confira cada um com as FDS antes de usar em público. Para trocar pelas regras do simulador do app:

```bash
python scripts/importar_misturas.py dados/misturas.csv
```

Colunas: `produto_a, produto_b, perigosa, porque, fonte`. A ordem das linhas é a ordem de entrada no jogo.

## Dados e privacidade

Tudo fica no `localStorage` do navegador; não há servidor. O apelido aparece no ranking, mas o contato nunca. O contato só é pedido a quem entra no Top 3 ou atinge a meta, com aceite explícito. Com mais de uma estação de jogo, exporte o JSON de cada uma e importe na principal no fim do evento.

## Status

Em desenvolvimento para a feira. Guia do stand em [LEIA-ME_FEIRA.md](LEIA-ME_FEIRA.md), checklist em [CHECKLIST_FEIRA.md](CHECKLIST_FEIRA.md) e arte pendente em [ASSETS_PENDENTES.md](ASSETS_PENDENTES.md).

## Licença

MIT. Veja o arquivo [LICENSE](LICENSE).
