# Accesso, consensi e GDPR — cosa fare a mano

Questa cartella accompagna le modifiche su registrazione (email, Apple, Google, Facebook), consensi, cancellazione
dell'account e tutela delle foto delle atlete. Qui c'è tutto ciò che **non** si fa con il codice: configurazioni sulle
console, secrets, pubblicazione di pagine, verifiche con il consulente privacy.

Altri documenti:

- [registro-trattamenti.md](registro-trattamenti.md) — bozza del registro dei trattamenti (art. 30 GDPR)
- [eliminazione-account.md](eliminazione-account.md) — testo della pagina pubblica "Elimina account" (Google Play, Meta)

## Ordine consigliato

1. Attivare GitHub Pages per informativa ed eliminazione account (sezione 1) — Meta e gli store le richiedono.
2. Applicare le migration al database (sezione 2) e nominare il primo admin (sezione 3).
3. Configurare Supabase, Apple, Google e Meta (sezioni 4-7).
4. Caricare i secrets e pubblicare le Edge Functions (sezione 8).
5. Creare la development build e provare i quattro accessi e la cancellazione (sezione 9).
6. Raccogliere le liberatorie foto e aggiornare il database (sezione 10).
7. Inserire l'URL della pagina di eliminazione account negli store (sezione 11).
8. Far validare informativa e registro da un consulente privacy (sezione 12).

---

## 1. Informativa privacy e pagina "Elimina account"

Pubblicate con **GitHub Pages** dalla cartella `pagine/` (workflow `.github/workflows/pagine.yml`, a ogni push su
`main` che modifica `pagine/`):

- informativa: **https://march3tto.github.io/smapiuArenaVolley/privacy/** (`PRIVACY_POLICY_URL` in `app.config.ts`);
- eliminazione account: **https://march3tto.github.io/smapiuArenaVolley/elimina-account/**.

Attivazione, una volta sola: GitHub > repository > **Settings > Pages > Build and deployment > Source: "GitHub
Actions"**. Poi unire il branch in `main` (o lanciare il workflow "Pagine pubbliche" da Actions su `main`).

L'informativa cita: titolare, età minima 14 anni, dati raccolti con email e con Apple/Google/Facebook (titolari
autonomi), finalità e basi giuridiche, marketing via email da info@ senza cessione agli sponsor, push (Expo), fornitori
(Supabase UE, Expo, Groq per la cronaca, YouTube/Spotify), trasferimenti extra-UE, conservazione, diritti.

**Ogni volta che il testo cambia in modo sostanziale**: aggiornare la versione in cima alla pagina e
`PRIVACY_POLICY_VERSION` in `app.config.ts` (es. `2027-03-v2`), poi pubblicare una nuova build: al login successivo
l'app richiede di nuovo i consensi.

## 2. Database

Migration nuove (da applicare in ordine, **non** sono state applicate al progetto remoto):

| File | Contenuto |
|---|---|
| `supabase/migrations/20261016000100_profili_e_ruoli.sql` | trigger di creazione profilo, blocco escalation del ruolo, RPC `imposta_ruolo_utente`, `e_staff()`/`e_admin()` con `search_path` fisso, alias `is_staff()`/`is_admin()` |
| `supabase/migrations/20261016000200_consensi_e_foto.sql` | `consensi_utente` (append-only) e vista `consensi_utente_attuali`; consenso foto su `giocatrici` e vista `giocatrici_pubbliche`; `pubblicato`/`consenso_verificato` su `album_foto` |
| `supabase/migrations/20261016000300_account_eliminati.sql` | registro anonimo `account_eliminati`, RPC `utente_da_identita` (solo service role) |

Test: `supabase/tests/database/ruoli_consensi_foto.test.sql` (pgTAP, 37 verifiche).

> **Attenzione all'ordine con l'app.** Dopo la migration 200 la tabella `giocatrici` non è più leggibile dal pubblico
> e l'app legge la rosa da `giocatrici_pubbliche`. Applicare le migration **prima** di distribuire la nuova versione
> dell'app; la versione già installata (che legge `giocatrici`) mostrerà la rosa vuota finché non viene aggiornata.

Effetti visibili subito dopo l'applicazione:

- **Tutte le foto e le bio delle giocatrici spariscono** dall'app (segnaposto con il numero di maglia) finché non si
  registra la liberatoria (sezione 10). Vale anche per le foto incluse nell'app (`assets/players`).
- **Tutti gli album foto diventano non pubblicati** (`pubblicato = false`).
- I profili mancanti degli utenti già registrati vengono creati con ruolo `pubblico`; i ruoli esistenti non cambiano.

Come applicarle (scegliere uno):

- SQL Editor di Supabase: incollare ed eseguire i tre file nell'ordine.
- CLI: `supabase db push` (vedi la nota sullo schema base qui sotto).

### Nota: `supabase db reset` e schema base

Nel repository manca la migration con lo schema iniziale (tabelle `profili`, `giocatrici`, `partite`…): le migration
presenti partono da modifiche a tabelle già esistenti. Inoltre alcune hanno la stessa versione (`20261009_…`,
`20261013_…`, `20261014_…`, `20261015_…` compaiono più volte) e la CLI le rifiuta. Per poter usare
`supabase db reset` / `supabase test db` in locale:

1. `supabase link --project-ref ruqwpjxpmebiejdndoxd` e `supabase db pull` per generare la migration di base;
2. rinominare le migration con versione duplicata dando a ciascuna un timestamp univoco (es. `20261013000100_…`),
   e segnarle come già applicate sul remoto con `supabase migration repair --status applied <versione>`;
3. `supabase start`, `supabase db reset`, `supabase test db`.

Le tre migration nuove sono state verificate in un Postgres 17 locale (PGlite) con uno schema minimo identico a quello
remoto per le tabelle coinvolte (`profili`, `giocatrici`, `squadre`, `album_foto`, `foto`, `auth.users`,
`auth.identities`, policy e privilegi attuali): si applicano senza errori e i 37 test passano.

### Nomi usati (corrispondenza con la richiesta originale)

Il database è in italiano: i nomi seguono quelli esistenti.

| Richiesta | Nel progetto |
|---|---|
| `profiles`, `role`, `full_name`, `youth_category_id` | `profili`, `ruolo`, `nome_completo`, `categoria_giovanile_id` |
| ruoli `public` / `parent` / `staff` / `admin` | `pubblico` / `genitore` / `staff` / `admin` (enum `ruolo_utente`) |
| `is_staff()`, `is_admin()` | `e_staff()`, `e_admin()` (più alias `is_staff()`, `is_admin()`) |
| `handle_new_user()` | `crea_profilo_nuovo_utente()` (trigger `trg_crea_profilo`) |
| trigger di protezione del ruolo | `proteggi_ruolo_profilo()` (trigger `trg_proteggi_ruolo`) |
| `set_user_role(target_user, new_role)` | `imposta_ruolo_utente(p_utente, p_ruolo)` |
| `consent_type`: `privacy_policy`, `age_14_declaration`, `marketing` | `tipo_consenso`: `informativa_privacy`, `eta_14_anni`, `marketing` |
| `user_consents` (`user_id`, `consent_type`, `granted`, `policy_version`, `source`, `auth_provider`, `created_at`) | `consensi_utente` (`utente_id`, `tipo`, `concesso`, `versione_informativa`, `origine`, `provider_accesso`, `creato_il`) |
| `user_consents_current` | `consensi_utente_attuali` |
| `players.photo_consent`, `photo_consent_date`, `photo_consent_notes` | `giocatrici.consenso_foto`, `consenso_foto_data`, `consenso_foto_note` |
| `players_public` | `giocatrici_pubbliche` |
| `photo_albums.is_published`, `consent_verified` | `album_foto.pubblicato`, `consenso_verificato` |
| `account_deletions` (`deleted_user_id`, `providers`, `source`, `confirmation_code`, `deleted_at`) | `account_eliminati` (`utente_eliminato_id`, `provider`, `origine`, `codice_conferma`, `eliminato_il`) |
| Edge Function `delete-account` | `elimina-account` |
| Edge Function `facebook-data-deletion` | `facebook-eliminazione-dati` |
| Edge Function `deletion-status` | `stato-eliminazione` |

### Scelta sulla vista `giocatrici_pubbliche`

La vista è **security definer** (`security_invoker = false`, proprietario `postgres`): deve leggere `giocatrici`
anche per gli utenti anonimi, mentre la policy della tabella ora consente la lettura solo allo staff. La vista espone
solo le colonne necessarie all'app, restituisce `foto_url` e `bio` solo se `consenso_foto = true`, non espone le note
sul consenso, non è aggiornabile (join con `squadre`) ed è concessa solo in `select`. Il linter di Supabase
(Advisors) la segnalerà come "Security Definer View": è voluto.

## 3. Ruoli e primo admin

- Chi si registra (email, Apple, Google, Facebook) nasce sempre **`pubblico`**. Il ruolo non si legge mai dai metadata
  inviati dal client.
- Dall'app i ruoli si cambiano solo con la RPC `imposta_ruolo_utente`:
  - **staff**: solo `pubblico` ↔ `genitore`, su altri utenti;
  - **admin**: `pubblico`, `genitore`, `staff`, su altri utenti non admin;
  - **`admin` non si assegna mai dall'app**; nessuno può cambiare il proprio ruolo; l'ultimo admin non può essere
    declassato né eliminato (vale anche dal pannello Supabase).

**Nominare un admin** (SQL Editor di Supabase, dopo che la persona si è registrata nell'app):

```sql
update public.profili
set ruolo = 'admin'
where id = (select id from auth.users where email = 'nome.cognome@esempio.it');
```

Togliere il ruolo admin (ne deve restare almeno un altro):

```sql
update public.profili set ruolo = 'staff'
where id = (select id from auth.users where email = 'nome.cognome@esempio.it');
```

## 4. Supabase (pannello)

- **DPA**: Organization settings > Legal documents: firmare/accettare il Data Processing Addendum.
- **Region**: il progetto è in `eu-west-1` (Irlanda). Riportarla nel registro dei trattamenti.
- **Authentication > Providers**:
  - **Apple**: abilitare; in "Client IDs" inserire il bundle ID `it.arenavolleyteam.app` (login nativo iOS). Il
    "Secret Key (for OAuth)" serve solo per il login web, che l'app non usa.
  - **Google**: abilitare; "Client IDs" = client ID **web** e client ID **iOS** separati da virgola (il web per
    primo); Client Secret del client web; attivare **"Skip nonce check"** (richiesto per il login nativo su iOS).
  - **Facebook**: abilitare con App ID e App Secret di Meta.
- **Authentication > URL Configuration > Redirect URLs**: aggiungere `arenavolley://auth/callback`
  (e, solo in sviluppo, `exp://**`).
- **Authentication > Sign In / Providers > Email**: decidere se tenere "Confirm email". Con la conferma attiva l'app
  avvisa l'utente e registra i consensi al primo accesso; il link di conferma apre il sito configurato come Site URL.
- **Collegamento degli account**: Supabase collega automaticamente allo stesso utente le identità con **la stessa email
  verificata** (es. chi si registra con email e poi entra con Google con lo stesso indirizzo). Con Apple "Nascondi la
  mia email" l'indirizzo è `@privaterelay.appleid.com`: viene trattato come un'email valida ma non coincide con altre,
  quindi nasce un account separato. Nessun collegamento manuale per ora.

## 5. Apple Developer

1. **Identifiers > App IDs** `it.arenavolleyteam.app`: abilitare la capability **Sign in with Apple** (la build EAS la
   aggiunge all'entitlement tramite il plugin `expo-apple-authentication`).
2. **Keys**: creare una chiave con **Sign in with Apple** abilitato, scaricare il file `.p8` (si scarica una volta
   sola) e annotare Key ID e Team ID. Serve alla function `elimina-account` per **revocare** l'accesso quando l'utente
   elimina l'account (obbligatorio per l'App Store). **Non** mettere il file `.p8` nel repository (`*.p8` è già in
   `.gitignore`).
3. Services ID: non necessario finché il login Apple è solo nativo su iOS. Serve se in futuro si vuole Apple su
   Android/web (flusso OAuth web).
4. App Store Connect > Privacy: dichiarare i dati raccolti (email, nome, identificativo utente) e l'URL
   dell'informativa.

## 6. Google Cloud

1. **Schermata di consenso OAuth**: tipo esterno, nome app, logo, email di supporto, link a informativa e termini,
   scope `openid`, `email`, `profile`. Pubblicarla (non lasciarla in "Testing").
2. **Credenziali > ID client OAuth**:
   - **Web**: è quello inserito in Supabase e in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`;
   - **iOS**: bundle ID `it.arenavolleyteam.app` → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (da cui `app.config.ts` ricava lo
     schema URL per il plugin);
   - **Android**: package `it.arenavolleyteam.app` + **SHA-1** del certificato. Servono due client Android (o due
     impronte): quella della build di sviluppo/EAS (`eas credentials` > Android > SHA-1) e quella della firma di
     Google Play (Play Console > Integrità app > Firma dell'app).

## 7. Meta for Developers

1. Creare l'app (tipo "Consumer"), aggiungere il prodotto **Facebook Login**.
2. **Impostazioni > Di base**: URL dell'informativa privacy, URL della pagina di eliminazione dati (sezione 11), icona,
   categoria.
3. **Facebook Login > Impostazioni**: "URI di reindirizzamento OAuth validi" =
   `https://ruqwpjxpmebiejdndoxd.supabase.co/auth/v1/callback`.
4. **Callback di eliminazione dei dati**:
   `https://ruqwpjxpmebiejdndoxd.supabase.co/functions/v1/facebook-eliminazione-dati`.
5. Permessi richiesti: solo `email` e `public_profile` (nessuna revisione dell'app necessaria per questi).
6. Passare l'app in modalità **Live** (richiede informativa pubblicata e verifica aziendale se richiesta).

## 8. Secrets ed Edge Functions

I segreti stanno **solo** nei secrets delle Edge Functions, mai nell'app né nel repository:

```bash
supabase secrets set \
  APPLE_TEAM_ID=XXXXXXXXXX \
  APPLE_KEY_ID=XXXXXXXXXX \
  APPLE_CLIENT_ID=it.arenavolleyteam.app \
  APPLE_PRIVATE_KEY="$(cat AuthKey_XXXXXXXXXX.p8)" \
  FACEBOOK_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

supabase functions deploy elimina-account
supabase functions deploy facebook-eliminazione-dati --no-verify-jwt
supabase functions deploy stato-eliminazione --no-verify-jwt
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` sono già disponibili nelle function.

Nota su `stato-eliminazione`: sul dominio `*.supabase.co` le Edge Functions non possono servire pagine HTML (le
risposte `text/html` diventano `text/plain`), quindi la function risponde con un testo semplice leggibile; con
`?formato=json` risponde in JSON. Volendo una pagina grafica, si può creare
`https://march3tto.github.io/smapiuArenaVolley/elimina-account/stato/?code=…` che legge il JSON.

## 9. Development build (necessaria per Apple e Google)

I login nativi Apple e Google usano moduli nativi: **non funzionano in Expo Go**. In Expo Go l'app resta utilizzabile
con email (e Facebook), mentre il pulsante Google mostra un messaggio.

Variabili (in `.env` per lo sviluppo e nelle variabili d'ambiente di EAS per le build, vedi `.env.example`):

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
```

```bash
eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value ... --visibility plaintext --environment development --environment preview --environment production
eas env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value ... --visibility plaintext --environment development --environment preview --environment production
eas build --profile development --platform ios       # oppure: npx expo run:ios
eas build --profile development --platform android   # oppure: npx expo run:android
npx expo start --dev-client
```

Prove da fare prima della pubblicazione: registrazione email (con e senza conferma), accesso con Apple (primo accesso:
il nome deve comparire nel profilo), Google, Facebook; onboarding consensi per ogni provider; consenso marketing
attivato/revocato (nuova riga ogni volta in `consensi_utente`); eliminazione account per ciascun provider; rimozione
dell'app da Facebook (Impostazioni > App e siti web) con verifica del codice su `stato-eliminazione`.

## 10. Liberatorie foto e album

Per ogni atleta (per le minorenni la firmano entrambi i genitori o chi esercita la responsabilità genitoriale):

```sql
update public.giocatrici
set consenso_foto = true,
    consenso_foto_data = '2026-10-20',
    consenso_foto_note = 'Liberatoria cartacea firmata da entrambi i genitori, archivio segreteria n. 12'
where id = '<id giocatrice>';
```

`consenso_foto_data` è obbligatoria quando `consenso_foto = true`. Revoca: `consenso_foto = false` (la foto sparisce
subito dall'app); rimuovere anche il file dal bucket se non serve più.

Album: si possono pubblicare solo dopo aver verificato le liberatorie di tutte le persone ritratte:

```sql
update public.album_foto set consenso_verificato = true, pubblicato = true where id = '<id album>';
```

Attenzione: i bucket dello Storage (`players`, `giovanili`, `news`…) sono **pubblici**: chi conosce l'URL di un file
lo può aprire anche se l'app non lo mostra. Le foto senza liberatoria vanno tolte dal bucket (o spostate in un bucket
privato).

## 11. Pagina di eliminazione account

Già pubblicata con l'informativa (sezione 1). Inserire **https://march3tto.github.io/smapiuArenaVolley/elimina-account/** in:

- Google Play Console > Contenuti dell'app > Sicurezza dei dati > "URL per eliminare l'account";
- Meta for Developers > Impostazioni di base > "URL istruzioni per l'eliminazione dei dati" (in alternativa al
  callback, che resta comunque configurato).

## 12. Da far verificare al consulente privacy

- Informativa, registro dei trattamenti e testo della pagina di eliminazione.
- Basi giuridiche (in particolare: legittimo interesse per la cronaca live con i nomi delle atlete; consenso per foto
  e bio; età minima 14 anni con autodichiarazione).
- Tempi di conservazione indicati come `[DA DEFINIRE]` nel registro (account inattivi, registro delle cancellazioni,
  prova dei consensi dopo la cancellazione dell'account: oggi lo storico dei consensi viene eliminato con l'account).
- Pubblicazione della **data di nascita completa** delle atlete delle squadre regionali (molte minorenni) nella vista
  pubblica: valutare se mostrare solo l'anno.
- Invio dei nomi delle atlete a Groq (USA) per le frasi di cronaca automatiche: DPA e garanzie per il trasferimento.

## Cose rimaste aperte

- `.env` è tracciato da git (contiene URL e anon key di Supabase, che sono pubbliche): valutare
  `git rm --cached .env` come già indicato in `MIGRAZIONE.md`, prima di aggiungervi altre variabili.
- `src/Claude outputs/profili_auto_creazione_e_blocco_ruolo.sql` è una bozza mai applicata, superata dalla migration
  `20261016000100_profili_e_ruoli.sql`: si può eliminare.
- Non esiste ancora una schermata di gestione utenti per staff/admin: la RPC `imposta_ruolo_utente` è pronta, oggi i
  ruoli si cambiano da SQL o chiamando la RPC.
- Il registro `account_eliminati` si svuota da solo dopo 3 anni (job `pg_cron` nella migration 300). Nessuna regola
  per gli account inattivi: restano finché l'utente non li elimina, come dichiarato nell'informativa.
- Login sul web (versione browser dell'app): solo email; i pulsanti social non compaiono.
