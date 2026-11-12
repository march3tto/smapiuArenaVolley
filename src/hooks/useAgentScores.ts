import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchAgentScores, type AgentScore } from '@/lib/api';

/** Con almeno una gara in corso si rilegge spesso, altrimenti di rado */
const LIVE_MS = 30_000;
const IDLE_MS = 120_000;

/**
 * Punteggi dell'agente livescore (live e finali delle ultime ore) per la striscia ULTIME NOTIZIE.
 * Si aggiorna solo con la schermata a fuoco e l'app in primo piano.
 */
export function useAgentScores() {
  const [scores, setScores] = useState<AgentScore[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focused = useRef(false);

  const load = useCallback(async () => {
    try {
      setScores(await fetchAgentScores());
    } catch {
      // errore di rete: tengo gli ultimi punteggi, riprovo al prossimo giro
    }
  }, []);

  const schedule = useCallback((live: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    if (!focused.current || AppState.currentState !== 'active') return;
    timer.current = setTimeout(async () => {
      await load();
    }, live ? LIVE_MS : IDLE_MS);
  }, [load]);

  // ogni nuovo risultato programma il giro successivo
  useEffect(() => {
    schedule(scores.some((s) => s.status === 'live'));
  }, [scores, schedule]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    load();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') load(); });
    return () => {
      focused.current = false;
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]));

  return { scores, refresh: load };
}
