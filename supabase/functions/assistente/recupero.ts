// Recupero dei blocchi di conoscenza (FAQ + testi delle fonti) per l'assistente.
// Oggi: full-text italiano con la RPC cerca_conoscenza. Per gli embedding basta un altro Recuperatore
// (es. pgvector, o ibrido full-text + vettori) con la stessa interfaccia: index.ts non cambia.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface Blocco {
  titolo: string;
  testo: string;
  url: string | null;
  /** 'faq' | 'sito' | 'pdf' | 'manuale' */
  tipo: string;
  punteggio: number;
}

export interface Recuperatore {
  recupera(domanda: string, limite?: number): Promise<Blocco[]>;
}

const MAX_CARATTERI_BLOCCO = 2500;
const MAX_CARATTERI_CONTESTO = 9000;

type RigaRpc = { titolo: string; testo: string; url_origine: string | null; tipo: string; rank: number };

export function recuperatoreFullText(db: SupabaseClient): Recuperatore {
  return {
    async recupera(domanda, limite = 4) {
      const { data, error } = await db.rpc('cerca_conoscenza', { query: domanda.slice(0, 500), limite });
      if (error) throw error;
      return ((data ?? []) as RigaRpc[]).map((r) => ({
        titolo: r.titolo,
        testo: r.testo.length > MAX_CARATTERI_BLOCCO ? `${r.testo.slice(0, MAX_CARATTERI_BLOCCO)}…` : r.testo,
        url: r.url_origine,
        tipo: r.tipo,
        punteggio: r.rank,
      }));
    },
  };
}

/**
 * Testo da cercare: l'ultima domanda; se è molto corta ("e l'under 18?") si aggiunge la domanda precedente,
 * altrimenti le domande di seguito non troverebbero nulla.
 */
export function testoRicerca(domandeUtente: string[]): string {
  const ultima = domandeUtente[domandeUtente.length - 1] ?? '';
  const precedente = domandeUtente[domandeUtente.length - 2];
  return ultima.trim().split(/\s+/).length < 5 && precedente ? `${precedente} ${ultima}` : ultima;
}

/** Blocchi numerati per il prompt, entro un budget di caratteri. Stringa vuota se non c'è nulla. */
export function formattaContesto(blocchi: Blocco[]): string {
  let out = '';
  blocchi.forEach((b, i) => {
    const pezzo = `[${i + 1}] (${b.tipo === 'faq' ? 'FAQ' : `fonte: ${b.tipo}`}) ${b.titolo}\n${b.testo}\n${b.url ? `URL: ${b.url}` : 'URL: nessuno'}\n\n`;
    if (out.length + pezzo.length <= MAX_CARATTERI_CONTESTO) out += pezzo;
  });
  return out.trim();
}
