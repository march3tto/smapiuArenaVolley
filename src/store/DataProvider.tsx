import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { demoData, emptyData, fetchStandings, loadAll, subscribeMatches, subscribeStandings, type AppData } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import * as mock from '@/data/mock';
import { useApp } from './AppProvider';
import type { Match } from '@/types';

interface DataCtx extends AppData {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Partita con status 'live' (la home mostra la diretta solo se esiste) */
  liveMatch: Match | null;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { demoLive } = useApp();
  const [data, setData] = useState<AppData>(() => (hasSupabase ? emptyData() : demoData()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
    refresh();
    // Se una partita cambia stato (es. diventa 'live') si ricarica in automatico
    return subscribeMatches(() => {
      refresh();
    });
  }, [refresh]);

  // La classifica la ricalcola il database a ogni risultato: si ricarica solo lei
  useEffect(
    () =>
      subscribeStandings(() => {
        fetchStandings()
          .then((standings) => {
            if (standings) setData((d) => ({ ...d, standings }));
          })
          .catch((e) => console.warn('Classifica non aggiornata', e));
      }),
    [],
  );

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
