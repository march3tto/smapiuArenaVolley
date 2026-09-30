# SmapiuArenaVolley — app Expo

Scheletro funzionante dell'app: navigazione a 5 tab (come nel mockup),
client Supabase configurato, e le prime schermate che leggono dati reali
dal database (Home, Rosa, Giovanili, News, Media, Live con Realtime).

## 1. Crea il progetto Expo

```bash
npx create-expo-app@latest smapiu-arenavolley --template blank-typescript
cd smapiu-arenavolley
```

## 2. Installa le dipendenze (usa sempre `expo install`, non `npm install`,
   così Expo sceglie le versioni compatibili con il tuo SDK)

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npx expo install @expo/vector-icons
```

## 3. Copia i file

Copia la cartella `src/` e il file `App.tsx` di questo pacchetto dentro
la root del progetto appena creato (sovrascrivendo l'`App.tsx` generato
da `create-expo-app`).

## 4. Configura le variabili d'ambiente

Copia `.env.example` in `.env` nella root del progetto e compila i due
valori — li trovi in Supabase, Settings → API:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Expo espone automaticamente le variabili con prefisso `EXPO_PUBLIC_` al
codice client — non serve nessuna libreria aggiuntiva.

## 5. Avvia

```bash
npx expo start
```

## Cosa c'è già

- `src/lib/supabase.ts` — client Supabase con sessione persistita
- `src/theme/colors.ts` — palette navy/giallo dello stesso mockup
- `src/types/database.ts` — tipi TypeScript per le tabelle usate
- `src/navigation/RootNavigator.tsx` — tab bar (Squadra, Giovanili, News,
  Media, Altro) con stack annidati per Squadra (Home → Live) e Altro
  (Menu → Rosa), come nella struttura decisa nel mockup
- `src/screens/squadra/HomeScreen.tsx` — mostra la partita live (se c'è)
  o la prossima in calendario, più le ultime news
- `src/screens/squadra/LiveScreen.tsx` — punteggio e cronaca aggiornati
  in tempo reale via Supabase Realtime sulla tabella `live_events`
- `src/screens/altro/RosaScreen.tsx` — rosa giocatrici da `players`
- `src/screens/giovanili/GiovaniliScreen.tsx` — categorie da `youth_categories`
- `src/screens/news/NewsScreen.tsx` — feed da `news`
- `src/screens/media/MediaScreen.tsx` — elenco da `media_items`
- `src/screens/altro/MenuScreen.tsx` — voce "Rosa giocatrici" + placeholder
  per Società/Sponsor/Impostazioni (da collegare in seguito)

## Prossimi passi (non ancora in questo pacchetto)

- Popolare `seasons`, `players`, `matches`, ecc. con dati reali
- Schermate di dettaglio (giocatrice, partita conclusa, articolo news)
- Autenticazione (login staff/admin per scrivere risultati live)
- Upload immagini su Supabase Storage
