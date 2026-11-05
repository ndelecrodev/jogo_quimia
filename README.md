# Quimia Arcade

Minijogos para o stand do projeto Quimia. Vite + Phaser 3, 100% offline.

## Rodar SEM Node (só Python)

```bash
python servir.py
```

Abra http://127.0.0.1:8000/ (jogo) e http://127.0.0.1:8000/ranking (TV). Ou dê dois cliques em `iniciar_sem_node.bat`.
O jogo roda direto da raiz (`index.html` + Phaser local em `vendor/`), sem build. Os testes (Vitest) precisam do Node.

## Hospedagem (GitHub Pages etc.)

É só publicar a raiz do repositório: `index.html` (jogo) e `ranking.html` (TV). Todos os caminhos são relativos. Não há build.

## Desenvolvimento (com Node)

```bash
npm install
npm run dev      # jogo em http://127.0.0.1:5173/  |  TV do ranking em /ranking (ou ranking.html na hospedagem)
npm test         # testes unitários (ranking e dificuldade)
npm run build    # gera a pasta dist/
```

## Controles

| Ação | Teclado | Controle |
|---|---|---|
| Mover | ← → ↑ ↓ / A D W S | D-pad ou analógico |
| Ação | Espaço ou Enter | ✕ (PS) / A (Xbox) |
| Voltar | Esc ou Backspace | ○ / B |
| Pausar | P | Options / Start |
| Mudo | M | — |

## Onde ajustar as coisas

- `src/config/difficulty.js`: níveis, pontos por nível e "par" de cada jogo.
- `src/config/prizes.js`, `src/config/event.js`: brindes, PIN, hora de encerramento, Instagram, QR (todos provisórios).
- `src/config/fatos.js`: frases do "Você sabia?".
- `assets/manifest.json` e `assets/kemi/`: imagens da Kemi (faltou arquivo = Kemi desenhada em código).

> Marcos entregues até aqui: 1 (fundação), 2 (Kemi Bolha), 3 (Pode Misturar?), 4 (Kemi Sobe) e 5 (fechamento do evento). O Kemi Runner ainda usa o jogo "em construção".

## Conteúdo do Pode Misturar?

Os pares estão em `src/config/misturas.js` (EXEMPLOS `[VALIDAR]` — conferir cada um com as FDS).
Para trocar pelas regras do simulador do app: `python scripts/importar_misturas.py dados/misturas.csv`
(colunas: `produto_a, produto_b, perigosa, porque, fonte`; a ordem das linhas é a ordem de entrada no jogo).


## Fechamento do evento (Marco 5)

- **Fluxo ao sair da tela final:** contato (só Top 3 do jogo ou meta do brinde, com aceite LGPD e a opção "Sou de uma empresa") → convite de 4 s com 2 QR codes → destino.
- **QR codes** são gerados localmente (`vendor/qrcode.js`, MIT). Os links ficam em `src/config/event.js` e no painel admin.
- **Painel admin:** `Ctrl+Shift+A` + PIN (provisório: `2468` — troque no próprio painel). Busca por código de resgate, marcar entrega, apagar partida, exportar CSV/JSON, importar JSON (mescla estações), resetar o ranking do dia (baixa um backup antes) e ajustar metas, brindes, evento e jogos do hub.
- **Prêmio Master:** líder do Ranking Geral; o admin mostra o líder atual e a contagem regressiva "Campeão em HH:MM:SS" aparece na atração e em `ranking.html`.
- Os dados ficam no `localStorage` de cada navegador/computador: em mais de uma estação, exporte o JSON de cada uma e importe na principal no fim.
