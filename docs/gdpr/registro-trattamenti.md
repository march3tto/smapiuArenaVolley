# Registro delle attività di trattamento (art. 30 GDPR) — BOZZA

> Bozza preparata a partire dall'app e dal database. Va completata nelle parti `[DA COMPLETARE]` / `[DA DEFINIRE]` e
> **validata da un consulente privacy** prima dell'uso. Ultimo aggiornamento: ottobre 2026.

## Titolare del trattamento

| | |
|---|---|
| Ragione sociale | A.S.D. Arena Volley Team |
| Sede legale | Via Mascagni 21, 37060 Castel d'Azzano (VR) |
| Codice fiscale | 02805550239 |
| Legale rappresentante | [DA COMPLETARE] |
| Referente privacy | [DA COMPLETARE] |
| Email privacy | segreteria@arenavolleyteam.it |
| DPO | Non nominato [DA VERIFICARE: non obbligatorio salvo trattamento su larga scala di dati di minori] |

## Fornitori e destinatari comuni

| Soggetto | Ruolo | Servizio | Luogo / trasferimenti | Garanzie |
|---|---|---|---|---|
| Supabase Inc. | Responsabile (art. 28) | Database, autenticazione, Storage, Edge Functions, Realtime | Progetto in **eu-west-1 (Irlanda)**, infrastruttura AWS; accessi di supporto e sub-responsabili anche USA | DPA Supabase (parte dei Termini di servizio, copia PDF archiviata), SCC incluse nel DPA |
| 650 Industries Inc. (Expo) | Responsabile | Invio notifiche push (Expo Push Service), build dell'app (EAS) | USA | DPA Expo [DA VERIFICARE], SCC / DPF |
| Apple Inc. / Google LLC | Destinatari tecnici per le push | Recapito delle notifiche (APNs, Firebase Cloud Messaging) tramite Expo | USA / UE | Condizioni delle piattaforme |
| Groq Inc. | Responsabile | Generazione delle frasi di cronaca live (Edge Function `cronaca-ai`) | USA | DPA [DA VERIFICARE], SCC |
| Google LLC (YouTube) | Titolare autonomo | Video e dirette su YouTube; miniature caricate da `img.youtube.com` | USA / UE | Condizioni YouTube; l'app apre YouTube all'esterno |
| Spotify AB | Titolare autonomo | Eventuali podcast aperti tramite link esterno | UE / USA | L'app non trasmette dati dell'utente |
| GitHub Inc. (GitHub Pages) | Fornitore di hosting | Informativa e pagina di eliminazione account (pagine statiche, nessun dato degli utenti raccolto) | USA | Condizioni GitHub, DPF |
| Apple, Google, Meta | **Titolari autonomi** per l'autenticazione | "Accedi con Apple / Google / Facebook" | USA / Irlanda | Trattano i dati di login secondo le proprie informative; all'app comunicano solo identificativo, email e nome |

## Misure di sicurezza comuni (art. 32)

- **Controllo degli accessi nel database**: Row Level Security su tutte le tabelle; scrittura dei contenuti solo per
  staff/admin (`e_staff()`); dati personali degli utenti leggibili solo dal diretto interessato (e dallo staff).
- **Separazione dei ruoli**: ogni nuovo utente nasce "pubblico"; i ruoli superiori si assegnano solo con una funzione
  controllata (staff → genitore; admin → staff); il ruolo admin solo dal pannello di amministrazione; nessuno può
  modificare il proprio ruolo; protezione dell'ultimo admin. Verificato da test automatici.
- **Chiavi**: la chiave service role e i segreti (chiave Apple `.p8`, app secret Facebook, chiave Groq) sono solo nei
  secrets delle Edge Functions, mai nell'app o nel repository; l'app usa solo la chiave pubblica "anon".
- **Minimizzazione**: dai login social si ricevono solo identificativo, email e nome; foto e bio delle atlete sono
  esposte solo con liberatoria registrata; la tabella completa delle atlete non è leggibile dal pubblico.
- **Registri append-only**: i consensi non si modificano né si cancellano dall'app (ogni scelta è una nuova riga).
- **Cifratura in transito** (HTTPS/TLS) per app, API e Edge Functions; cifratura a riposo dell'infrastruttura
  Supabase/AWS; password gestite da Supabase Auth (hash bcrypt).
- **Backup** automatici giornalieri di Supabase secondo il piano [DA COMPLETARE: piano e conservazione, es. 7 giorni].
- **Cancellazione**: funzione di eliminazione account per tutti i metodi di accesso, con revoca di Sign in with Apple e
  callback di eliminazione di Meta; registro anonimo delle cancellazioni.
- [DA COMPLETARE] misure organizzative: chi ha accesso al pannello Supabase, autenticazione a due fattori sugli
  account amministrativi (Supabase, Apple, Google, Meta, Expo), procedura in caso di violazione (data breach).

---

## 1. Account utenti dell'app (email e login social)

| | |
|---|---|
| **Finalità** | Creazione e gestione dell'account; autenticazione; funzioni riservate agli utenti registrati (scelta della categoria giovanile per i genitori, gestione della diretta per lo staff); sicurezza del servizio |
| **Base giuridica** | Art. 6.1.b (esecuzione del servizio richiesto dall'utente); art. 6.1.f (sicurezza, prevenzione abusi) |
| **Interessati** | Utenti dell'app con almeno 14 anni (tifosi, genitori, staff e dirigenti) |
| **Categorie di dati** | Email; password (solo hash, gestita da Supabase Auth); nome e cognome; per i login social: identificativo del provider (Apple, Google, Facebook), email fornita dal provider (anche indirizzi anonimi `@privaterelay.appleid.com`), nome. **Nessun altro dato del profilo social** (niente foto, amici, data di nascita, pagine). Tipo di profilo (pubblico, genitore, staff, admin); categoria giovanile di interesse; date di creazione e ultimo accesso; indirizzo IP e user agent nei log di autenticazione |
| **Dati particolari / giudiziari** | No |
| **Destinatari** | Supabase (responsabile); staff e admin della società (solo lettura dei profili); Apple, Google, Meta come titolari autonomi per l'autenticazione |
| **Trasferimenti extra-UE** | Dati nel progetto Supabase in Irlanda; possibili accessi da sub-responsabili USA (SCC/DPF nel DPA). Apple, Google, Meta: titolari autonomi |
| **Conservazione** | Fino all'eliminazione dell'account da parte dell'utente (immediata, dall'app o tramite Facebook) o su richiesta via email (entro 30 giorni). Account inattivi: [DA DEFINIRE, es. eliminazione dopo 24 mesi senza accessi]. Log di autenticazione: secondo il piano Supabase [DA COMPLETARE]. Backup: fino a 7 giorni |
| **Registro cancellazioni** | Dopo l'eliminazione resta solo una riga anonima (`account_eliminati`: id interno non più collegabile, provider, origine, codice di conferma, data), conservata **3 anni** (pulizia automatica notturna, job `pulizia-account-eliminati`) per dimostrare l'esecuzione della richiesta |
| **Misure specifiche** | Ruolo sempre "pubblico" alla registrazione; profili non modificabili dal client salvo nome e categoria; revoca di Sign in with Apple e dell'accesso Google alla cancellazione |

## 2. Consensi e comunicazioni promozionali

| | |
|---|---|
| **Finalità** | a) Registrare e dimostrare la presa visione dell'informativa, la dichiarazione di età (almeno 14 anni) e le scelte sul marketing (art. 7.1 GDPR); b) inviare comunicazioni promozionali della società e dei suoi sponsor a chi ha acconsentito |
| **Base giuridica** | a) Art. 6.1.c / 6.1.f (obbligo di dimostrare il consenso, accountability); b) art. 6.1.a (consenso facoltativo, non preselezionato, revocabile in ogni momento da Impostazioni > Account e privacy) |
| **Interessati** | Utenti registrati |
| **Categorie di dati** | Tipo di consenso, esito (concesso/negato/revocato), versione dell'informativa, data e ora, metodo di accesso usato, origine (app o segreteria) |
| **Destinatari** | Supabase (responsabile); staff della società (lettura). I dati **non vengono ceduti agli sponsor**: le comunicazioni per conto degli sponsor sono inviate dalla società; fornitore del servizio email della società (responsabile) [DA COMPLETARE: quale] |
| **Canali delle comunicazioni** | Email, inviate da info@arenavolleyteam.it |
| **Trasferimenti extra-UE** | Come scheda 1 |
| **Conservazione** | Storico completo finché esiste l'account; eliminato con l'account. Marketing: fino alla revoca. [DA VALUTARE con il consulente: conservare la prova del consenso per un periodo dopo la cancellazione] |
| **Misure specifiche** | Registro append-only (ogni scelta è una nuova riga, nessuna modifica o cancellazione dall'app); ogni utente vede solo i propri consensi; nuova richiesta di consenso a ogni nuova versione dell'informativa |

## 3. Notifiche push

| | |
|---|---|
| **Finalità** | Avvisi su partite (promemoria, inizio, fine set, risultato), notizie, video e podcast; avvisi per categoria giovanile scelta dai genitori |
| **Base giuridica** | Art. 6.1.b (servizio richiesto dall'utente); permesso del sistema operativo e interruttori nelle impostazioni dell'app; art. 122 Codice privacy (accesso al dispositivo strettamente necessario al servizio richiesto) |
| **Interessati** | Utenti dell'app, anche senza account |
| **Categorie di dati** | Token push Expo del dispositivo, piattaforma (iOS/Android), id utente se collegato, categoria giovanile seguita, date di registrazione e aggiornamento; registro degli invii (tipo, contenuto di riferimento, numero di destinatari, senza dati degli utenti) |
| **Destinatari** | Supabase (responsabile); Expo (responsabile) che inoltra ad Apple Push Notification service e Firebase Cloud Messaging |
| **Trasferimenti extra-UE** | USA (Expo, Apple, Google): SCC / DPF [DA VERIFICARE] |
| **Conservazione** | Finché il token è attivo; collegamento all'account eliminato con l'account. [DA DEFINIRE: pulizia dei token non aggiornati da oltre N mesi] |
| **Misure specifiche** | Token leggibili solo dallo staff; registrazione tramite funzione controllata; invio solo dalla Edge Function protetta da segreto condiviso |

## 4. Dati delle atlete della prima squadra (rosa, foto, bio)

| | |
|---|---|
| **Finalità** | Presentazione della squadra nell'app e sul sito; comunicazione sportiva |
| **Base giuridica** | Nome, ruolo, numero di maglia, statistiche: art. 6.1.b/6.1.f (rapporto sportivo; informazione sportiva su dati già pubblici nei referti federali). Foto e bio: art. 6.1.a con liberatoria (diritto all'immagine, artt. 96-97 L. 633/1941) |
| **Interessati** | Atlete della prima squadra (maggiorenni) |
| **Categorie di dati** | Nome, cognome, numero, ruolo, data di nascita, altezza, statistiche (punti, ace, muri), capitana; foto e biografia solo con liberatoria registrata (`consenso_foto`, data e note) |
| **Destinatari** | Pubblico dell'app e del sito; Supabase (responsabile) |
| **Trasferimenti extra-UE** | Come scheda 1 |
| **Conservazione** | Per la stagione e come archivio storico della società [DA DEFINIRE]; foto e bio fino alla revoca della liberatoria (rimozione immediata dall'app impostando `consenso_foto = false`) |
| **Misure specifiche** | Tabella completa leggibile solo dallo staff; il pubblico legge una vista che mostra foto e bio solo con liberatoria; note sulla liberatoria mai pubbliche. Attenzione: i file nei bucket pubblici dello Storage sono raggiungibili da chi conosce l'URL, vanno rimossi in caso di revoca |

## 5. Dati e foto delle atlete delle giovanili (minorenni)

| | |
|---|---|
| **Finalità** | Rose e staff delle squadre giovanili e regionali (Serie B2, Serie D); comunicazione sull'attività giovanile; album foto |
| **Base giuridica** | Nome e numero: art. 6.1.f [DA VALUTARE con il consulente: bilanciamento rafforzato per i minori, art. 6.1.f ultima parte]. Foto, bio e album: art. 6.1.a con liberatoria firmata da **entrambi i genitori** o da chi esercita la responsabilità genitoriale |
| **Interessati** | Atlete minorenni e loro genitori (firmatari delle liberatorie; genitori utenti dell'app con profilo "genitore") |
| **Categorie di dati** | Nome, cognome, numero di maglia, **data di nascita** [DA VALUTARE: oggi pubblicata per intero; valutare solo l'anno o nessuna], categoria; foto e bio solo con liberatoria; foto degli album solo dopo verifica delle liberatorie di tutte le persone ritratte |
| **Destinatari** | Pubblico dell'app e del sito; Supabase (responsabile) |
| **Trasferimenti extra-UE** | Come scheda 1 |
| **Conservazione** | Per la stagione; archivio [DA DEFINIRE]; foto fino a revoca della liberatoria o al raggiungimento della maggiore età con nuovo consenso [DA VALUTARE] |
| **Misure specifiche** | Foto e bio esposte solo con liberatoria registrata; album non pubblicabili senza `consenso_verificato` (vincolo nel database); le foto degli album non pubblicati non sono leggibili dal pubblico; liberatorie cartacee archiviate dalla segreteria [DA COMPLETARE: luogo e responsabile] |

## 6. Cronaca live, risultati e statistiche delle partite

| | |
|---|---|
| **Finalità** | Risultati, classifiche, diretta punto per punto con frase di cronaca, formazioni e statistiche delle partite |
| **Base giuridica** | Art. 6.1.f (informazione sportiva su eventi pubblici; dati già presenti nei referti e nei canali federali) |
| **Interessati** | Atlete della società e delle squadre avversarie; staff tecnico |
| **Categorie di dati** | Nome dell'atleta, numero di maglia, ruolo, capitana, libero, posizione in campo, azione del punto, punteggio, statistiche per partita |
| **Destinatari** | Pubblico dell'app; Supabase (responsabile, anche Realtime); **Groq** (responsabile) riceve squadre, punteggio, azione e nome dell'atleta per scrivere la frase di cronaca; YouTube per le dirette video (titolare autonomo, l'app apre il video su YouTube) |
| **Trasferimenti extra-UE** | Groq: USA [DA VERIFICARE DPA e SCC]; YouTube: Google LLC |
| **Conservazione** | Archivio storico delle stagioni [DA DEFINIRE] |
| **Misure specifiche** | Inserimento dati solo da staff/admin; all'AI vengono inviati solo i fatti del punto (nessun dato degli utenti dell'app); chiave Groq solo nei secrets |

---

## Diritti degli interessati

Accesso, rettifica, cancellazione (anche dall'app, per l'account), limitazione, portabilità, opposizione, revoca del
consenso (marketing dall'app; liberatorie foto tramite la segreteria), reclamo al Garante. Riscontro entro 30 giorni
a segreteria@arenavolleyteam.it.

## Storico delle revisioni

| Data | Modifica |
|---|---|
| Ottobre 2026 | Prima bozza: login con Apple, Google, Facebook; consensi; cancellazione account; liberatorie foto |
