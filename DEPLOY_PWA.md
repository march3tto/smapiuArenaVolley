# PWA su Cloudflare Pages

La stessa app Expo, esportata per il web e installabile come PWA ("Smapiù Arena Volley").
La build nativa iOS/Android non cambia: tutto ciò che è solo web sta in `app/+html.tsx`, `public/`,
`scripts/build-sw.mjs` e `src/components/PwaUpdater.web.tsx`.

## Build

```sh
npm run build:web     # expo export -p web → dist/ + service worker (dist/sw.js)
```

Prova in locale con le stesse regole di Cloudflare (`_redirects`, `_headers`):

```sh
npx wrangler pages dev dist
```

Il service worker si registra solo nella build di produzione: con `npm run web` (sviluppo) non c'è.

## Impostazioni del progetto Cloudflare Pages

Workers & Pages → Create → Pages → Connect to Git → repository `smapiuArenaVolley`.

| Impostazione | Valore |
|---|---|
| Framework preset | None |
| Build command | `npm run build:web` |
| Build output directory | `dist` |
| Root directory | *(vuota)* |
| Production branch | `main` (dopo il merge di `feature/pwa`) |

Variabili d'ambiente (Settings → Variables and Secrets, sia Production sia Preview):

| Variabile | Valore |
|---|---|
| `NODE_VERSION` | `22` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<ref-progetto>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | chiave **publishable/anon** di Supabase |

Solo valori pubblici: tutto ciò che inizia con `EXPO_PUBLIC_` finisce nel JavaScript scaricato dal browser.
**Mai** la service role key di Supabase né la chiave Groq: quella dell'assistente resta un secret della
Edge Function `assistente` (`supabase secrets set GROQ_API_KEY=...`).

Facoltative, solo se servono anche sul web: `EXPO_PUBLIC_DEMO_LIVE=1` (partita dimostrativa).
Le variabili dei login social non hanno effetto sul web (vedi sotto).

## File serviti da `public/`

- `manifest.json`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`: installazione.
- `offline.html`: mostrata dal service worker se si apre una pagina mai visitata senza rete.
- `_redirects`: le rotte con parametri (`/player/:id`, `/notizia/:id`, `/giornata/:numero`, `/formazione/:squadra`,
  `/info/:section`) sono esportate come un'unica pagina `[param].html`; la regola la serve per ogni valore.
  Le altre rotte hanno il loro file; un indirizzo sconosciuto riceve `index.html` e l'app mostra "pagina non trovata".
  Aggiungendo una nuova rotta con parametri in `app/`, va aggiunta qui la sua riga.
- `_headers`: `no-cache` per HTML, `sw.js` e `manifest.json`; cache di un anno (`immutable`) per `/_expo/static/*`
  e `/assets/*` (nomi con hash); header di sicurezza (`nosniff`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`, HSTS). Nessuna Content-Security-Policy: bloccherebbe facilmente Supabase e l'iframe di YouTube.

## Service worker (Workbox)

- Precache: bundle JS di Expo, icone, manifest, `offline.html`.
- Pagine HTML: prima la rete (timeout 5 s), poi la copia salvata, poi `offline.html`.
- File con hash (`/_expo/static/`, `/assets/`): prima la cache.
- Supabase (REST, Auth, Realtime via websocket, Storage, Edge Functions come l'assistente) e ogni altro dominio:
  mai in cache, vanno sempre in rete.
- Nuova versione: il service worker nuovo resta in attesa e l'app mostra "Nuova versione disponibile – Aggiorna";
  toccando Aggiorna prende il controllo e la pagina si ricarica. L'app controlla gli aggiornamenti
  quando torna in primo piano e ogni 30 minuti.

## Supabase Auth: URL da consentire

Authentication → URL Configuration.

- **Site URL**: lascialo com'è finché l'app nativa è quella principale. I link di conferma email e di recupero
  password portano lì, perché l'app non passa `emailRedirectTo` (vedi "Limiti noti").
- **Redirect URLs**, da aggiungere:
  - `https://<progetto>.pages.dev/**` (produzione Cloudflare)
  - `https://*.<progetto>.pages.dev/**` (deploy di anteprima, uno per ramo e commit)
  - `https://<dominio-personalizzato>/**` (es. `https://app.arenavolleyteam.it/**`), se lo colleghi
  - `arenavolley://**` (già usato dall'app nativa per il login Facebook: lasciarlo)
  - `http://localhost:8081/**` e `http://localhost:8788/**` (sviluppo e prova locale), facoltativi

Provider social (Google, Apple, Facebook): **oggi sul web non servono modifiche**, perché la PWA offre solo
l'accesso con email (i pulsanti social compaiono solo su iOS/Android). Se un giorno si attivano anche sul web,
con OAuth via redirect di Supabase:

- Google Cloud → client OAuth web → *Authorized JavaScript origins*: i domini sopra (pages.dev e personalizzato);
  il *redirect URI* resta `https://<ref-progetto>.supabase.co/auth/v1/callback`.
- Facebook → Facebook Login → *Valid OAuth Redirect URIs*: `https://<ref-progetto>.supabase.co/auth/v1/callback`
  (già presente se il login nativo è configurato) e i domini della PWA tra gli *App Domains*.
- Apple → serve un *Services ID* con i domini della PWA e `https://<ref-progetto>.supabase.co/auth/v1/callback`
  come Return URL.

## Cosa sul web è diverso dal nativo

| Funzione | Web |
|---|---|
| Accesso | solo email (Apple, Google, Facebook solo nell'app nativa) |
| Notifiche push | disattivate (`src/notifications`: solo iOS/Android) |
| Vibrazione sul punto in diretta | assente |
| Video della diretta | iframe YouTube (`StreamView.web.tsx`); il Picture in Picture è quello del browser |
| Picture in Picture Android | non esiste sul web |

## Limiti noti

- **Notifiche push**: non ci sono sulla PWA. Aggiungerle richiede Web Push (chiavi VAPID, iscrizione nel
  service worker, invio dalla function `invia-notifica`); su iPhone/iPad funzionerebbero solo con la PWA
  aggiunta alla schermata Home (iOS 16.4 o successivo).
- **Offline**: le pagine già visitate si riaprono, ma i dati (risultati, news, diretta) arrivano da Supabase
  e senza rete l'app resta sulla schermata di caricamento. Le pagine mai visitate mostrano `offline.html`.
- **Email di conferma e recupero password**: senza `emailRedirectTo` i link portano al Site URL di Supabase,
  e l'app (nativa e web) non ha una schermata per impostare la nuova password dal link.
- **Installazione su iOS**: Safari non mostra un invito automatico; si installa da Condividi → "Aggiungi alla schermata Home".
- **Export statico**: `expo export` esegue il codice delle schermate anche in Node per generare l'HTML.
  Codice che usa `window`/`document` al caricamento del modulo farebbe fallire la build web.
