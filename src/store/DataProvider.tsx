import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { demoData, emptyData, fetchStandings, loadAll, resubscribable, subscribeMatches, subscribeStandings, type AppData } from '@/lib/api';
import { demoMode } from '@/lib/supabase';
import * as mock from '@/data/mock';
import { useApp } from './AppProvider';
import type { Match } from '@/types';

interface DataCtx extends AppData {
  loading: boolean;
  error: string | null;
  /** Ricarica tutti i dati; prima riapre i canali Realtime caduti (es. app tornata dal background su iOS) */
  refresh: () => Promise<void>;
  /** Partita con status 'live' (la home mostra la diretta solo se esiste) */
  liveMatch: Match | null;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { demoLive } = useApp();
  const [data, setData] = useState<AppData>(() => (demoMode ? demoData() : emptyData()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // riapre i canali Realtime di partite e classifica se non sono più SUBSCRIBED
  const ensureRealtime = useRef<() => void>(() => {});

  const refresh = useCallback(async () => {
    ensureRealtime.current();
    setLoading(true);
    try {
      setData(await loadAll());
      setError(null);
    } catch (e) {
      // con Supabase si tengono gli ultimi dati caricati e si mostra l'errore
      setError(e instanceof Error ? e.message : 'Errore di caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- caricamento dati da Supabase all'apertura (lo stato si aggiorna a fetch finita)
    refresh();
    // Se una partita cambia stato (es. diventa 'live') si ricarica in automatico
    const matches = resubscribable(() => subscribeMatches(() => {
      refresh();
    }));
    // La classifica la ricalcola il database a ogni risultato: si ricarica solo lei
    const standings = resubscribable(() => subscribeStandings(() => {
      fetchStandings()
        .then((rows) => {
          if (rows) setData((d) => ({ ...d, standings: rows }));
        })
        .catch((e) => console.warn('Classifica non aggiornata', e));
    }));
    ensureRealtime.current = () => {
      matches.ensure();
      standings.ensure();
    };
    return () => {
      ensureRealtime.current = () => {};
      matches.close();
      standings.close();
    };
  }, [refresh]);

  const liveMatch = useMemo(() => {
    const real = data.matches.find((m) => m.status === 'live');
    if (real) return real;
    // La partita demo non è nel calendario: se l'anteprima è attiva diventa la diretta
    return demoLive ? { ...mock.demoMatch, status: 'live' as const } : null;
  }, [data.matches, demoLive]);

  const value = useMemo<DataCtx>(
    () => ({ ...data, liveMatch, loading, error, refresh }),
    [data, liveMatch, loading, error, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData deve stare dentro DataProvider');
  return v;
}
