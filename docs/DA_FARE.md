# Da fare

Punti rimasti aperti dopo il lavoro su accesso, consensi, cancellazione account e GDPR (ottobre 2026).
Il dettaglio delle configurazioni è in [gdpr/README.md](gdpr/README.md).

**Situazione attuale**: l'app offre solo l'accesso con **email e password**. Database aggiornato (migration
`20261016000100`-`300` applicate il 16/10/2026), liberatorie foto registrate per la prima squadra, Supabase configurato
(Site URL, redirect, conferma email, password minima 8). Il codice per Apple, Google e Facebook è pronto ma spento.

---

## 1. Prima di pubblicare sugli store (bloccanti)

- [x] **Pagine pubbliche online** (GitHub Pages da GitHub Actions, workflow `pagine.yml`): verificate il 09/11/2026 e
  di nuovo il 18/11/2026 (risposta 200) https://march3tto.github.io/smapiuArenaVolley/ (pagina di supporto con
  Assistenza), `/privacy/` e `/elimina-account/`.
- [x] **Edge Function `elimina-account` pubblicata** (16/10/2026, versione 1, verifica JWT attiva; rifiuta chiamate senza
  utente). Al 18/11/2026 il codice locale (`elimina-account`, `_shared/eliminazione-account.ts`, `_shared/apple.ts`) è
  identico a quello pubblicato. Se si modifica il codice: `supabase functions deploy elimina-account`.
- [ ] **Provare la cancellazione dall'app su build di produzione** con un utente di prova (vedi sotto, "Prova
  completa"), anche con un utente **Apple**: la revoca richiede i 4 secret `APPLE_*` (sezione 2). Se mancano, l'account
  viene eliminato comunque ma la revoca fallisce in silenzio (`appleRevocato: false`, nei log della funzione "revoca
  Apple non riuscita"). Dopo la prova verificare che l'app non compaia più in Impostazioni iPhone > ID Apple > Accedi
  con Apple.
- [ ] **Etichette App Privacy** (App Store Connect), coerenti con l'informativa. Dal codice (18/11/2026): nessun SDK di
  analytics, crash reporting o tracking; le pubblicità (`AdPopup`) sono sponsor interni letti dal database, senza rete
  pubblicitaria. Proposta:
  - **Tracking: No** (niente ATT);
  - collegati all'identità, finalità *Funzionalità dell'app*: email, nome (Informazioni di contatto), ID utente
    (Identificativi), età/data di nascita e consensi (Altri dati), messaggi all'assistente AI (Contenuti utente);
  - token push: *ID dispositivo* o *Altri dati*, come descritto nell'informativa;
  - dati di utilizzo e diagnostica: dichiararli solo se raccolti davvero (nessun SDK li raccoglie); in caso contrario
    allineare l'informativa;
  - nessun dato usato per "Pubblicità di terze parti".
- [x] **SMTP personalizzato** in Supabase (Authentication > Emails > SMTP Settings), segnato come fatto il 20/11/2026.
  Nei log auth del 19/11/2026 la richiesta di recupero password (`/recover`) è andata a buon fine e il link è stato usato
  (`/verify`). Se non è già stato fatto, provare una registrazione con un'email **esterna al team Supabase** (serve
  anche al revisore Apple) e controllare che i template "Confirm signup" e "Reset password" siano in italiano.
- [x] **Recupero password** (verificato il 20/11/2026): "Password dimenticata?" chiama `/auth/v1/recover` con ritorno
  alla pagina web https://march3tto.github.io/smapiuArenaVolley/reset-password/, dove si sceglie la nuova password da
  qualsiasi dispositivo, oppure si apre l'app (`arenavolley://reset-password`, schermata `app/reset-password.tsx`).
  Commit `6ffc145`, `c0ea963`.
- [x] **Account Apple Developer** (necessario per pubblicare su iPhone, anche senza "Accedi con Apple"): al 19/11/2026
  numero D-U-N-S recuperato, iscrizione Apple completata, app creata in App Store Connect
  (`it.arenavolleyteam.app`).
- [ ] **Account Google Play Console** (25 $ una tantum) per Android; nella scheda "Sicurezza dei dati" indicare
  l'URL https://march3tto.github.io/smapiuArenaVolley/elimina-account/.
- [x] **Liberatorie foto**:
  - verificare la data reale delle liberatorie della prima squadra (registrata `2025-01-01`) e, per **Sofia Grandi**
    (minorenne fino al 17/08/2026), che sia firmata dai genitori;
  - raccogliere le liberatorie di Serie B2 e Serie D (molte minorenni, firma di entrambi i genitori) e registrarle
    (query in gdpr/README.md, sezione 10);
  - togliere dai bucket pubblici dello Storage le foto delle atlete senza liberatoria.
- [x] **Album foto**: oggi sono tutti non pubblicati; pubblicarli solo dopo aver verificato le liberatorie
  (`consenso_verificato = true`, `pubblicato = true`).
- [ ] **Consulente privacy**: far validare informativa (`pagine/privacy/index.html`), registro dei trattamenti e pagina di
  eliminazione account. Nel registro restano i `[DA VERIFICARE]` / `[DA ARCHIVIARE]` su Groq (DPA firmato, SCC/DPF).

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
- [x] App ID `it.arenavolleyteam.app` con capability **Sign in with Apple**.
- [x] Chiave **.p8** con Sign in with Apple (Team ID, Key ID): serve per la revoca alla cancellazione dell'account.
- [x] Supabase > Authentication > Providers > Apple: abilitare, Client IDs = `it.arenavolleyteam.app`.
- [x] Secrets: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID`, `APPLE_PRIVATE_KEY`, poi ripubblicare
  `elimina-account`.
- [x] `EXPO_PUBLIC_LOGIN_APPLE=1` in `.env` e negli ambienti EAS.

### Google
- [ ] Google Cloud: progetto, schermata di consenso pubblicata (home e informativa su github.io), client **Web**
  (redirect `https://ruqwpjxpmebiejdndoxd.supabase.co/auth/v1/callback`), client **iOS** e **Android** (SHA-1 della
  build EAS e della firma Google Play). Istruzioni: gdpr/README.md, sezione 6.
- [x] Supabase > Providers > Google: Client IDs (web, iOS), Client secret del client web, **Skip nonce check** attivo.
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env` e in EAS: il pulsante compare
  da solo.
- [ ] Richiede la **development build** (non funziona in Expo Go).

### Facebook
- [ ] Meta for Developers: app con Facebook Login, URL informativa ed eliminazione dati, redirect OAuth
  `https://ruqwpjxpmebiejdndoxd.supabase.co/auth/v1/callback`, **Data Deletion Callback**
  `https://ruqwpjxpmebiejdndoxd.supabase.co/functions/v1/facebook-eliminazione-dati`, modalità Live.
- [ ] Supabase > Providers > Facebook: App ID e App Secret.
- [ ] Secret `FACEBOOK_APP_SECRET`; pubblicare `facebook-eliminazione-dati` e `stato-eliminazione` con
  `--no-verify-jwt` (al 18/11/2026 non risultano pubblicate).
- [ ] `EXPO_PUBLIC_LOGIN_FACEBOOK=1` in `.env` e in EAS.

### Dopo l'attivazione
- [ ] Provare per ogni provider: primo accesso, onboarding consensi, nome nel profilo (Apple lo manda solo la prima
  volta), eliminazione account; per Facebook anche la rimozione dell'app dalle impostazioni di Facebook.

## 3. Privacy e registro dei trattamenti

- [ ] **Atto di nomina e incarico** (bozza del 19/11/2026: incarico di sviluppo, delega per gli account dei servizi,
  nomina a responsabile del trattamento ex art. 28 GDPR). Prima della firma:
  - completare i campi tra parentesi quadre (sede, dati del Presidente e del Responsabile, costi, proprietà del codice,
    compenso);
  - allinearlo al codice: Groq riceve anche le **domande degli utenti all'assistente** (senza nome né email), non solo
    dati sportivi (B.2 punto 4, Allegato 1, Allegato 2 "Minimizzazione"); alla cancellazione viene revocato solo
    l'accesso **Apple** (la revoca Google non è implementata), Allegato 2 "Cancellazione";
  - aggiungere la **ratifica** delle operazioni già compiute a nome dell'associazione (D-U-N-S, iscrizione Apple,
    creazione dell'app in App Store Connect);
  - Aruba compare tra i sub-responsabili: va bene solo se l'SMTP verrà attivato con Aruba (sezione 1);
  - firma del Presidente, copia firmata archiviata dall'associazione e indicata nel registro dei trattamenti; farlo
    vedere al consulente privacy insieme all'informativa.

- [ ] Indicare nel registro il **fornitore della posta** usato per le comunicazioni promozionali (da `info@`).
- [x] **Data di nascita completa** delle atlete (molte minorenni) non più pubblica (20/11/2026): resta solo in tabella,
  leggibile dalla dashboard Supabase (privilegi per colonna, migrazione `20261120000100_giocatrici_tabella_unica`).
  L'app non la legge: nella scheda Giovanili e nella scheda giocatrice compare solo "Classe AAAA" (`anno_nascita`).
- [ ] **Groq** (USA) riceve i nomi delle atlete per le frasi di cronaca: verificare DPA e garanzie per il trasferimento.
- [ ] **Assistente AI** (Edge Function `assistente`): Groq riceve anche le domande degli utenti. Informativa aggiornata
  (punti 6, 7, 8, versione `2026-10-v2`): aggiungere il trattamento al registro.
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
- [x] **`.env` tracciato da git**: rimosso con `git rm --cached .env` e aggiunto a `.gitignore`.
- [ ] Eliminare la bozza superata `src/Claude outputs/profili_auto_creazione_e_blocco_ruolo.sql`.
- [ ] **Tabella unica `giocatrici`** (migration `20261120000100_giocatrici_tabella_unica`): leggibile da tutti, senza
  la vista `giocatrici_pubbliche`; data di nascita e dati della liberatoria nascosti per colonna, foto e bio solo con
  liberatoria (vincolo). Applicare la migration, rigenerare `src/lib/database.types.ts`, ridistribuire l'Edge Function
  `assistente` e pubblicare la nuova versione: le app già installate (che usano `select('*')`) non leggono più la rosa.
- [ ] **Login sul web** (versione browser): solo email, i pulsanti social non sono previsti.
- [x] Errori ESLint preesistenti: `npx expo lint` e `npm run typecheck` puliti (8 novembre 2026).
- [ ] Spostare il progetto Google Cloud (se creato) e gli altri account tecnici su account della società, non personali.
