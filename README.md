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
- In modalità demo: Impostazioni (rotella) > Anteprima > "Partita in diretta (demo)".

### Accesso

Email/password con Supabase Auth (tabella `profili` per il ruolo). Google e Apple richiedono la
configurazione dei provider in Supabase (Authentication > Providers) e un flusso OAuth nativo:
i pulsanti sono già presenti.

## Struttura

```
app/                      rotte (Expo Router)
  _layout.tsx             font, provider, stack principale
  login.tsx               accesso / registrazione / ospite
  live.tsx                centro partita (punteggio, set, cronaca)
  settings.tsx            notifiche e anteprima (modale)
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
