#!/usr/bin/env python3
"""
Trasforma uno screenshot di un post (Instagram, Facebook, ...) in una news per l'app.

Sottocomandi:
  info <screenshot>
      Stampa le dimensioni reali dello screenshot (pixel).

  anteprima <screenshot> --box x1,y1,x2,y2 [--out percorso.jpg]
      Ritaglia l'area indicata (pixel reali) e salva un'anteprima da controllare.

  crea <screenshot> --box x1,y1,x2,y2 --data AAAA-MM-GG --slug testo-breve
       --titolo "..." --categoria giovanili --corpo-file corpo.txt
       [--ora 10:00] [--autore "Arena Volley Team"] [--mantieni-sorgente]
      1. salva la copertina in assets/news/<data>-<slug>.jpg
      2. scrive supabase/notizie/<data>-<slug>.sql (INSERT idempotente su public.notizie)
      3. aggiunge la voce a NEWS_IMAGES in src/data/assets.ts
      4. elimina lo screenshot sorgente (salvo --mantieni-sorgente),
         solo dopo aver verificato che jpg e sql esistano e siano validi.

Richiede Pillow:  pip3 install pillow
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Serve Pillow: pip3 install pillow")

ROOT = Path(__file__).resolve().parent.parent
NEWS_DIR = ROOT / "assets" / "news"
SQL_DIR = ROOT / "supabase" / "notizie"
ASSETS_TS = ROOT / "src" / "data" / "assets.ts"
CATEGORIE = {"societa", "prima_squadra", "giovanili", "sponsor"}
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def parse_box(s: str) -> tuple[int, int, int, int]:
    try:
        x1, y1, x2, y2 = (int(v) for v in s.split(","))
    except ValueError:
        raise argparse.ArgumentTypeError("--box deve essere x1,y1,x2,y2 (interi)")
    if x2 <= x1 or y2 <= y1:
        raise argparse.ArgumentTypeError("--box: x2>x1 e y2>y1")
    return x1, y1, x2, y2


def ritaglia(src: Path, box: tuple[int, int, int, int]) -> Image.Image:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    x1, y1, x2, y2 = box
    if x2 > w or y2 > h:
        sys.exit(f"--box fuori dall'immagine ({w}x{h})")
    return im.crop(box)


def sql_str(s: str) -> str:
    return "E'" + s.replace("\\", "\\\\").replace("'", "''").replace("\n", "\\n") + "'"


def aggiorna_assets_ts(nome: str) -> bool:
    """Aggiunge la voce a NEWS_IMAGES (ordinata). Ritorna True se ha modificato il file."""
    testo = ASSETS_TS.read_text(encoding="utf-8")
    m = re.search(r"(export const NEWS_IMAGES[^{]*\{\n)(.*?)(\n\};)", testo, re.S)
    if not m:
        sys.exit("NEWS_IMAGES non trovato in src/data/assets.ts")
    righe = [r for r in m.group(2).split("\n") if r.strip()]
    if any(f"'{nome}'" in r for r in righe):
        return False
    righe.append(f"  '{nome}': require('../../assets/news/{nome}.jpg'),")
    righe.sort()
    nuovo = testo[: m.start(2)] + "\n".join(righe) + testo[m.end(2):]
    ASSETS_TS.write_text(nuovo, encoding="utf-8")
    return True


def cmd_info(a):
    im = Image.open(a.screenshot)
    print(f"{im.size[0]}x{im.size[1]}")


def cmd_anteprima(a):
    out = Path(a.out) if a.out else Path("/tmp") / f"anteprima-{Path(a.screenshot).stem}.jpg"
    ritaglia(Path(a.screenshot), a.box).save(out, quality=90)
    print(out)


def cmd_crea(a):
    src = Path(a.screenshot)
    if not src.is_file():
        sys.exit(f"Sorgente non trovata: {src}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", a.data):
        sys.exit("--data deve essere AAAA-MM-GG")
    if not SLUG_RE.match(a.slug):
        sys.exit("--slug: solo minuscole, numeri e trattini")
    if a.categoria not in CATEGORIE:
        sys.exit(f"--categoria deve essere una di {sorted(CATEGORIE)}")
    if not re.fullmatch(r"\d{2}:\d{2}", a.ora):
        sys.exit("--ora deve essere HH:MM")
    corpo = Path(a.corpo_file).read_text(encoding="utf-8").strip()
    if not corpo or not a.titolo.strip():
        sys.exit("Titolo e corpo non possono essere vuoti")

    nome = f"{a.data}-{a.slug}"
    jpg = NEWS_DIR / f"{nome}.jpg"
    sql = SQL_DIR / f"{nome}.sql"
    NEWS_DIR.mkdir(parents=True, exist_ok=True)
    SQL_DIR.mkdir(parents=True, exist_ok=True)

    # 1. copertina
    ritaglia(src, a.box).save(jpg, quality=90)

    # 2. query (idempotente: non reinserisce la stessa copertina)
    url = f"news/{nome}.jpg"
    sql.write_text(
        "insert into public.notizie (titolo, categoria, corpo, url_immagine_copertina, autore, pubblicato_il, pubblicata)\n"
        f"select {sql_str(a.titolo.strip())}, '{a.categoria}', {sql_str(corpo)},\n"
        f"       '{url}', {sql_str(a.autore)}, '{a.data} {a.ora}:00+00', true\n"
        f"where not exists (select 1 from public.notizie where url_immagine_copertina = '{url}');\n",
        encoding="utf-8",
    )

    # 3. registrazione dell'immagine nell'app
    modificato = aggiorna_assets_ts(nome)

    # 4. verifica ed eliminazione sorgente
    with Image.open(jpg) as chk:
        chk.verify()
    if sql.stat().st_size == 0:
        sys.exit("SQL vuoto: sorgente NON eliminata")
    if not a.mantieni_sorgente:
        src.unlink()

    print(f"jpg:  {jpg.relative_to(ROOT)}")
    print(f"sql:  {sql.relative_to(ROOT)}")
    print(f"assets.ts: {'aggiornato' if modificato else 'voce già presente'}")
    print(f"sorgente: {'mantenuta' if a.mantieni_sorgente else 'eliminata'} ({src})")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("info"); s.add_argument("screenshot"); s.set_defaults(f=cmd_info)

    s = sub.add_parser("anteprima")
    s.add_argument("screenshot"); s.add_argument("--box", type=parse_box, required=True); s.add_argument("--out")
    s.set_defaults(f=cmd_anteprima)

    s = sub.add_parser("crea")
    s.add_argument("screenshot")
    s.add_argument("--box", type=parse_box, required=True)
    s.add_argument("--data", required=True)
    s.add_argument("--ora", default="10:00")
    s.add_argument("--slug", required=True)
    s.add_argument("--titolo", required=True)
    s.add_argument("--categoria", required=True)
    s.add_argument("--corpo-file", required=True)
    s.add_argument("--autore", default="Arena Volley Team")
    s.add_argument("--mantieni-sorgente", action="store_true")
    s.set_defaults(f=cmd_crea)

    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
