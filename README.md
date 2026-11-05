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

> Marcos entregues até aqui: 1 (fundação) e 2 (Kemi Bolha). Pode Misturar? e Kemi Sobe ainda usam o jogo "em construção".

