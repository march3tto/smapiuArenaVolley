# Da fare

Punti rimasti aperti dopo il lavoro su accesso, consensi, cancellazione account e GDPR (ottobre 2026).
Il dettaglio delle configurazioni è in [gdpr/README.md](gdpr/README.md).

**Situazione attuale**: l'app offre solo l'accesso con **email e password**. Database aggiornato (migration
`20261016000100`-`300` applicate il 16/10/2026), liberatorie foto registrate per la prima squadra, Supabase configurato
(Site URL, redirect, conferma email, password minima 8). Il codice per Apple, Google e Facebook è pronto ma spento.

---

## 1. Prima di pubblicare sugli store (bloccanti)

- [ ] **Pubblicare le pagine privacy**: unire il branch in `main` e attivare GitHub Pages
  (Settings > Pages > Source: "GitHub Actions"). Verificare che si aprano
  https://march3tto.github.io/smapiuArenaVolley/privacy/ e `/elimina-account/`.
- [x] **Edge Function `elimina-account` pubblicata** (16/10/2026, verifica JWT attiva; rifiuta chiamate senza utente).
  Se si modifica il codice: `supabase functions deploy elimina-account`.
- [ ] **Provare la cancellazione dall'app** con un utente di prova (vedi sotto, "Prova completa").
- [ ] **SMTP personalizzato** in Supabase (Authentication > Emails > SMTP Settings). Senza, le email di conferma e di
  recupero password arrivano solo ai membri del team Supabase. Chiedere i dati SMTP a chi gestisce la posta di
  arenavolleyteam.it (meglio una casella `noreply@`). Tradurre in italiano i template "Confirm signup" e
  "Reset password".
- [ ] **Recupero password**: il link "Password dimenticata?" invia l'email ma l'app non gestisce il ritorno (manca la
  schermata per impostare la nuova password). Problema preesistente, da sistemare nel codice.
- [ ] **Account Apple Developer** (necessario per pubblicare su iPhone, anche senza "Accedi con Apple"): numero
  D-U-N-S della società, Apple ID della società, iscrizione come Organization (99 $/anno; verificare l'esonero per
  enti non profit).
- [ ] **Account Google Play Console** (25 $ una tantum) per Android; nella scheda "Sicurezza dei dati" indicare
  l'URL https://march3tto.github.io/smapiuArenaVolley/elimina-account/.
- [ ] **Liberatorie foto**:
  - verificare la data reale delle liberatorie della prima squadra (registrata `2025-01-01`) e, per **Sofia Grandi**
    (minorenne fino al 17/08/2026), che sia firmata dai genitori;
  - raccogliere le liberatorie di Serie B2 e Serie D (molte minorenni, firma di entrambi i genitori) e registrarle
    (query in gdpr/README.md, sezione 10);
  - togliere dai bucket pubblici dello Storage le foto delle atlete senza liberatoria.
- [ ] **Album foto**: oggi sono tutti non pubblicati; pubblicarli solo dopo aver verificato le liberatorie
  (`consenso_verificato = true`, `pubblicato = true`).
- [ ] **Consulente privacy**: far validare informativa (`pagine/privacy/index.html`), registro dei trattamenti e pagina di
  eliminazione account.

### Prova completa (registrazione → consensi → cancellazione)

Finché manca l'SMTP le email di conferma arrivano solo ai membri del team Supabase, quindi l'utente di prova si crea
dal pannello:

1. Supabase > Authentication > Users > **Add user** > *Create new user*: email di prova, password, **Auto Confirm User**.
2. Nell'app: Accedi con quell'utente → compare l'onboarding consensi → nome, 14 anni, informativa → Conferma.
3. Impostazioni > Account e privacy: controllare consensi e data; attivare/disattivare il marketing.
4. Elimina account → scrivere ELIMINA → conferma: l'app torna alla home senza utente.
5. In Supabase verificare: utente sparito da Authentication > Users, una riga in `account_eliminati`, nessuna riga
   residua in `profili` e `consensi_utente` per quell'id.

Non provare la cancellazione con l'account admin: è l'unico e la funzione la rifiuta (corretto).

## 2. Accessi social (quando si vorranno attivare)

Regola App Store 4.8: se su iPhone si offre Google o Facebook, va offerto anche **Apple**. L'informativa li descrive
già, quindi attivarli non richiede di cambiarne la versione.

### Apple (richiede l'account Apple Developer)
- [ ] App ID `it.arenavolleyteam.app` con capability **Sign in with Apple**.
- [ ] Chiave **.p8** con Sign in with Apple (Team ID, Key ID): serve per la revoca alla cancellazione dell'account.
- [ ] Supabase > Authentication > Providers > Apple: abilitare, Client IDs = `it.arenavolleyteam.app`.
- [ ] Secrets: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID`, `APPLE_PRIVATE_KEY`, poi ripubblicare
  `elimina-account`.
- [ ] `EXPO_PUBLIC_LOGIN_APPLE=1` in `.env` e negli ambienti EAS.

### Google
- [ ] Google Cloud: progetto, schermata di consenso pubblicata (home e informativa su github.io), client **Web**
  (redirect `https://ruqwpjxpmebiejdndoxd.supabase.co/auth/v1/callback`), client **iOS** e **Android** (SHA-1 della
  build EAS e della firma Google Play). Istruzioni: gdpr/README.md, sezione 6.
- [ ] Supabase > Providers > Google: Client IDs (web, iOS), Client secret del client web, **Skip nonce check** attivo.
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env` e in EAS: il pulsante compare
  da solo.
- [ ] Richiede la **development build** (non funziona in Expo Go).

### Facebook
- [ ] Meta for Developers: app con Facebook Login, URL informativa ed eliminazione dati, redirect OAuth
  `https://ruqwpjxpmebiejdndoxd.supabase.co/auth/v1/callback`, **Data Deletion Callback**
  `https://ruqwpjxpmebiejdndoxd.supabase.co/functions/v1/facebook-eliminazione-dati`, modalità Live.
- [ ] Supabase > Providers > Facebook: App ID e App Secret.
- [ ] Secret `FACEBOOK_APP_SECRET`; pubblicare `facebook-eliminazione-dati` e `stato-eliminazione` con
  `--no-verify-jwt`.
- [ ] `EXPO_PUBLIC_LOGIN_FACEBOOK=1` in `.env` e in EAS.

### Dopo l'attivazione
- [ ] Provare per ogni provider: primo accesso, onboarding consensi, nome nel profilo (Apple lo manda solo la prima
  volta), eliminazione account; per Facebook anche la rimozione dell'app dalle impostazioni di Facebook.

## 3. Privacy e registro dei trattamenti

- [ ] Indicare nel registro il **fornitore della posta** usato per le comunicazioni promozionali (da `info@`).
- [ ] **Data di nascita completa** delle atlete delle squadre regionali (molte minorenni) visibile nella vista pubblica
  e nell'app: valutare con il consulente se mostrare solo l'anno.
- [ ] **Groq** (USA) riceve i nomi delle atlete per le frasi di cronaca: verificare DPA e garanzie per il trasferimento.
- [ ] **Expo**: verificare il DPA per le notifiche push.
- [ ] Decidere una regola per gli **account inattivi** (oggi restano finché l'utente non li elimina, come dichiarato
  nell'informativa) e la pulizia dei **token push** non più usati.
- [ ] Valutare se conservare la **prova dei consensi** per un periodo dopo la cancellazione dell'account (oggi viene
  eliminata con l'account).
- [ ] Archiviare il PDF del **DPA Supabase** (https://supabase.com/legal/dpa) con la data.
- [ ] Quando l'informativa cambia in modo sostanziale: nuova versione in `pagine/privacy/index.html` e in
  `PRIVACY_POLICY_VERSION` (`app.config.ts`), poi nuova build.

## 4. Tecnici

- [ ] **Schema base mancante** nel repository e migration con **versioni duplicate** (`20261013_…`, `20261014_…`,
  `20261015_…`): `supabase db reset` e `supabase test db` non funzionano in locale. Generare la baseline con
  `supabase db pull` e rinominare le migration duplicate (gdpr/README.md, sezione 2).
- [ ] Eseguire i test pgTAP sul database reale (`supabase test db`): oggi sono verificati solo in un Postgres locale
  equivalente.
- [ ] **`.env` tracciato da git**: `git rm --cached .env` prima di aggiungervi altre variabili.
- [ ] Eliminare la bozza superata `src/Claude outputs/profili_auto_creazione_e_blocco_ruolo.sql`.
- [ ] **Schermata di gestione utenti** per staff e admin (assegnare il ruolo "genitore" o "staff"): la RPC
  `imposta_ruolo_utente` è pronta, manca l'interfaccia. Oggi i ruoli si cambiano da SQL.
- [ ] Le **versioni dell'app già installate** leggono la rosa da `giocatrici` e la vedono vuota: distribuire la nuova
  versione (legge `giocatrici_pubbliche`).
- [ ] **Login sul web** (versione browser): solo email, i pulsanti social non sono previsti.
- [ ] Errori ESLint preesistenti (`useRef(...).current` durante il render, componenti creati nel render in
  `settings.tsx`, ecc.): `npx expo lint`.
- [ ] Spostare il progetto Google Cloud (se creato) e gli altri account tecnici su account della società, non personali.
