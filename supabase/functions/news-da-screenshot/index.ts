// News da uno screenshot di un post (Instagram/Facebook), dall'app: stesse regole della skill news-da-screenshot
// (.claude/skills/news-da-screenshot/SKILL.md). L'AI propone titolo, corpo, categoria, data e il riquadro della grafica;
// lo staff rivede tutto nell'app prima di salvare. Qui non si scrive nulla nel database.
// Segreti: GROQ_API_KEY (obbligatorio), GROQ_VISION_MODEL (facoltativo).
//   supabase functions deploy news-da-screenshot
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS, json } from '../_shared/http.ts';
import { ErroreVision, leggiImmagine } from '../_shared/groq-vision.ts';

const CATEGORIE = ['societa', 'prima_squadra', 'giovanili', 'sponsor'] as const;
type Categoria = (typeof CATEGORIE)[number];

const SYSTEM = [
  'Sei la redazione dell\'app di Arena Volley Team Verona (pallavolo femminile; prima squadra Smapiù Arena in Serie A3).',
  'Trasformi lo screenshot di un post social della società in una news. Regole:',
  '- Usa SOLO il testo del post e della grafica: non inventare nulla (nomi, risultati, date, luoghi).',
  '- titolo: breve e informativo, in italiano (es. "Serie D, Coppa Veneto: vittoria 3-1 contro Iper Volley"); usa anche il testo della grafica.',
  '- corpo: il testo del post ripulito. Togli gli @ degli account (resta il nome senza @), niente hashtag in fondo, maiuscole corrette',
  '  (Serie A3, Serie B2, Serie D, Under 16), risultati nel formato "Squadra A - Squadra B 3-1 (25-22, 23-25, 25-18, 25-20)",',
  '  paragrafi separati da una riga vuota.',
  '- categoria: "giovanili" per account o grafiche del Settore Giovanile / Young (Serie B2, C, D, under), "prima_squadra" per la Serie A3,',
  '  "sponsor" per gli sponsor, altrimenti "societa".',
  '- data: se il post mostra una data assoluta mettila in data_assoluta (AAAA-MM-GG); se mostra un tempo relativo ("3 g", "4 giorni fa", "2 h",',
  '  "1 sett") mettilo in giorni_fa come numero di giorni (ore → 0, settimane × 7).',
  '- slug: 3-6 parole minuscole senza accenti, separate da trattini (es. "serie-d-coppa-veneto-iper-volley").',
  '- box: il riquadro della sola grafica/foto del post (senza didascalia, barre, pulsanti, frecce del carosello), in millesimi',
  '  della larghezza e dell\'altezza dello screenshot (0-1000). Se il post è un carosello usa la slide visibile.',
  '- leggibile: false se lo screenshot non è un post della società o non si legge.',
  'Rispondi solo con JSON: {"leggibile":true,"titolo":"...","corpo":"...","categoria":"...","data_assoluta":null,"giorni_fa":3,',
  '"slug":"...","box":{"x1":0,"y1":0,"x2":1000,"y2":1000}}',
].join('\n');

const oggetto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Data di oggi a Roma (AAAA-MM-GG) */
const oggiRoma = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

function sottraiGiorni(data: string, giorni: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - giorni);
  return d.toISOString().slice(0, 10);
}

function slug(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .split('-').slice(0, 6).join('-');
}

/** Toglie gli @ degli account (resta il nome) e gli hashtag finali */
function pulisciCorpo(s: string): string {
  return s
    .replace(/@([\w.]+)/g, '$1')
    .replace(/(\s*#[\p{L}\d_]+)+\s*$/u, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);

  // solo staff e admin
  const auth = req.headers.get('Authorization') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: staff, error: authError } = await db.rpc('e_staff');
  if (authError || staff !== true) return json({ error: 'Non autorizzato' }, 403);

  let body: Record<string, unknown>;
  try {
    body = oggetto(await req.json());
  } catch {
    return json({ error: 'Richiesta non valida' }, 400);
  }
  const immagine = typeof body.immagine === 'string' ? body.immagine.replace(/^data:[^,]*,/, '') : '';
  const larghezza = Number(body.larghezza);
  const altezza = Number(body.altezza);
  if (!immagine || !(larghezza > 0) || !(altezza > 0)) return json({ error: 'Immagine mancante' }, 400);
  // data dello screenshot (di solito oggi): da qui si sottrae il tempo relativo del post
  const oggi = typeof body.oggi === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.oggi) ? body.oggi : oggiRoma();

  let letto: unknown;
  try {
    ({ dati: letto } = await leggiImmagine({
      system: SYSTEM,
      prompt: `Screenshot di ${Math.round(larghezza)}×${Math.round(altezza)} pixel, fatto il ${oggi}. Crea la news.`,
      immagineBase64: immagine,
      maxToken: 3000,
    }));
  } catch (e) {
    return json({ error: e instanceof ErroreVision ? e.message : 'Lettura non riuscita: riprova' }, e instanceof ErroreVision ? e.status : 502);
  }

  const o = oggetto(letto);
  if (o.leggibile === false) return json({ error: 'Lo screenshot non sembra un post della società o non si legge: scrivi la news a mano.' }, 422);

  const titolo = String(o.titolo ?? '').trim().slice(0, 200);
  const corpo = pulisciCorpo(String(o.corpo ?? ''));
  const categoria: Categoria = CATEGORIE.includes(o.categoria as Categoria) ? (o.categoria as Categoria) : 'societa';
  const assoluta = typeof o.data_assoluta === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.data_assoluta) ? o.data_assoluta : null;
  const giorni = Number(o.giorni_fa);
  const data = assoluta ?? (Number.isFinite(giorni) && giorni >= 0 && giorni < 400 ? sottraiGiorni(oggi, Math.round(giorni)) : oggi);

  // riquadro in millesimi → pixel dell'immagine ricevuta, dentro i bordi; troppo piccolo = nessun suggerimento
  const b = oggetto(o.box);
  const px = (v: unknown, max: number) => Math.min(max, Math.max(0, Math.round((Number(v) / 1000) * max)));
  let box: { x1: number; y1: number; x2: number; y2: number } | null = {
    x1: px(b.x1, larghezza), y1: px(b.y1, altezza), x2: px(b.x2, larghezza), y2: px(b.y2, altezza),
  };
  if (!(box.x2 - box.x1 > larghezza * 0.1 && box.y2 - box.y1 > altezza * 0.05)) box = null;

  if (!titolo || !corpo) return json({ error: 'Testo del post non letto: scrivi la news a mano.' }, 422);
  return json({ titolo, corpo, categoria, data, stimata: !assoluta, slug: slug(String(o.slug ?? '')) || slug(titolo), box });
});
