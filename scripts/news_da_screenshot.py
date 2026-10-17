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
      1. salva la copertina in supabase/notizie/<data>-<slug>.jpg (fuori dal bundle dell'app)
      2. scrive supabase/notizie/<data>-<slug>.sql (INSERT idempotente su public.notizie)
      3. carica la copertina nel bucket "news" dello Storage Supabase (l'app la legge da lì);
         serve SUPABASE_SERVICE_ROLE_KEY nell'ambiente, altrimenti il caricamento va fatto a mano
      4. elimina lo screenshot sorgente (salvo --mantieni-sorgente),
         solo dopo aver verificato che jpg e sql esistano e siano validi.

Richiede Pillow:  pip3 install pillow
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("Serve Pillow: pip3 install pillow")

ROOT = Path(__file__).resolve().parent.parent
SQL_DIR = ROOT / "supabase" / "notizie"
BUCKET = "news"
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


def supabase_url() -> str | None:
    """EXPO_PUBLIC_SUPABASE_URL dall'ambiente o dal file .env del progetto."""
    if os.environ.get("EXPO_PUBLIC_SUPABASE_URL"):
        return os.environ["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/")
    env = ROOT / ".env"
    if env.is_file():
        m = re.search(r"^EXPO_PUBLIC_SUPABASE_URL=(.+)$", env.read_text(encoding="utf-8"), re.M)
        if m:
            return m.group(1).strip().strip("'\"").rstrip("/")
    return None


def carica_storage(jpg: Path, nome_file: str) -> str:
    """Carica la copertina nel bucket news (sovrascrive se esiste). Ritorna l'esito da stampare."""
    url, chiave = supabase_url(), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not chiave:
        return "NON caricata (manca EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY): caricala a mano nel bucket news"
    req = urllib.request.Request(
        f"{url}/storage/v1/object/{BUCKET}/{nome_file}",
        data=jpg.read_bytes(),
        method="POST",
        headers={"Authorization": f"Bearer {chiave}", "apikey": chiave, "Content-Type": "image/jpeg", "x-upsert": "true"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            json.load(r)
    except urllib.error.HTTPError as e:
        return f"NON caricata (HTTP {e.code}: {e.read().decode(errors='replace')[:200]})"
    except urllib.error.URLError as e:
        return f"NON caricata ({e.reason})"
    return f"caricata in {BUCKET}/{nome_file}"


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
    jpg = SQL_DIR / f"{nome}.jpg"
    sql = SQL_DIR / f"{nome}.sql"
    SQL_DIR.mkdir(parents=True, exist_ok=True)

    # 1. copertina
    ritaglia(src, a.box).save(jpg, quality=90)

    # 2. query (idempotente: non reinserisce la stessa copertina)
    url = f"{BUCKET}/{nome}.jpg"
    sql.write_text(
        "insert into public.notizie (titolo, categoria, corpo, url_immagine_copertina, autore, pubblicato_il, pubblicata)\n"
        f"select {sql_str(a.titolo.strip())}, '{a.categoria}', {sql_str(corpo)},\n"
        f"       '{url}', {sql_str(a.autore)}, '{a.data} {a.ora}:00+00', true\n"
        f"where not exists (select 1 from public.notizie where url_immagine_copertina = '{url}');\n",
        encoding="utf-8",
    )

    # 3. verifica e caricamento nello Storage (l'app legge la copertina da lì)
    with Image.open(jpg) as chk:
        chk.verify()
    storage = carica_storage(jpg, f"{nome}.jpg")

    # 4. eliminazione sorgente (la copertina resta comunque in supabase/notizie/)
    if sql.stat().st_size == 0:
        sys.exit("SQL vuoto: sorgente NON eliminata")
    if not a.mantieni_sorgente:
        src.unlink()

    print(f"jpg:  {jpg.relative_to(ROOT)}")
    print(f"sql:  {sql.relative_to(ROOT)}")
    print(f"storage: {storage}")
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
