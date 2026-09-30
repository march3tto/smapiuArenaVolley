// Diretta: carica partita live + cronaca e si aggiorna in tempo reale.
// Richiede che eventi_live, set_partita e partite siano nella pubblicazione
// "supabase_realtime" (Database > Publications).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEventiLive, getPartitaLive } from '../lib/api';
import type { EventoLive, Partita } from '../lib/types';

export function useLivePartita() {
  const [partita, setPartita] = useState<Partita | null>(null);
  const [eventi, setEventi] = useState<EventoLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const channel = supabase.channel(`live-${partitaId ?? 'nessuna'}`);

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
  }, [partita?.id, ricarica]);

  const ultimo = eventi[0];
  const setCorrente = partita?.set_partita?.find((s) => !s.completato);

  return {
    partita,
    eventi,
    punteggio: {
      set: setCorrente?.numero_set ?? ultimo?.numero_set ?? null,
      nostri: setCorrente?.punti_nostri ?? ultimo?.punteggio_nostro ?? 0,
      avversario: setCorrente?.punti_avversario ?? ultimo?.punteggio_avversario ?? 0,
    },
    loading,
    error,
    ricarica,
  };
}
