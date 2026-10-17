---
name: news-da-screenshot
description: Trasforma gli screenshot di post (Instagram/Facebook) messi in news-inbox/ in news per l'app — copertina jpg caricata nel bucket news di Supabase Storage, query SQL per public.notizie — ed elimina lo screenshot sorgente. Usala quando l'utente chiede di elaborare la cartella news-inbox o di creare news da screenshot.
---

# News da screenshot

Elabora **ogni** immagine (`.png`, `.jpg`, `.jpeg`, `.heic` esclusi i file nascosti) presente in `news-inbox/`, una alla volta. Lo strumento è `scripts/news_da_screenshot.py` (richiede Pillow: `pip3 install pillow`).

## Per ogni screenshot

1. **Leggi** lo screenshot con Read e ricava i dati dal testo del post:
   - **titolo**: breve, informativo, in italiano (es. "Serie D, Coppa Veneto: vittoria 3-1 contro Iper Volley"). Usa anche il testo della grafica (nome completo del torneo, ecc.).
   - **corpo**: il testo del post ripulito — togli l'@ dell'account, metti maiuscole corrette (Serie D, Serie B2), risultati in formato `Squadra A - Squadra B 3-1 (25-22, ...)`, paragrafi separati da riga vuota. Non inventare nulla che non sia nel post o nella grafica.
   - **categoria**: `giovanili` per account/grafiche del Settore Giovanile / Young (Serie B2, C, D, under), `prima_squadra` per la Serie A3, `sponsor` per sponsor, altrimenti `societa`.
   - **data**: il post mostra un tempo relativo ("3 g", "4 giorni fa", "2 h"). Sottrailo alla data dello screenshot, presa dal nome file (`Screenshot AAAA-MM-GG alle HH.MM.SS`) o dall'orologio nella barra del menu. Se il post mostra una data assoluta, usa quella.
   - **slug**: 3–6 parole minuscole con trattini (es. `serie-d-coppa-veneto-iper-volley`).

2. **Trova il riquadro** della grafica del post (solo l'immagine, senza didascalia né interfaccia):
   - `python3 scripts/news_da_screenshot.py info <file>` → dimensioni reali in pixel. Le coordinate che stimi guardando l'immagine vanno riportate in scala su queste dimensioni.
   - `python3 scripts/news_da_screenshot.py anteprima <file> --box x1,y1,x2,y2` → stampa il percorso dell'anteprima; **aprila con Read** e controlla che non ci siano bordi dell'interfaccia, frecce di navigazione o testo tagliato. Correggi il box e ripeti finché è pulita (di solito conviene rientrare di 3–5 px dai bordi del riquadro).
   - Se il post è un carosello, usa la slide visibile.

3. **Scrivi il corpo** in un file temporaneo (es. `/tmp/corpo.txt`) e lancia:
   ```
   python3 scripts/news_da_screenshot.py crea "<file>" --box x1,y1,x2,y2 \
     --data AAAA-MM-GG --slug <slug> --titolo "<titolo>" \
     --categoria <categoria> --corpo-file /tmp/corpo.txt
   ```
   Lo script salva `supabase/notizie/<data>-<slug>.jpg`, scrive `supabase/notizie/<data>-<slug>.sql` (INSERT idempotente), carica la copertina nel bucket pubblico `news` dello Storage Supabase e **solo dopo aver verificato i file** elimina lo screenshot. L'app legge le copertine **solo** dallo Storage (`url_immagine_copertina = "news/<file>.jpg"`): non vanno mai messe in `assets/` né registrate in `src/data/assets.ts`.
   Il caricamento richiede `SUPABASE_SERVICE_ROLE_KEY` nell'ambiente (mai nel `.env` dell'app); se manca, lo script lo segnala e la copertina va caricata a mano nel bucket `news`. Se un passo fallisce lo screenshot resta in `news-inbox/`.

## Regole

- Se uno screenshot non è leggibile, non è un post della società, o mancano dati essenziali, **non** chiamare `crea`: lascialo in `news-inbox/` e segnalalo nel riepilogo.
- Non eseguire le query su Supabase: le crea soltanto. L'utente decide quando applicarle.
- Se esiste già una news con lo stesso `<data>-<slug>`, scegli uno slug diverso.

## Riepilogo finale

Una riga per news: titolo, categoria, data (indicando che è stimata dal tempo relativo, e che l'ora 10:00 è convenzionale), file creati, esito del caricamento su Storage. Poi l'elenco degli screenshot rimasti in `news-inbox/` con il motivo.
