import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { demoData, emptyData, loadAll, subscribeMatches, type AppData } from '@/lib/api';
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

  const matches = useMemo(
    () => data.matches.map((m) => (m.demoLive ? { ...m, status: demoLive ? ('live' as const) : ('scheduled' as const) } : m)),
    [data.matches, demoLive],
  );
  const liveMatch = useMemo(() => {
    const real = matches.find((m) => m.status === 'live');
    if (real) return real;
    // Con Supabase la partita demo non è nel calendario: se l'anteprima è attiva si usa quella dei dati demo
    if (demoLive && data.source === 'supabase') {
      const demo = mock.matches.find((m) => m.demoLive);
      if (demo) return { ...demo, status: 'live' as const };
    }
    return null;
  }, [matches, demoLive, data.source]);

  const value = useMemo<DataCtx>(
    () => ({ ...data, matches, liveMatch, loading, error, refresh }),
    [data, matches, liveMatch, loading, error, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData deve stare dentro DataProvider');
  return v;
}
