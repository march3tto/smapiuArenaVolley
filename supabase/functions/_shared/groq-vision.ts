// Chiamata a Groq con un modello vision (immagine in base64) e risposta in JSON.
// Segreti: GROQ_API_KEY (obbligatorio), GROQ_VISION_MODEL (facoltativo, provato per primo).
// Modelli vision su Groq (console.groq.com/docs/vision, novembre 2026): qwen/qwen3.8-27b (fino a 3 immagini, JSON mode)
// e meta-models/muse-spark-open (anteprima su richiesta). Le immagini in base64 devono stare sotto i 4 MB.

// in ordine di preferenza: se la chiave non ha accesso a un modello si prova il successivo
const MODELLI_VISION = ['qwen/qwen3.8-27b', 'meta-models/muse-spark-open'];

/** Limite di Groq per le immagini passate in base64 */
export const MAX_BASE64 = 4 * 1024 * 1024;

export class ErroreVision extends Error {
  constructor(messaggio: string, readonly status = 502) {
    super(messaggio);
  }
}

/** Base64 di un file binario, a blocchi (String.fromCharCode con troppi argomenti va in errore) */
export function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Manda il prompt e l'immagine al primo modello disponibile; ritorna il JSON della risposta (non validato).
 * temperature 0 e json_object: è una lettura, non un testo creativo.
 */
export async function leggiImmagine(opts: { system: string; prompt: string; immagineBase64: string; mime?: string; maxToken?: number }): Promise<{ dati: unknown; modello: string }> {
  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) throw new ErroreVision('GROQ_API_KEY non configurata', 500);
  if (opts.immagineBase64.length > MAX_BASE64) throw new ErroreVision('Immagine troppo grande per la lettura (oltre 4 MB): rifai la foto', 413);

  const scelto = Deno.env.get('GROQ_VISION_MODEL');
  const messages = [
    { role: 'system', content: opts.system },
    {
      role: 'user',
      content: [
        { type: 'text', text: opts.prompt },
        { type: 'image_url', image_url: { url: `data:${opts.mime ?? 'image/jpeg'};base64,${opts.immagineBase64}` } },
      ],
    },
  ];
  for (const model of scelto ? [scelto, ...MODELLI_VISION.filter((m) => m !== scelto)] : MODELLI_VISION) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_completion_tokens: opts.maxToken ?? 4000,
        // i modelli qwen ragionano: con JSON mode il ragionamento va nascosto (hidden o parsed), poco basta per trascrivere
        ...(model.startsWith('qwen/') ? { reasoning_format: 'hidden', reasoning_effort: 'low' } : {}),
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (res.ok) {
      const out = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      try {
        return { dati: JSON.parse(out.choices?.[0]?.message?.content ?? ''), modello: model };
      } catch {
        throw new ErroreVision('Risposta dell\'AI non leggibile: riprova');
      }
    }
    const body = await res.text();
    console.error('Groq vision', model, res.status, body);
    // modello non disponibile per questa chiave: si prova il successivo, ogni altro errore si ferma qui
    if (res.status !== 404 && !body.includes('model_not_found') && !body.includes('model_decommissioned')) {
      throw new ErroreVision(res.status === 429 ? 'Limite di richieste AI raggiunto: riprova tra poco' : 'AI non disponibile', 502);
    }
  }
  throw new ErroreVision('Nessun modello vision disponibile per questa chiave Groq');
}
