# Smapiù Arena Volley Team — app Expo

Vedi `MIGRAZIONE.md` per il passaggio dal progetto precedente.

App ufficiale (iOS, Android e web) dell'Arena Volley Team Verona, Serie A3 femminile.
Expo SDK 57, Expo Router, TypeScript.

## Avvio

```bash
npm install
npx expo install --fix      # allinea le versioni all'SDK installato
cp .env.example .env        # facoltativo: senza Supabase l'app usa i dati demo
npx expo start
```

Poi apri con Expo Go (QR code), oppure premi `i` / `a` / `w` per simulatore iOS, Android o browser.

L'accesso con **Apple e Google** usa moduli nativi e richiede una **development build** (`expo-dev-client`), non
Expo Go:

```bash
npx expo run:ios            # oppure: eas build --profile development --platform ios
npx expo run:android        # oppure: eas build --profile development --platform android
npx expo start --dev-client
```

## Supabase

Imposta in `.env` (stesse variabili del progetto precedente):

```
EXPO_PUBLIC_SUPABASE_URL=https://<progetto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

- **Con Supabase configurato** l'app legge solo dal database (schema in italiano: `stagioni`,
  `partite`, `set_partita`, `eventi_live`, `classifiche`, `giocatrici`, `staff`,
  `categorie_giovanili`, `notizie`, `sponsor`, `media`). Se il caricamento fallisce compare un
  avviso in home e si può riprovare trascinando verso il basso.
- **Senza `.env`** l'app usa i dati demo di `src/data/mock.ts` (utile per provare la grafica).

Query e conversione righe → tipi dell'app sono tutte in `src/lib/api.ts`. Vengono letti solo i
dati delle stagioni con `corrente = true`.

Immagini: se `foto_url` (giocatrici) o `url_logo` (sponsor) contengono un URL completo viene usato
quello; altrimenti l'app usa la foto/logo incluso in `assets/` con lo stesso nome
(es. `beatrice-giroldi`, `sitta`).

Migrazioni in `supabase/migrations/`.

### Diretta

- La card "In diretta" in home e la voce Diretta compaiono **solo** se una partita ha `stato = 'live'`.
- L'app ascolta in Realtime `partite`, `set_partita` e `eventi_live`: devono essere nella
  pubblicazione `supabase_realtime` (vedi fondo della migrazione 20261004).
- Chi ha fatto punto si deduce dal punteggio degli eventi (timeout e cambi restano neutri).
- Partita demo: con Supabase la attiva un admin collegato da Impostazioni (rotella) > Partita demo > "Partita in diretta (demo)",
  e la vedono solo gli admin. Senza `.env` è accesa di default (si spegne con `EXPO_PUBLIC_DEMO_LIVE=0`).

### Accesso, consensi e GDPR

- Email/password, **Apple** (solo iOS, nativo), **Google** (nativo) e **Facebook** (OAuth nel browser, PKCE) con
  Supabase Auth: `src/lib/auth.ts`. Sul web solo email.
- Ogni nuovo utente nasce con ruolo `pubblico` (trigger su `auth.users`); i ruoli si cambiano solo con la RPC
  `imposta_ruolo_utente`, `admin` solo da SQL.
- Dopo il login, se mancano la dichiarazione 14 anni o l'informativa nella versione corrente
  (`PRIVACY_POLICY_VERSION` in `app.config.ts`), l'app mostra l'onboarding consensi bloccante
  (`src/components/ConsentGate.tsx`). Consensi in `consensi_utente` (append-only).
- Impostazioni > Account e privacy: consensi, marketing, categoria giovanile, eliminazione account (Edge Function
  `elimina-account`).
- La rosa si legge dalla vista `giocatrici_pubbliche`: foto e bio solo con liberatoria (`giocatrici.consenso_foto`).

Configurazione delle console (Supabase, Apple, Google, Meta), secrets e attività manuali: `docs/gdpr/README.md`.

## Struttura

```
app/                      rotte (Expo Router)
  _layout.tsx             font, provider, stack principale
  login.tsx               accesso / registrazione / ospite
  live.tsx                centro partita (punteggio, set, cronaca)
  settings.tsx            notifiche e anteprima (modale)
  account.tsx             account e privacy: consensi, categoria, link a elimina-account
  elimina-account.tsx     cancellazione dell'account
  auth/callback.tsx       ritorno dal login Facebook
  player/[id].tsx         scheda giocatrice (modale)
  (tabs)/                 Home, Risultati, Squadra, Giovanili, News, Altro
src/
  components/             UI riutilizzabile (card, badge, tab bar, slider...)
  store/                  AppProvider (sessione, preferenze), DataProvider, LiveProvider
  lib/                    supabase, api (query + mapper), formattazione date
  data/                   dati demo e immagini locali
  theme/                  colori chiaro/scuro, font Inter
assets/                   icona, splash, logo, foto giocatrici, loghi sponsor
```

## Pubblicazione sugli store

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all
eas submit --platform ios      # e/o android
```

Prima della pubblicazione: verificare `ios.bundleIdentifier` e `android.package` in `app.json`,
sostituire contatti e dati demo con quelli reali.
