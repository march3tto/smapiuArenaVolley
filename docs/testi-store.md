# Testi per App Store e Google Play

Testi in italiano da incollare in App Store Connect e nella Play Console. Tra parentesi il limite dello store e la
lunghezza attuale. Screenshot e grafiche sono in `docs/store/` (solo in locale, esclusi da git).

## Nome (30 / 19)

```
Smapiù Arena Volley
```

Uguale sui due store. Sul telefono, sotto l'icona, compare il `CFBundleDisplayName` di `app.json`, che è lo stesso.

## Sottotitolo App Store (30 / 29)

```
Serie A3 femminile in diretta
```

## Descrizione breve Google Play (80 / 76)

```
Risultati, dirette punto per punto, classifica e news dell'Arena Volley Team
```

## Testo promozionale App Store (170 / 162, facoltativo)

Si può cambiare in qualsiasi momento senza inviare una nuova versione: utile per annunciare la partita della settimana.

```
Segui la Smapiù Arena Volley Team in Serie A3: dirette punto per punto, notifiche a fine set, vota l'MVP e scopri rosa, giovanili e convenzioni Arena Volley Card.
```

## Descrizione lunga (4000, uguale sui due store)

```
L'app ufficiale di Arena Volley Team, la società di pallavolo femminile di Verona che gioca in Serie A3 con la Smapiù Arena Volley Team.

Partite, risultati, classifica, rosa e news, tutto in un'app sola: segui la squadra in casa e in trasferta, sempre e ovunque.

PARTITE IN DIRETTA
• Punteggio aggiornato punto per punto, set per set
• Notifiche per il game day, l'inizio della partita, la fine di ogni set e il risultato finale
• Vota l'MVP della partita insieme agli altri tifosi

RISULTATI E CLASSIFICA
• Calendario completo della Serie A3 femminile, girone B, con il conto alla rovescia per la prossima partita
• Risultati con i parziali di ogni set
• Tutte le partite di ogni giornata e la classifica sempre aggiornata

LA SQUADRA
• La rosa della prima squadra, con ruolo, numero di maglia e altezza
• La scheda di ogni giocatrice con la sua posizione in campo
• Staff tecnico e dirigenti

NEWS E MEDIA
• Notizie, interviste e vita della società
• Video, podcast e gallerie fotografiche delle partite

GIOVANILI
• Le squadre regionali di Serie B2 e Serie D, con rose e allenatori
• Il movimento giovanile di Arena Volley, dalle prime squadre ai più piccoli

ARENA VOLLEY CARD
• Convenzioni e sconti riservati dai partner della società

E ANCORA
• Un assistente AI che risponde su partite, risultati, squadra e pallavolo (richiede un account)
• Le palestre e gli impianti con le indicazioni per arrivarci
• Gli sponsor che sostengono la squadra
• Modalità scura

Puoi usare l'app anche senza account. Con un account gratuito ricevi notifiche su misura, voti l'MVP e usi l'assistente. L'account si può eliminare in qualsiasi momento dall'app.

Arena Volley Team: qui sei di casa.
```

## Parole chiave App Store (100 / 98)

Separate da virgola senza spazi. Apple indicizza già nome e sottotitolo, quindi qui non si ripetono "Smapiù",
"Arena", "Volley", "Serie A3", "femminile" e "diretta". Su Google Play non esiste questo campo: conta il testo delle
descrizioni.

```
pallavolo,verona,risultati,classifica,live,punteggio,partite,giovanili,tifosi,mvp,calendario,sport
```

## Categoria

| Store | Principale | Secondaria |
|---|---|---|
| App Store | Sport | Notizie (facoltativa) |
| Google Play | Sport | — (Play non ha la secondaria; tag consigliati: Pallavolo, Notizie sportive) |

## URL

| Campo | URL | Note |
|---|---|---|
| Supporto (App Store, obbligatorio) | https://march3tto.github.io/smapiuArenaVolley/ | Pagina `pagine/index.html`: documenti e sezione Assistenza con info@arenavolleyteam.it. Se cambia l'email di contatto, aggiornarla anche lì |
| Marketing (App Store, facoltativo) | https://arenavolleyteam.it | Sito della società |
| Sito web (Google Play) | https://arenavolleyteam.it | |
| Email di contatto (Google Play, obbligatoria, pubblica) | info@arenavolleyteam.it | Scelta dalla società; è la stessa della sezione Assistenza della pagina di supporto |
| Informativa privacy (entrambi) | https://march3tto.github.io/smapiuArenaVolley/privacy/ | Pubblicata con GitHub Pages dal workflow `pagine.yml` |
| Eliminazione account (Google Play) | https://march3tto.github.io/smapiuArenaVolley/elimina-account/ | |
