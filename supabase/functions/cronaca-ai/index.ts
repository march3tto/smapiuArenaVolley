// Frasi di cronaca scritte dall'AI (Groq) per un punto della diretta.
// L'AI racconta soltanto: chi ha conquistato il punto, azione, giocatrice e punteggio arrivano già decisi dall'app.
// Segreti: GROQ_API_KEY (obbligatorio), GROQ_MODEL (facoltativo, provato per primo).
//   supabase secrets set GROQ_API_KEY=...
//   supabase functions deploy cronaca-ai
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AZIONI: Record<string, string> = {
  schiacciata: 'schiacciata',
  pipe: 'pipe (attacco da seconda linea in zona centrale)',
  primo_tempo: 'primo tempo (attacco veloce della centrale)',
  pallonetto: 'pallonetto',
  ace: 'ace in battuta',
  muro: 'muro punto',
  errore_avversario: 'errore della squadra avversaria',
};
const ZONE = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

// in ordine di preferenza: se la chiave non ha accesso a un modello si prova il successivo
const MODELLI = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];

interface Richiesta {
  squadra: string;
  avversaria: string;
  /** squadra che ha conquistato il punto: decisa dall'app */
  puntoA: 'us' | 'opp';
  azione: string;
  fase: 'attacco' | 'difesa';
  zona?: number | null;
  giocatrice?: string | null;
  set: number;
  /** punteggio del set dopo il punto */
  nostri: number;
  loro: number;
  chiudeSet?: boolean;
  /** frasi già proposte, da non ripetere */
  evita?: string[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);

  // solo staff e admin: stessa regola delle policy di scrittura della diretta
  const auth = req.headers.get('Authorization') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: staff, error: authError } = await db.rpc('e_staff');
  if (authError || staff !== true) return json({ error: 'Non autorizzato' }, 403);

  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) return json({ error: 'GROQ_API_KEY non configurata' }, 500);

  let r: Richiesta;
  try {
    r = await req.json();
  } catch {
    return json({ error: 'Richiesta non valida' }, 400);
  }
  if (!AZIONI[r.azione] || (r.puntoA !== 'us' && r.puntoA !== 'opp')) return json({ error: 'Azione non valida' }, 400);

  const vincente = r.puntoA === 'us' ? r.squadra : r.avversaria;
  const fatti = [
    `Punto conquistato da: ${vincente}`,
    `Azione: ${AZIONI[r.azione]}, in fase di ${r.fase}`,
    r.giocatrice ? `Giocatrice: ${r.giocatrice} (${r.puntoA === 'us' ? r.squadra : r.avversaria})` : 'Giocatrice: non indicata, non inventarne una',
    r.zona ? `Posizione in campo: zona ${ZONE[r.zona]}` : null,
    `Set: ${r.set === 5 ? 'tie-break' : `${r.set}° set`}`,
    `Punteggio dopo il punto: ${r.squadra} ${r.nostri} – ${r.loro} ${r.avversaria}`,
    r.chiudeSet ? 'Questo punto chiude il set' : null,
  ].filter(Boolean).join('\n');

  const system = [
    `Sei il telecronista della diretta testuale di ${r.squadra}, squadra di pallavolo femminile.`,
    'Scrivi in italiano frasi di cronaca brevi (massimo 140 caratteri), vivaci ma corrette, tifando con garbo per la tua squadra.',
    'Usa SOLO i fatti forniti: non cambiare chi ha fatto punto, il punteggio, l\'azione o il nome della giocatrice, e non aggiungere nomi o dettagli inventati.',
    'Ogni frase deve essere diversa dalle altre per struttura e lessico. Niente emoji, niente hashtag.',
    'Rispondi solo con JSON: {"frasi": ["...", "...", "..."]}',
  ].join(' ');
  const evita = r.evita?.length ? `\n\nNon ripetere queste frasi già proposte:\n- ${r.evita.slice(0, 12).join('\n- ')}` : '';

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: `Fatti del punto:\n${fatti}${evita}\n\nScrivi 3 frasi di cronaca.` },
  ];
  const scelto = Deno.env.get('GROQ_MODEL');
  let out: { choices?: { message?: { content?: string } }[] } | null = null;
  for (const model of scelto ? [scelto, ...MODELLI.filter((m) => m !== scelto)] : MODELLI) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.9,
        // i modelli gpt-oss ragionano prima di rispondere: servono più token e poco ragionamento
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', max_completion_tokens: 1200 } : { max_completion_tokens: 400 }),
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (res.ok) {
      out = await res.json();
      break;
    }
    const body = await res.text();
    console.error('Groq', model, res.status, body);
    // modello non disponibile per questa chiave: si prova il successivo, ogni altro errore si ferma qui
    if (res.status !== 404 && !body.includes('model_not_found') && !body.includes('model_decommissioned')) break;
  }
  if (!out) return json({ error: 'AI non disponibile' }, 502);
  let frasi: string[] = [];
  try {
    const parsed = JSON.parse(out.choices?.[0]?.message?.content ?? '{}');
    frasi = (Array.isArray(parsed.frasi) ? parsed.frasi : [])
      .filter((f: unknown): f is string => typeof f === 'string' && f.trim().length > 0)
      .map((f: string) => f.trim().slice(0, 200))
      .slice(0, 3);
  } catch {
    // risposta non in JSON: nessuna frase
  }
  if (!frasi.length) return json({ error: 'Nessuna frase generata' }, 502);
  return json({ frasi });
});
