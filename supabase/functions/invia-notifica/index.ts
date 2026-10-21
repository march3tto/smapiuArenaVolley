// Notifiche push (Expo Push API) per: promemoria pre-partita, inizio partita, fine set (con il risultato finale sul set decisivo),
// nuove notizie, video e podcast. La chiamano i trigger e il cron del database (migration 20261015_notifiche_push.sql).
// Riceve { tipo, id }: prepartita / inizio → id partita; fine_set → id della riga di set_partita; notizia/video/podcast → id del contenuto.
// Ogni messaggio va solo ai dispositivi con la notifica attiva in Impostazioni (colonne di push_token, migration 20261021000200).
// Accetta solo richieste con l'header x-notifiche-segreto uguale a NOTIFICHE_SEGRETO (lo stesso valore salvato nel Vault).
//   supabase secrets set NOTIFICHE_SEGRETO=...
//   supabase functions deploy invia-notifica --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Nome della squadra nei messaggi (come US in src/constants.ts) */
const SQUADRA = 'Smapiù Arena';
/** Set necessari per vincere (come SETS_TO_WIN in src/lib/volley.ts e nel trigger aggiorna_risultato_partita) */
const SET_PER_VINCERE = 3;
const TIE_BREAK = 5;
const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const BLOCCO = 100;

/** notizie.categoria → etichetta, come CATEGORIA_NOTIZIA in src/lib/api.ts */
const CATEGORIA_NOTIZIA: Record<string, string> = { societa: 'Società', prima_squadra: 'Serie A3', giovanili: 'Giovanili', sponsor: 'Sponsor' };

type Tipo = 'prepartita' | 'inizio' | 'fine_set' | 'notizia' | 'video' | 'podcast';
/** Colonna di push_token con la scelta del dispositivo per questo messaggio */
type Preferenza = 'inizio_partita' | 'fine_set' | 'risultato_finale' | 'contenuti';
const TIPI: Tipo[] = ['prepartita', 'inizio', 'fine_set', 'notizia', 'video', 'podcast'];

interface Messaggio {
  chiave: string;
  riferimentoId: string;
  title: string;
  subtitle?: string;
  body?: string;
  /** dati per il tap: tipo della schermata da aprire e id */
  data: { tipo: 'partita' | 'notizia' | 'video' | 'podcast'; id: string };
  threadId?: string;
  /** null = tutti i token attivi */
  categoriaId: string | null;
  preferenza: Preferenza;
}

interface Partita {
  id: string;
  stato: string;
  data_partita: string;
  giornata: number | null;
  avversario: string;
  casa_trasferta: 'casa' | 'trasferta';
  sede: string | null;
  categoria_giovanile_id: string | null;
  nostri_set_vinti: number | null;
  set_vinti_avversario: number | null;
  campionati: { nome: string } | null;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);
  const segreto = Deno.env.get('NOTIFICHE_SEGRETO');
  if (!segreto || req.headers.get('x-notifiche-segreto') !== segreto) return json({ error: 'Non autorizzato' }, 401);

  let tipo: Tipo, id: string;
  try {
    const b = await req.json();
    // payload diretto { tipo, id } oppure quello di un Database Webhook { table, record }
    tipo = b.tipo ?? (b.table === 'set_partita' ? 'fine_set' : b.table === 'notizie' ? 'notizia' : b.record?.tipo);
    id = b.id ?? b.record?.id;
  } catch {
    return json({ error: 'Richiesta non valida' }, 400);
  }
  if (!TIPI.includes(tipo) || typeof id !== 'string') return json({ error: 'tipo o id non validi' }, 400);

  try {
    const m = await componi(tipo, id);
    if (!m) return json({ inviata: false, motivo: 'niente da inviare' });
    return json(await invia(tipo, m));
  } catch (e) {
    console.error(tipo, id, e);
    return json({ error: String(e) }, 500);
  }
});

// ---------- messaggi ----------

async function componi(tipo: Tipo, id: string): Promise<Messaggio | null> {
  if (tipo === 'prepartita') return prepartita(id);
  if (tipo === 'inizio') return inizio(id);
  if (tipo === 'fine_set') return fineSet(id);
  if (tipo === 'notizia') {
    const { data: n } = await db.from('notizie').select('id, titolo, categoria, pubblicata').eq('id', id).maybeSingle();
    if (!n?.pubblicata) return null;
    const categoria = CATEGORIA_NOTIZIA[n.categoria] ?? '';
    return {
      chiave: `notizia:${n.id}`, riferimentoId: n.id,
      title: categoria ? `📰 Nuova notizia · ${categoria}` : '📰 Nuova notizia', body: n.titolo,
      data: { tipo: 'notizia', id: n.id }, categoriaId: null, preferenza: 'contenuti',
    };
  }
  const { data: md } = await db.from('media').select('id, tipo, titolo, etichetta_durata, pubblicato').eq('id', id).maybeSingle();
  if (!md?.pubblicato || md.tipo !== tipo) return null;
  return {
    chiave: `${md.tipo}:${md.id}`,
    riferimentoId: md.id,
    // titolo: l'etichetta (es. "INSIDE THE GAME Ep. 3"), oppure "Nuovo video" / "Nuovo episodio" se manca
    title: md.tipo === 'video' ? `🎬 ${md.etichetta_durata || 'Nuovo video'}` : `🎙️ ${md.etichetta_durata || 'Nuovo episodio'}`,
    body: md.titolo,
    data: { tipo: md.tipo, id: md.id },
    categoriaId: null,
    preferenza: 'contenuti',
  };
}

const PARTITA = 'id, stato, data_partita, giornata, avversario, casa_trasferta, sede, categoria_giovanile_id, nostri_set_vinti, set_vinti_avversario, campionati(nome)';

async function nomeCategoria(id: string | null): Promise<string | undefined> {
  if (!id) return undefined;
  const { data } = await db.from('categorie_giovanili').select('nome').eq('id', id).maybeSingle();
  return data?.nome ?? undefined;
}

/** "Smapiù Arena vs Avversario · Sede", con la squadra di casa per prima */
function sfida(p: Partita): string {
  const s = p.casa_trasferta === 'casa' ? `${SQUADRA} vs ${p.avversario}` : `${p.avversario} vs ${SQUADRA}`;
  return p.sede ? `${s} · ${p.sede}` : s;
}

/** "Serie A3 Femminile" → "A3 F" */
const campionatoBreve = (nome: string) => nome.replace(/^serie\s+/i, '').replace(/\s+femminile$/i, ' F').replace(/\s+maschile$/i, ' M');

/** Titolo del promemoria: "5ª giornata A3 F", oppure il campionato, la categoria giovanile o "Amichevole" */
function intestazione(p: Partita, categoria: string | undefined): string {
  const campionato = p.campionati?.nome;
  if (campionato && p.giornata) return `${p.giornata}ª giornata ${campionatoBreve(campionato)}`;
  return campionato ?? categoria ?? 'Amichevole';
}

/** Ora di inizio in Italia, es. "20:30" */
const ora = (data: string) => new Date(data).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });

async function prepartita(id: string): Promise<Messaggio | null> {
  const { data: p } = await db.from('partite').select(PARTITA).eq('id', id).maybeSingle<Partita>();
  // il cron può arrivare in ritardo: niente promemoria per partite non più programmate o già iniziate
  if (!p || p.stato !== 'programmata' || Date.parse(p.data_partita) <= Date.now()) return null;
  const categoria = await nomeCategoria(p.categoria_giovanile_id);
  const squadre = p.casa_trasferta === 'casa' ? `${SQUADRA} - ${p.avversario}` : `${p.avversario} - ${SQUADRA}`;
  const titolo = intestazione(p, categoria);
  return {
    // l'orario nella chiave: se la partita viene spostata il promemoria riparte per il nuovo orario
    chiave: `prepartita:${p.id}:${Math.floor(Date.parse(p.data_partita) / 1000)}`,
    riferimentoId: p.id,
    title: `🏐 ${titolo}`,
    // la categoria come sottotitolo solo se non è già nel titolo
    subtitle: categoria !== titolo ? categoria : undefined,
    body: `Alle ${ora(p.data_partita)} inizia ${squadre}`,
    data: { tipo: 'partita', id: p.id },
    threadId: `partita-${p.id}`,
    categoriaId: p.categoria_giovanile_id,
    preferenza: 'inizio_partita',
  };
}

async function inizio(id: string): Promise<Messaggio | null> {
  const { data: p } = await db.from('partite').select(PARTITA).eq('id', id).maybeSingle<Partita>();
  if (!p || p.stato !== 'live') return null;
  return {
    chiave: `inizio:${p.id}`,
    riferimentoId: p.id,
    title: '⏰ Si comincia!',
    subtitle: await nomeCategoria(p.categoria_giovanile_id),
    body: sfida(p),
    data: { tipo: 'partita', id: p.id },
    threadId: `partita-${p.id}`,
    categoriaId: p.categoria_giovanile_id,
    preferenza: 'inizio_partita',
  };
}

const nomeSet = (n: number) => (n === TIE_BREAK ? 'Tie-break' : `${n}° Set`);

async function fineSet(setId: string): Promise<Messaggio | null> {
  const { data: s } = await db.from('set_partita').select('partita_id, numero_set, punti_nostri, punti_avversario, completato').eq('id', setId).maybeSingle();
  // il set potrebbe essere stato riaperto prima che arrivasse la chiamata
  if (!s?.completato) return null;
  const { data: p } = await db.from('partite').select(PARTITA).eq('id', s.partita_id).maybeSingle<Partita>();
  if (!p) return null;

  const { data: sets } = await db.from('set_partita').select('numero_set, punti_nostri, punti_avversario')
    .eq('partita_id', p.id).eq('completato', true).order('numero_set');
  const chiusi = sets ?? [];
  const nostri = chiusi.filter((x) => x.punti_nostri > x.punti_avversario).length;
  const loro = chiusi.filter((x) => x.punti_avversario > x.punti_nostri).length;
  // decisivo: una squadra arriva a 3 set, oppure la partita è già segnata come conclusa
  const decisivo = Math.max(nostri, loro) >= SET_PER_VINCERE || p.stato === 'conclusa';

  const parziale = `${SQUADRA} ${nostri}-${loro} ${p.avversario}`;
  const categoria = await nomeCategoria(p.categoria_giovanile_id);
  const base = {
    chiave: `fine_set:${p.id}:${s.numero_set}`,
    riferimentoId: p.id,
    subtitle: categoria,
    data: { tipo: 'partita' as const, id: p.id },
    // stesso thread per tutta la partita: su iPhone le notifiche dei set restano raggruppate
    threadId: `partita-${p.id}`,
    categoriaId: p.categoria_giovanile_id,
  };

  if (!decisivo) {
    return { ...base, title: `🏐 ${nomeSet(s.numero_set)} : ${s.punti_nostri}-${s.punti_avversario}`, body: parziale, preferenza: 'fine_set' };
  }

  // risultato finale: riempie i set vinti solo se mancano (di solito li scrive già il trigger aggiorna_risultato_partita)
  if (p.nostri_set_vinti == null || p.set_vinti_avversario == null) {
    await db.from('partite').update({ nostri_set_vinti: p.nostri_set_vinti ?? nostri, set_vinti_avversario: p.set_vinti_avversario ?? loro }).eq('id', p.id);
    console.log(`partita ${p.id}: set vinti aggiornati a ${nostri}-${loro}`);
  }
  const esito = nostri > loro ? 'Vittoria' : nostri < loro ? 'Sconfitta' : 'Pareggio';
  return { ...base, title: `🏁 Finale: ${esito} ${nostri}-${loro}`, body: parziale, preferenza: 'risultato_finale' };
}

// ---------- invio ----------

async function invia(tipo: Tipo, m: Messaggio) {
  // deduplica: la chiave si registra prima di inviare; se c'è già, la notifica è partita in passato
  const { data: reg, error } = await db.from('notifiche_inviate')
    .upsert({ tipo, riferimento_id: m.riferimentoId, chiave: m.chiave }, { onConflict: 'chiave', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  if (!reg?.length) return { inviata: false, motivo: 'già inviata', chiave: m.chiave };
  const regId = reg[0].id;
  let inviati = 0;

  try {
    // solo i dispositivi con le notifiche accese e questo tipo scelto in Impostazioni;
    // partite giovanili: solo i dispositivi di quella categoria; prima squadra e contenuti: tutti
    let q = db.from('push_token').select('token').eq('attivo', true).eq('notifiche_attive', true).eq(m.preferenza, true);
    if (m.categoriaId) q = q.eq('categoria_giovanile_id', m.categoriaId);
    const { data: righe, error: e } = await q;
    if (e) throw e;
    const token = (righe ?? []).map((r) => r.token as string);

    const disattivati: string[] = [];
    for (let i = 0; i < token.length; i += BLOCCO) {
      const blocco = token.slice(i, i + BLOCCO);
      const messaggi = blocco.map((to) => ({
        to, title: m.title, subtitle: m.subtitle, body: m.body, data: m.data, sound: 'default', threadId: m.threadId, priority: 'high',
      }));
      const res = await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
        body: JSON.stringify(messaggi),
      });
      if (!res.ok) throw new Error(`Expo Push ${res.status}: ${await res.text()}`);
      inviati += blocco.length;
      const { data: ticket } = await res.json() as { data: { status: string; message?: string; details?: { error?: string } }[] };
      ticket.forEach((t, j) => {
        if (t.status !== 'error') return;
        if (t.details?.error === 'DeviceNotRegistered') disattivati.push(blocco[j]);
        else console.warn('push non inviata', t.message);
      });
    }
    if (disattivati.length) {
      await db.from('push_token').update({ attivo: false, aggiornato_il: new Date().toISOString() }).in('token', disattivati);
    }

    await db.from('notifiche_inviate').update({ destinatari: token.length - disattivati.length }).eq('id', regId);
    return { inviata: true, chiave: m.chiave, destinatari: token.length, disattivati: disattivati.length };
  } catch (e) {
    // invio fallito prima di qualsiasi blocco: si toglie la chiave così una chiamata successiva (es. il cron) può riprovare
    if (inviati === 0) await db.from('notifiche_inviate').delete().eq('id', regId);
    else await db.from('notifiche_inviate').update({ destinatari: inviati }).eq('id', regId);
    throw e;
  }
}
