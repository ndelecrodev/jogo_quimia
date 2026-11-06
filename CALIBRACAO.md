# Calibração da pontuação (bots) — Quimia Arcade

Todos os jogos mostram, no HUD, na tela final, no ranking e nos brindes, a **pontuação escalada**: `round(ponto bruto x SCORE_SCALE[jogo])`
(`src/config/difficulty.js`). O ritmo da dificuldade continua usando os pontos **brutos** (`PONTOS_POR_NIVEL`).
`PARS` é **300 para todos** os jogos, então a Pontuação Quimia (`pontos / par x 1000`) é comparável.

## Como foi calibrado
`tests/bots_calibracao.js`: bots de 3 níveis (iniciante, médio, bom) jogam cada jogo 30 vezes, sem desenhar a tela
(`game.step()` com o fio do jogo parado). Para refazer, com o jogo aberto (sem a nuvem: o script a desliga na memória):

```js
const { calibrar } = await import('./tests/bots_calibracao.js');
localStorage.removeItem('bots_tmp');
const r = await calibrar({ n: 30 });   // o WebGL do navegador pode cair após ~250 partidas: recarregue e chame de novo (o que terminou é pulado)
console.table(r.resumo);
```

**Os bots NÃO são humanos.** Servem para igualar os jogos entre si e achar vão impossível. Refaça os números com partidas reais da feira (admin > Calibrar).

## Tabela final (bots, 30 partidas por célula; pontos já na escala final)
| Jogo | SCORE_SCALE | PAR | Meta do brinde (minScores = P40 do médio) | Iniciante (mediana) | **Médio: mediana / P40 / P80** | Bom: mediana / P80 | Tempo até perder as 3 vidas (mediana: médio / bom) |
|---|---|---|---|---|---|---|---|
| Kemi Bolha | 15 | 300 | 175 | 120 | **188 / 174 / 312** | 495 / 588 | 19 s / 37 s |
| Pode Misturar? | 6 | 300 | 165 | 66 | **186 / 166 / 354** | 873 / 1224 | 35 s / 95 s |
| Kemi Sobe | 2,7 | 300 | 150 | 156 | **173 / 149 / 650** | 223 / 788 | 32 s / 32 s |
| Kemi Runner | 0,62 | 300 | 165 | 125 | **193 / 167 / 413** | 442 / 503 | 25 s / 47 s |

Mediana do bot médio: 173 a 193 (média 185): todos dentro de ±7% (meta: ±15%).

## Pontos por habilidade (não por tempo parado)
- **Runner:** distância pesa menos (1 ponto bruto a cada 120 px, antes 40); obstáculo superado +10; bolhinha +25.
- **Sobe:** altura 1 ponto a cada 20 px (antes 10); power-up +25.
- **Pode Misturar?:** combo máximo x3 (antes x5).
- **Kemi Bolha:** 1 ponto por vão, 2 por bolhinha (como antes); a escala (x15) faz o resto.

## Kemi Bolha: por que o vão mínimo é 224 e não 200
O pulo sobe ~108 px. Com raio de acerto ~52 px, um vão de 200 deixa só 96 px livres, menos que a oscilação de um pulo.
Teste com um bot quase perfeito (decide a cada frame, sem erro de mira), mesma tabela de velocidade:

| vão mínimo | tempo até perder as 3 vidas (mediana) | chegou ao teto de 120 s |
|---|---|---|
| 200 px | 47 s | 0 de 8 |
| 216 px | 51 s | 0 de 8 |
| 232 px | 120 s | 6 de 8 |
| 248 px | 120 s | 8 de 8 |

Ficou **224 px** (300 → 224 em passos de ~12; velocidade 250 → 430; `maxDelta` 120 → 260; `spacing` 580 → 520; nível a cada 4 pontos).

## Limites desta calibração
- Bot "médio" do Bolha perde as 3 vidas em ~19 s e o "bom" em ~37 s (meta humana: mediano 45-75 s). Os bots não antecipam como uma pessoa; vale conferir com gente de verdade nas primeiras partidas.
- Bots do Kemi Sobe quase não distinguem médio de bom (a mira deles é tosca); o número de Sobe é o menos confiável.
- Depois de mudar `SCORE_SCALE`, `PARS` ou `minScores`: **Zerar tudo** (local e nuvem), senão o ranking mistura escalas.

## Atualização (Sobe e Runner mais difíceis, sem prateleiras de ajuda)
Depois de endurecer o Kemi Sobe e o Kemi Runner e de tirar as prateleiras que surgiam sozinhas quando a Kemi ficava parada, o bot médio do Sobe passou a perder as 3 vidas em ~18 s (antes ~32 s; as prateleiras de ajuda o salvavam) e a mediana bruta caiu de 73 para 23. Como o bot é fraco no Sobe, **não** igualei a mediana dele aos outros jogos (daria escala 8, generosa demais para pessoas): `SCORE_SCALE.sobe = 5` e meta do brinde 110. Runner: bot médio 177, bom 440 (escala 0,62 mantida). **Revise o Sobe com as primeiras partidas reais** (admin > Calibrar).
