"""Recorta as poses da Kemi de uma folha com fundo claro e salva PNGs transparentes em assets/kemi/.

Uso:
    python scripts/recortar_kemi.py assets/kemi/_fonte/folha_poses.jpg

Precisa só do Pillow (pip install pillow). As caixas abaixo (esquerda, topo, direita, base) são
as posições das 6 figurinhas na folha; se trocar a folha, ajuste BOXES.
O fundo (e a borda branca da figurinha) vira transparente: o preenchimento começa nos cantos
de cada recorte e para no contorno colorido da bolha.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

SAIDA = Path(__file__).resolve().parent.parent / "assets" / "kemi"

# nome do arquivo -> caixa na folha de 1179x620
BOXES = {
    "kemi_idle": (62, 8, 412, 326),    # olhos abertos
    "kemi_sleepy": (414, 8, 748, 326),  # olhinhos fechados
    "kemi_side": (752, 8, 1068, 326),   # de lado, olhando para cima
    "kemi_happy": (62, 324, 412, 618),  # feliz (^ ^)
    "kemi_down": (414, 324, 748, 618),  # de barriga para cima
    "kemi_wink": (748, 324, 1068, 618), # piscadinha
}
TAM = 512  # lado final do PNG quadrado


def maior_regiao(alpha, grade=200):
    """Mantém só a maior região conectada (descarta fiapos de figurinhas vizinhas)."""
    w, h = alpha.size
    pequeno = alpha.point(lambda v: 255 if v > 20 else 0).resize((grade, grade), Image.BOX)
    px = pequeno.load()
    visto = [[False] * grade for _ in range(grade)]
    melhor = []
    for y in range(grade):
        for x in range(grade):
            if px[x, y] > 40 and not visto[y][x]:
                fila, comp = [(x, y)], []
                visto[y][x] = True
                while fila:
                    cx, cy = fila.pop()
                    comp.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < grade and 0 <= ny < grade and not visto[ny][nx] and px[nx, ny] > 40:
                                visto[ny][nx] = True
                                fila.append((nx, ny))
                if len(comp) > len(melhor):
                    melhor = comp
    mascara = Image.new("L", (grade, grade), 0)
    mp = mascara.load()
    for x, y in melhor:
        mp[x, y] = 255
    mascara = mascara.resize((w, h), Image.NEAREST).filter(ImageFilter.MaxFilter(7))
    return ImageChops.multiply(alpha, mascara)


def recortar(img):
    rgb = img.convert("RGB")
    w, h = rgb.size
    work = rgb.copy()
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(work, seed, (255, 0, 255), thresh=34)
    fundo = ImageChops.difference(work, rgb).convert("L").point(lambda v: 255 if v else 0)
    alpha = ImageChops.invert(fundo)
    # suaviza a borda e come 1 px para não ficar halo branco
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    alpha = maior_regiao(alpha)
    # um pouco mais de cor e contraste: sobre o fundo escuro do jogo a aquarela pálida fica acinzentada
    vivo = ImageEnhance.Contrast(ImageEnhance.Color(rgb).enhance(1.3)).enhance(1.06)
    out = vivo.convert("RGBA")
    out.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    out = out.crop(box)
    # quadrado, com uma folguinha
    lado = max(out.size) + 12
    quad = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    quad.paste(out, ((lado - out.width) // 2, (lado - out.height) // 2), out)
    return quad.resize((TAM, TAM), Image.LANCZOS)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    folha = Image.open(sys.argv[1])
    SAIDA.mkdir(parents=True, exist_ok=True)
    for nome, caixa in BOXES.items():
        recortar(folha.crop(caixa)).save(SAIDA / f"{nome}.png", optimize=True)
        print("OK", nome)


if __name__ == "__main__":
    main()
