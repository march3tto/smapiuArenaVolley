// Stato di una richiesta di cancellazione dato il codice di conferma (?code=...), senza dati personali.
// È l'URL restituito a Meta dalla function facebook-eliminazione-dati.
// Nota: sul dominio *.supabase.co le Edge Functions non possono servire HTML (le risposte GET text/html diventano text/plain),
// quindi la risposta è testo semplice leggibile; con ?formato=json (o Accept: application/json) risponde in JSON,
// utile per mostrare lo stato in una pagina del sito (es. https://march3tto.github.io/smapiuArenaVolley/elimina-account/?code=...).
//   supabase functions deploy stato-eliminazione --no-verify-jwt
import { admin } from '../_shared/eliminazione-account.ts';
import { CORS, json } from '../_shared/http.ts';

const testo = (body: string, status = 200) => new Response(body, { status, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return json({ error: 'Metodo non consentito' }, 405);

  const url = new URL(req.url);
  const vuoleJson = url.searchParams.get('formato') === 'json' || (req.headers.get('Accept') ?? '').includes('application/json');
  const codice = (url.searchParams.get('code') ?? '').trim().toUpperCase();

  if (!/^[0-9A-F]{16}$/.test(codice)) {
    return vuoleJson ? json({ stato: 'codice_non_valido' }, 400) : testo('Arena Volley Team - Eliminazione dati\n\nCodice non valido.', 400);
  }

  const { data, error } = await admin.from('account_eliminati').select('utente_eliminato_id, eliminato_il').eq('codice_conferma', codice).maybeSingle();
  if (error) {
    console.error('stato-eliminazione', error.message);
    return vuoleJson ? json({ stato: 'errore' }, 500) : testo('Arena Volley Team - Eliminazione dati\n\nServizio non disponibile, riprova più tardi.', 500);
  }

  if (!data) {
    return vuoleJson ? json({ stato: 'non_trovato' }, 404) : testo(`Arena Volley Team - Eliminazione dati\n\nNessuna richiesta trovata con il codice ${codice}.`, 404);
  }

  const quando = new Date(data.eliminato_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
  const stato = data.utente_eliminato_id ? 'eliminato' : 'nessun_dato';
  if (vuoleJson) return json({ stato, data: data.eliminato_il });
  return testo(
    `Arena Volley Team - Eliminazione dati\n\nCodice: ${codice}\n` +
      (data.utente_eliminato_id
        ? `Stato: completata il ${quando}. L'account e i dati collegati sono stati eliminati.`
        : `Stato: completata il ${quando}. Non risultava alcun account collegato: nessun dato da eliminare.`),
  );
});
