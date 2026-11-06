"""Converte o export do simulador de misturas do app Quimia em src/config/misturas.js.

Uso:
    python scripts/importar_misturas.py dados/misturas.csv
    python scripts/importar_misturas.py dados/misturas.json

CSV (com cabeçalho) ou JSON (lista de objetos), com as colunas/chaves:
    produto_a, produto_b, perigosa (sim/nao/true/false/1/0), porque, fonte
    validar (opcional; sim = ainda falta conferir com a FDS. Padrão: nao, pois vem do simulador)

A ordem das linhas é a ordem de entrada no jogo (as primeiras aparecem no começo, as demais por nível).
Misture linhas perigosas e seguras. Frases curtas, sem jargão.
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

SAIDA = Path(__file__).resolve().parent.parent / "src" / "config" / "misturas.js"
FORMAS = ["galao", "garrafa", "frasco", "spray", "pote", "squeeze", "caixa", "lata"]
CORES = ["cyanLight", "mint1", "mint3", "mint2", "sky", "greenDark", "sky2", "success2", "cyan", "cyanDark", "teal1"]


def slug(nome):
    s = unicodedata.normalize("NFD", nome).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", s) or "produto"


def eh_verdadeiro(v):
    return str(v).strip().lower() in {"1", "true", "sim", "s", "perigosa", "perigoso", "yes"}


def ler(caminho):
    p = Path(caminho)
    if p.suffix.lower() == ".json":
        return json.loads(p.read_text(encoding="utf-8"))
    with p.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def js(valor):
    return json.dumps(valor, ensure_ascii=False)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    linhas = ler(sys.argv[1])
    produtos, pares = {}, []
    for i, r in enumerate(linhas, 1):
        a, b = str(r["produto_a"]).strip(), str(r["produto_b"]).strip()
        if not a or not b:
            sys.exit(f"Linha {i}: produto vazio")
        for nome in (a, b):
            if slug(nome) not in produtos:
                produtos[slug(nome)] = {"nome": nome, "cor": CORES[len(produtos) % len(CORES)], "forma": FORMAS[len(produtos) % len(FORMAS)]}
        porque = str(r.get("porque", "")).strip()
        if not porque:
            sys.exit(f"Linha {i}: falta a frase 'porque' ({a} + {b})")
        pares.append({
            "a": slug(a), "b": slug(b), "perigosa": eh_verdadeiro(r["perigosa"]),
            "porque": porque, "fonte": str(r.get("fonte", "")).strip() or "Simulador Quimia",
            "validar": eh_verdadeiro(r.get("validar", "nao")),
        })
    out = ["// GERADO por scripts/importar_misturas.py — não edite à mão (rode o script de novo).", "",
           "export const SOMENTE_VALIDADOS = false;", "", "export const PRODUTOS = {"]
    out += [f"  {k}: {js(v)}," for k, v in produtos.items()]
    out += ["};", "", "export const MISTURAS_TODAS = ["]
    out += [f"  {js(p)}," for p in pares]
    out += ["];", "", "export const MISTURAS = MISTURAS_TODAS.filter((m) => PRODUTOS[m.a] && PRODUTOS[m.b] && (!SOMENTE_VALIDADOS || !m.validar));", ""]
    SAIDA.write_text("\n".join(out), encoding="utf-8")
    perigosas = sum(p["perigosa"] for p in pares)
    print(f"OK: {len(pares)} pares ({perigosas} perigosos, {len(pares) - perigosas} seguros), {len(produtos)} produtos -> {SAIDA}")


if __name__ == "__main__":
    main()
