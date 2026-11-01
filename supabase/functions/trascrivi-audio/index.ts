// Trascrizione dell'audio della diretta (Groq Whisper) per la cronaca a voce, poi corretta da un modello di testo Groq.
// L'app manda pezzi di pochi secondi dell'audio della scheda col video; il testo torna nella bozza dell'admin, che decide se pubblicarlo.
// Segreti: GROQ_API_KEY (obbligatorio, lo stesso di cronaca-ai), GROQ_WHISPER_MODEL e GROQ_MODEL (facoltativi).
//   supabase functions deploy trascrivi-audio
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// pezzi di circa 10 secondi: ben sotto il limite, oltre è una richiesta anomala
const MAX_BYTES = 2 * 1024 * 1024;

// frasi che Whisper "sente" nel silenzio o sotto il tifo, mai dette in telecronaca
const ALLUCINAZIONI = [/sottotitoli/i, /amara\.org/i, /grazie (a tutti )?per (la visione|l'ascolto|aver guardato)/i, /iscriviti al canale/i];

// in ordine di preferenza, come in cronaca-ai: se la chiave non ha accesso a un modello si prova il successivo
const MODELLI = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];

/**
 * Corregge la trascrizione: parole capite male, nomi di squadre e giocatrici, punteggiatura.
 * Non aggiunge fatti; se il pezzo non è telecronaca (pubblicità, musica, rumore) torna vuoto.
 * precedente: fine del pezzo prima, per le parole tagliate a metà tra un pezzo e l'altro.
 * null se l'AI non risponde: si tiene il testo di Whisper.
 */
async function correggi(key: string, testo: string, contesto: string, precedente: string): Promise<string | null> {
  const system = [
    'Correggi la trascrizione automatica di una telecronaca di pallavolo femminile in italiano.',
    'Sistema le parole riconosciute male, i nomi di squadre e giocatrici (usa la grafia dei nomi forniti) e la punteggiatura.',
    'Non aggiungere fatti, non riassumere, non cambiare punteggi o chi ha fatto punto: lascia il senso di quello che è stato detto.',
    'Se il testo continua una parola o una frase tagliata alla fine del pezzo precedente, completala senza ripetere il pezzo precedente.',
    'Se il testo non è telecronaca (pubblicità, musica, rumore, frasi senza senso) rispondi con testo vuoto.',
    'Rispondi solo con JSON: {"testo": "..."}',
  ].join(' ');
  const user = [
    contesto ? `Partita e nomi: ${contesto}` : null,
    precedente ? `Fine del pezzo precedente (già scritto, non ripeterlo): «${precedente}»` : null,
    `Trascrizione da correggere: «${testo}»`,
  ].filter(Boolean).join('\n');
  const scelto = Deno.env.get('GROQ_MODEL');
  for (const model of scelto ? [scelto, ...MODELLI.filter((m) => m !== scelto)] : MODELLI) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', max_completion_tokens: 1200 } : { max_completion_tokens: 400 }),
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    if (res.ok) {
      const out = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      try {
        const t = JSON.parse(out.choices?.[0]?.message?.content ?? '{}').testo;
        return typeof t === 'string' ? t.trim().slice(0, 1000) : null;
      } catch {
        return null;
      }
    }
    const body = await res.text();
    console.error('Groq', model, res.status, body);
    if (res.status !== 404 && !body.includes('model_not_found') && !body.includes('model_decommissioned')) return null;
  }
  return null;
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

  let audio: File;
  let contesto = '';
  let precedente = '';
  try {
    const form = await req.formData();
    const f = form.get('audio');
    if (!(f instanceof File)) throw new Error('audio mancante');
    audio = f;
    contesto = String(form.get('contesto') ?? '').slice(0, 1000);
    precedente = String(form.get('precedente') ?? '').slice(-200);
  } catch {
    return json({ error: 'Richiesta non valida' }, 400);
  }
  if (!audio.size || audio.size > MAX_BYTES) return json({ error: 'Audio non valido' }, 400);

  const body = new FormData();
  body.append('file', audio, audio.name || 'audio.webm');
  body.append('model', Deno.env.get('GROQ_WHISPER_MODEL') ?? 'whisper-large-v3-turbo');
  body.append('language', 'it');
  body.append('temperature', '0');
  body.append('response_format', 'json');
  // nomi di squadre e giocatrici: Whisper li scrive giusti invece di indovinarli
  body.append('prompt', `Telecronaca di pallavolo femminile. ${contesto}`.trim());

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body,
  });
  if (!res.ok) {
    console.error('Groq Whisper', res.status, await res.text());
    return json({ error: 'Trascrizione non disponibile' }, 502);
  }
  const out = (await res.json()) as { text?: string };
  const testo = (out.text ?? '').trim();
  if (!testo || ALLUCINAZIONI.some((r) => r.test(testo))) return json({ testo: '' });
  const corretto = await correggi(key, testo, contesto, precedente);
  return json({ testo: corretto ?? testo, grezzo: testo });
});
