# Passaggio dal progetto precedente

Il nuovo progetto usa **Expo Router** (cartella `app/`) al posto di React Navigation
(`App.tsx` + `src/navigation`). Stesso SDK (57), stesse variabili `.env`, stesso database.

## 1. Da tenere (non toccare)

| File / cartella | Perché |
|---|---|
| `.git/` | storia del progetto |
| `.env` | stesse variabili: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `.vscode/`, `.claude/`, `CLAUDE.md`, `AGENTS.md`, `LICENSE` | configurazione editor e strumenti |

## 2. Da sostituire con quelli del nuovo zip

`package.json`, `package-lock.json`, `app.json`, `tsconfig.json`, `.gitignore`, `README.md`,
`assets/` (icone rigenerate dal logo originale, che resta in `assets/brand/`),
`supabase/migrations/` (contiene la tua `20261001_…` più una nuova `20261004_…`).

## 3. Unito nel nuovo codice (poi il vecchio file si elimina)

| Vecchio | Dove è finito |
|---|---|
| `src/lib/api.ts`, `src/lib/types.ts` | `src/lib/api.ts`: schema italiano, solo stagioni `corrente = true` (anche più di una) |
| `src/lib/useLivePartita.ts` | `src/store/LiveProvider.tsx` + `api.ts`: Realtime su `partite`, `set_partita`, `eventi_live`, chi batte dedotto dal punteggio |
| `screens/media/MediaScreen.tsx` | sezione "Video e podcast" nella tab Altro (miniature YouTube) |
| `screens/giovanili/GiovaniliScreen.tsx` | tab Giovanili: allenatori presi da `staff`, prossima/ultima partita da `partite` |
| statistiche in `giocatrici` (`punti`, `ace`, `muri`, `altezza_cm`, `capitana`, `data_nascita`) | scheda giocatrice |
| `assets/brand/logo-arena.png`, `logo-arena-smapiu.png` | `assets/brand/avt-logo-white.png`, `smapiu-white.png` (stessi loghi) |
| `src/foto-giocatrici/`, `src/loghi-sponsor/` | `assets/players/`, `assets/sponsors/` |

## 4. Da eliminare

| File / cartella | Perché |
|---|---|
| `App.tsx`, `index.ts` | l'avvio ora è `expo-router/entry` |
| `src/` (tutta) | sostituita dalla nuova `src/` + `app/` |
| `smapiu-arenavolley-app/` | vecchia copia duplicata del progetto |
| `src.zip`, `src/foto-giocatrici.zip`, `src/loghi-sponsor.zip` | archivi già estratti |
| `src/*.csv`, `src/seed_*.sql`, `src/migrazione_*.sql` | pensati per lo schema in inglese: il DB è già popolato |
| `src/Arena_Volley_Team_PWA_2.html` | prototipo web, superato |
| `src/lib/supabase_2.ts` | doppione |
| `.expo/`, `node_modules/`, tutti i `.DS_Store` | si rigenerano |

Non portati perché nessuna schermata li usava ancora: `promo_sponsor`, `album_foto` / `foto`.
Dipendenze non più necessarie: React Navigation, `@expo/vector-icons`, font DM Sans e Inter Tight.

## Comandi

```bash
cd smapiuArenaVolley
git add -A && git commit -m "stato prima della nuova app"   # ci sono modifiche non salvate
git checkout -b nuova-app

git rm --cached .env          # .env era tracciato da git: resta sul disco, esce dal repository
rm -rf App.tsx index.ts src smapiu-arenavolley-app src.zip node_modules .expo package-lock.json
find . -name .DS_Store -delete

# copia qui DENTRO il contenuto della cartella smapiu-arena-volley dello zip (sovrascrivendo)

npm install
npx expo start -c
```

Poi in Supabase > SQL Editor esegui `supabase/migrations/20261004_logo_avversario_e_realtime.sql`
(e, se non l'hai già fatto, le righe `alter publication` per la diretta in tempo reale).

## Da decidere prima della prima build per gli store

`app.json` contiene `ios.bundleIdentifier` e `android.package` = `it.arenavolleyteam.app`
(il vecchio progetto non li aveva). Una volta pubblicata l'app non si possono più cambiare.
