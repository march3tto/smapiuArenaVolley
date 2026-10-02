// Diretta: carica partita live + cronaca e si aggiorna in tempo reale.
// Richiede che eventi_live, set_partita e partite siano nella pubblicazione
// "supabase_realtime" (Database > Publications).
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEventiLive, getPartitaLive } from '../lib/api';
import type { EventoLive, Partita } from '../lib/types';

export type Battuta = 'noi' | 'avversario';

// nella pallavolo batte chi ha vinto l'ultimo punto: cerca nella cronaca del set
// l'ultimo evento che ha cambiato il punteggio (timeout e cambi non lo cambiano)
function chiBatte(eventi: EventoLive[], set: number): Battuta | null {
  const delSet = eventi.filter((e) => e.numero_set === set);
  for (let i = 0; i < delSet.length; i++) {
    const cur = delSet[i];
    const prev = delSet[i + 1] ?? { punteggio_nostro: 0, punteggio_avversario: 0 };
    if (cur.punteggio_nostro > prev.punteggio_nostro) return 'noi';
    if (cur.punteggio_avversario > prev.punteggio_avversario) return 'avversario';
  }
  return null;
}

export function useLivePartita() {
  const [partita, setPartita] = useState<Partita | null>(null);
  const [eventi, setEventi] = useState<EventoLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Home e Live usano entrambe questo hook: supabase.channel() restituisce il canale
  // esistente se il nome coincide, e aggiungere listener a un canale già sottoscritto
  // lancia un errore. Un suffisso per istanza tiene separati i canali.
  const istanza = useRef(Math.random().toString(36).slice(2, 10)).current;

  const ricarica = useCallback(async () => {
    try {
      const p = await getPartitaLive();
      setPartita(p);
      setEventi(p ? await getEventiLive(p.id) : []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { ricarica(); }, [ricarica]);

  useEffect(() => {
    const partitaId = partita?.id;
    const channel = supabase.channel(`live-${partitaId ?? 'nessuna'}-${istanza}`);

    // cambio di stato di qualunque partita (es. una diventa 'live' o 'conclusa')
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'partite' }, () => ricarica());

    if (partitaId) {
      channel
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'eventi_live', filter: `partita_id=eq.${partitaId}` },
          (payload) => setEventi((prev) => [payload.new as EventoLive, ...prev]))
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'set_partita', filter: `partita_id=eq.${partitaId}` },
          () => ricarica());
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [partita?.id, ricarica, istanza]);

  const ultimo = eventi[0];
  const setCorrente = partita?.set_partita?.find((s) => !s.completato);
  // la cronaca viene inserita punto per punto, set_partita a volte resta indietro:
  // se l'ultimo evento è del set in corso, il suo punteggio è il più aggiornato
  const fonte =
    ultimo && (!setCorrente || ultimo.numero_set === setCorrente.numero_set)
      ? { set: ultimo.numero_set, nostri: ultimo.punteggio_nostro, avversario: ultimo.punteggio_avversario }
      : setCorrente
        ? { set: setCorrente.numero_set, nostri: setCorrente.punti_nostri, avversario: setCorrente.punti_avversario }
        : null;

  return {
    partita,
    eventi,
    punteggio: fonte ?? { set: null, nostri: 0, avversario: 0 },
    battuta: fonte?.set ? chiBatte(eventi, fonte.set) : null,
    loading,
    error,
    ricarica,
  };
}
