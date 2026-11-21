import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchAgentScores, type AgentScore } from '@/lib/api';

/** Con almeno una gara in corso si rilegge spesso, altrimenti più di rado (per accorgersi dell'apertura della giornata) */
const LIVE_MS = 20_000;
const IDLE_MS = 60_000;

/**
 * Punteggi dell'agente livescore (live, in programma e finali della giornata in corso) per la striscia BORDO CAMPO.
 * Si aggiorna solo con la schermata a fuoco e l'app in primo piano.
 * Ogni lettura, riuscita o no, programma la successiva: un errore di rete non ferma gli aggiornamenti.
 */
export function useAgentScores() {
  const [scores, setScores] = useState<AgentScore[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focused = useRef(false);
  // ritmo dell'ultima lettura riuscita: dopo un errore si riprova con lo stesso
  const live = useRef(false);

  const load = useCallback(async function load() {
    try {
      const next = await fetchAgentScores();
      live.current = next.some((s) => s.status === 'live');
      setScores(next);
    } catch {
      // errore di rete: tengo gli ultimi punteggi, riprovo al prossimo giro
    }
    // un solo giro in attesa anche se due letture si accavallano (fuoco + ritorno in primo piano)
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!focused.current || AppState.currentState !== 'active') return;
    timer.current = setTimeout(load, live.current ? LIVE_MS : IDLE_MS);
  }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    load();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') load(); });
    return () => {
      focused.current = false;
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [load]));

  return { scores, refresh: load };
}
