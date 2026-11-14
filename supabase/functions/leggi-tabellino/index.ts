// Lettura del tabellino DataVolley 4 fotografato dallo staff durante la partita (riga di public.tabellini).
// L'AI (Groq vision) trascrive la sezione Attacco; qui si controlla che i numeri tornino. Non scrive le statistiche:
// lo fa la RPC conferma_tabellino dopo la revisione dello staff nell'app.
// Segreti: GROQ_API_KEY (obbligatorio), GROQ_VISION_MODEL (facoltativo, provato per primo).
//   supabase secrets set GROQ_VISION_MODEL=qwen/qwen3.8-27b
//   supabase functions deploy leggi-tabellino
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS, json } from '../_shared/http.ts';
import { ErroreVision, base64, leggiImmagine } from '../_shared/groq-vision.ts';
import { controlla, normalizza, type Tabellino } from '../_shared/tabellino.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM = [
  'Trascrivi tabellini di pallavolo stampati da DataVolley 4. Sei un lettore preciso: copi i numeri come sono stampati, non calcoli e non inventi.',
  'Rispondi solo con JSON valido.',
].join(' ');

function prompt(numeroSet: number | null, avversario: string): string {
  return [
    `Foglio atteso: ${numeroSet ? `"Tabellino - Set ${numeroSet}" (dati del solo set ${numeroSet})` : 'tabellino finale della partita (senza "Set N" nel titolo, dati cumulati)'}.`,
    `Squadre: Smapiù Arena (la nostra: il nome contiene SMAPIU o ARENA) e ${avversario || "l'avversaria"}.`,
    'Per ogni squadra leggi la sezione "Attacco", colonne Tot, Err, Mur, Pt (ignora Pt%), riga per giocatrice (numero di maglia e cognome),',
    'poi la riga "Totali giocatori" e, nel riquadro "Punti vinti", la colonna Att per ogni set.',
    'Un "." o una cella vuota vale 0. Escludi le giocatrici senza nessun dato d\'attacco. Non correggere i numeri perché tornino: copiali.',
    'Formato:',
    '{"tipo_foglio":"set"|"finale","numero_set":n|null,"squadre":[{"nome":"...","lato":"nostra"|"avversaria",',
    '"giocatrici":[{"numero":n,"nome":"...","tot":n,"err":n,"mur":n,"pt":n}],"totali":{"tot":n,"err":n,"mur":n,"pt":n},',
    '"punti_vinti_att_per_set":{"1":n,"2":n}}]}',
  ].join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);

  // solo staff e admin: stessa regola di cronaca-ai
  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const db = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: staff, error: authError } = await db.rpc('e_staff');
  if (authError || staff !== true) return json({ error: 'Non autorizzato' }, 403);

  let tabellinoId: unknown;
  try {
    ({ tabellinoId } = await req.json());
  } catch {
    return json({ error: 'Richiesta non valida' }, 400);
  }
  if (typeof tabellinoId !== 'string' || !UUID.test(tabellinoId)) return json({ error: 'Tabellino non valido' }, 400);

  // service role: immagine nel bucket privato e scrittura dell'esito
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: riga, error: rigaError } = await admin.from('tabellini')
    .select('id, partita_id, numero_set, percorso_immagine, partita:partite(avversario)')
    .eq('id', tabellinoId).maybeSingle();
  if (rigaError || !riga) return json({ error: 'Tabellino non trovato' }, 404);
  const numeroSet = (riga.numero_set as number | null) ?? null;
  const avversario = String((riga.partita as { avversario?: string } | null)?.avversario ?? '');
  const foglio = numeroSet ? `set ${numeroSet}` : 'finale';

  const log = (livello: 'info' | 'avviso' | 'errore', evento: string, messaggio: string, dettagli?: unknown) =>
    admin.from('log_agente').insert({ agente: 'tabellino', livello, evento, partita_id: riga.partita_id, messaggio, dettagli: dettagli ?? null })
      .then(({ error }) => error && console.error('log_agente', error.message));

  const fallito = async (messaggio: string, dati: unknown = null, status = 200) => {
    await admin.from('tabellini').update({ stato: 'errore', errore: messaggio, json_letto: dati }).eq('id', riga.id);
    await log('errore', 'tabellino_errore', `Tabellino ${foglio}: ${messaggio}`, { tabellino_id: riga.id });
    return json({ stato: 'errore', errore: messaggio, dati }, status);
  };

  const { data: file, error: fileError } = await admin.storage.from('tabellini').download(String(riga.percorso_immagine));
  if (fileError || !file) return fallito('Foto non trovata nello Storage: ricaricala');

  let letto: unknown;
  let modello = '';
  try {
    ({ dati: letto, modello } = await leggiImmagine({
      system: SYSTEM,
      prompt: prompt(numeroSet, avversario),
      immagineBase64: base64(new Uint8Array(await file.arrayBuffer())),
      mime: file.type || 'image/jpeg',
    }));
  } catch (e) {
    return fallito(e instanceof ErroreVision ? e.message : 'Lettura non riuscita: riprova');
  }

  const t = normalizza(letto);
  // il foglio scelto nell'app decide; se l'AI legge chiaramente un altro titolo lo si segnala (titolo non letto: si va avanti)
  const grezzo = (letto && typeof letto === 'object' ? letto : {}) as { tipo_foglio?: unknown };
  const lettoComeSet = grezzo.tipo_foglio === 'set' ? t.numero_set : null;
  const titoloDiverso = grezzo.tipo_foglio === 'finale' ? numeroSet != null
    : grezzo.tipo_foglio === 'set' && lettoComeSet != null ? lettoComeSet !== numeroSet
    : false;
  const dati: Tabellino = { ...t, tipo_foglio: numeroSet ? 'set' : 'finale', numero_set: numeroSet };
  const esito = controlla(dati);

  if (titoloDiverso) {
    return fallito(`Il foglio sembra ${lettoComeSet ? `il set ${lettoComeSet}` : 'il finale'}, non ${numeroSet ? `il set ${numeroSet}` : 'il finale'}: controlla la scelta o rifai la foto.`, { ...dati, controlli: esito });
  }
  if (esito.nostra.length) return fallito(esito.messaggio ?? 'Controlli non superati', { ...dati, controlli: esito });

  const salvati = { ...dati, controlli: esito };
  const { error: updError } = await admin.from('tabellini').update({ stato: 'letto', errore: null, json_letto: salvati }).eq('id', riga.id);
  if (updError) return json({ error: 'Esito non salvato' }, 500);
  await log(esito.avversaria.length ? 'avviso' : 'info', 'tabellino_letto',
    `Tabellino ${foglio} letto (${modello})${esito.avversaria.length ? `: avversaria non salvabile, ${esito.avversaria.join('; ')}` : ''}`,
    { tabellino_id: riga.id });
  return json({ stato: 'letto', dati: salvati, avvisi: esito.avversaria });
});
