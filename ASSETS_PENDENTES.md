# Assets pendentes

O jogo roda sem estes itens (usa arte desenhada em código). Quando os arquivos existirem, basta colocá-los em `assets/` e ligar em `assets/manifest.json`, sem mexer em código.

## Já ligados
- `assets/kemi/kemi_idle.png`, `kemi_sleepy.png`, `kemi_happy.png`, `kemi_wink.png`, `kemi_side.png`, `kemi_down.png`: poses recortadas da folha em `assets/kemi/_fonte/folha_poses.jpg` (`python scripts/recortar_kemi.py assets/kemi/_fonte/folha_poses.jpg`).

## Ainda desenhados em código (opcional trocar por arte)
| Item | Hoje | Arte ideal |
|---|---|---|
| Frascos da Kemi Bolha e produtos do Pode Misturar? | Formas vetoriais com contorno azul | PNG transparente, estilo aquarela da Kemi (frasco e pote, ~300 px de altura) |
| Prateleiras da Kemi Sobe (normal, que anda, que quebra) | Retângulos arredondados | PNG 256×36, 3 variações |
| Vapor tóxico simpático | Nuvem coral com olhinhos | PNG ~190×130, 1 a 3 variações |
| Bolhinhas coletáveis e vidas | Bolha vetorial | PNG ~96×96 (dá para usar as bolhinhas da folha) |
| Tampinha-foguete e escudo-FDS | Ícones vetoriais | PNG ~96×96 |
| Logo Quimia na atração | Só texto "QUIMIA ARCADE" (o favicon já usa o símbolo da Quimia) | SVG do símbolo ou logo completo |
| Sons e música | Sintetizados em WebAudio | Opcional: arquivos curtos `.ogg` |
| Pose da Kemi comemorando (campeão) | Usa `kemi_happy` | PNG novo |
