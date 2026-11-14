// Tabellino DataVolley 4: normalizzazione dell'output del modello vision e controlli di coerenza.
// TypeScript puro, senza API di Deno: lo usano la Edge Function leggi-tabellino, l'anteprima nella Live e i test (npm test).

export type Lato = 'nostra' | 'avversaria';

/** Riga della sezione Attacco di una giocatrice: Tot, Err, Mur, Pt */
export interface RigaAttacco {
  numero: number;
  nome: string;
  tot: number;
  err: number;
  mur: number;
  pt: number;
}

export type Totali = Pick<RigaAttacco, 'tot' | 'err' | 'mur' | 'pt'>;

export interface SquadraTabellino {
  nome: string;
  lato: Lato;
  giocatrici: RigaAttacco[];
  /** riga "Totali giocatori" */
  totali: Totali;
  /** riquadro "Punti vinti" → Att, per numero di set ("1", "2", ...) */
  punti_vinti_att_per_set: Record<string, number>;
}

export interface Tabellino {
  tipo_foglio: 'set' | 'finale';
  numero_set: number | null;
  squadre: SquadraTabellino[];
}

export const CAMPI = ['tot', 'err', 'mur', 'pt'] as const;
export const ETICHETTA: Record<(typeof CAMPI)[number], string> = { tot: 'tentativi', err: 'errori', mur: 'murati', pt: 'punti' };

/** La nostra squadra nel tabellino: il nome contiene SMAPIU o ARENA (anche con l'accento) */
export const eNostra = (nome: string) => /smapi[uù]|arena/i.test(nome);

/** Numero dal tabellino: "." e celle vuote valgono 0, mai negativo */
export function intero(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  if (typeof v !== 'string') return 0;
  const n = parseInt(v.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

const oggetto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function totali(v: unknown): Totali {
  const o = oggetto(v);
  return { tot: intero(o.tot), err: intero(o.err), mur: intero(o.mur), pt: intero(o.pt) };
}

/**
 * JSON del modello → tabellino pulito: numeri interi, giocatrici senza dati d'attacco escluse,
 * lato deciso dal nome (SMAPIU/ARENA) e non dal modello, set fuori da 1–5 scartati.
 */
export function normalizza(raw: unknown): Tabellino {
  const o = oggetto(raw);
  const n = intero(o.numero_set);
  const finale = o.tipo_foglio === 'finale' || !(n >= 1 && n <= 5);
  const squadre = (Array.isArray(o.squadre) ? o.squadre : []).map((s): SquadraTabellino => {
    const so = oggetto(s);
    const nome = String(so.nome ?? '').trim();
    const giocatrici = (Array.isArray(so.giocatrici) ? so.giocatrici : [])
      .map((g): RigaAttacco => {
        const go = oggetto(g);
        return { numero: intero(go.numero), nome: String(go.nome ?? '').trim(), tot: intero(go.tot), err: intero(go.err), mur: intero(go.mur), pt: intero(go.pt) };
      })
      .filter((g) => g.numero > 0 && CAMPI.some((k) => g[k] > 0));
    const perSet: Record<string, number> = {};
    for (const [k, v] of Object.entries(oggetto(so.punti_vinti_att_per_set))) {
      const set = intero(k);
      if (set >= 1 && set <= 5) perSet[String(set)] = intero(v);
    }
    return { nome, lato: eNostra(nome) ? 'nostra' : 'avversaria', giocatrici, totali: totali(so.totali), punti_vinti_att_per_set: perSet };
  });
  return { tipo_foglio: finale ? 'finale' : 'set', numero_set: finale ? null : n, squadre };
}

/** Somma di Tot/Err/Mur/Pt delle giocatrici */
export function somma(righe: Totali[]): Totali {
  return righe.reduce((a, r) => ({ tot: a.tot + r.tot, err: a.err + r.err, mur: a.mur + r.mur, pt: a.pt + r.pt }), { tot: 0, err: 0, mur: 0, pt: 0 });
}

/**
 * Controlli di coerenza di una squadra; lista vuota = tutto torna.
 * 1. somma delle giocatrici = "Totali giocatori" (Tot, Err, Mur, Pt);
 * 2. foglio di set: totale punti = Punti vinti Att di quel set;
 * 3. foglio finale: totale punti = somma dei Punti vinti Att di tutti i set.
 */
export function controllaSquadra(s: SquadraTabellino, tipo: Tabellino['tipo_foglio'], numeroSet: number | null): string[] {
  const errori: string[] = [];
  if (!s.giocatrici.length) errori.push('nessuna giocatrice letta nella sezione Attacco');
  const sum = somma(s.giocatrici);
  for (const k of CAMPI) {
    if (sum[k] !== s.totali[k]) errori.push(`somma ${ETICHETTA[k]} ${sum[k]} ≠ totale ${s.totali[k]}`);
  }
  const perSet = s.punti_vinti_att_per_set;
  if (tipo === 'set' && numeroSet != null) {
    const att = perSet[String(numeroSet)];
    if (att == null) errori.push(`manca "Punti vinti → Att" del set ${numeroSet}`);
    else if (att !== s.totali.pt) errori.push(`totale punti ${s.totali.pt} ≠ Punti vinti Att del set ${numeroSet} (${att})`);
  }
  if (tipo === 'finale') {
    const valori = Object.values(perSet);
    const tot = valori.reduce((a, b) => a + b, 0);
    if (!valori.length) errori.push('manca il riquadro "Punti vinti → Att"');
    else if (tot !== s.totali.pt) errori.push(`totale punti ${s.totali.pt} ≠ somma dei Punti vinti Att dei set (${tot})`);
  }
  return errori;
}

export interface EsitoControlli {
  nostra: string[];
  avversaria: string[];
  /** messaggio unico da mostrare, null se tutto torna */
  messaggio: string | null;
}

const CONSIGLIO = 'rifai la foto più dritta, con tutto il foglio a fuoco';

/** Controlli su entrambe le squadre; la nostra deve esserci */
export function controlla(t: Tabellino): EsitoControlli {
  const nostra = t.squadre.find((s) => s.lato === 'nostra');
  const avv = t.squadre.find((s) => s.lato === 'avversaria');
  const eNostra = nostra ? controllaSquadra(nostra, t.tipo_foglio, t.numero_set) : ['squadra Smapiù Arena non trovata nel foglio'];
  const eAvv = avv ? controllaSquadra(avv, t.tipo_foglio, t.numero_set) : [];
  const parti = [
    eNostra.length ? `Smapiù Arena: ${eNostra.join('; ')}` : null,
    eAvv.length ? `${avv?.nome || 'Avversaria'}: ${eAvv.join('; ')}` : null,
  ].filter(Boolean);
  return { nostra: eNostra, avversaria: eAvv, messaggio: parti.length ? `${parti.join('. ')}: ${CONSIGLIO}.` : null };
}
