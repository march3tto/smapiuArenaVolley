import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { fetchLive, newId, pushLivePoint, subscribeLive } from '@/lib/api';
import { demoLive as demoInitial } from '@/data/mock';
import { isSideSwitch, matchWinner, setWinner, setsWon, standingPoints } from '@/lib/volley';
import { useApp } from './AppProvider';
import { useData } from './DataProvider';
import type { LiveEvent, Match, SetScore } from '@/types';

interface LiveState {
  set: number;
  our: number;
  opp: number;
  history: SetScore[];
  events: LiveEvent[];
  serving: 'us' | 'opp';
  /** Partita chiusa: una squadra ha vinto 3 set (history contiene tutti i set) */
  finished: boolean;
}

interface LiveCtx extends LiveState {
  match: Match | null;
  ourSets: number;
  oppSets: number;
  /** Ultimo punto: serve alle animazioni (+1) */
  lastPoint: { side: 'us' | 'opp'; key: number } | null;
  /** Punti in classifica a partita finita */
  standing: { our: number; opp: number } | null;
  /** Il punteggio si cambia a mano nella partita demo, o da un admin nella diretta vera, finché non è finita */
  canScore: boolean;
  /** Diretta vera: i punti assegnati qui vengono salvati su Supabase */
  scoringLive: boolean;
  /** Ultimo salvataggio non riuscito (il punteggio torna quello del database) */
  saveError: string | null;
  addPoint: (side: 'us' | 'opp') => void;
  /** Riporta la partita demo allo stato iniziale */
  resetDemo: () => void;
}

const Ctx = createContext<LiveCtx | null>(null);

const US_LINES = [
  'Schiacciata vincente in parallela per Nicole Tellaroli!',
  'Muro invalicabile di Anna Riccato!',
  'Ace in battuta per Beatrice Giroldi!',
  'Attacco preciso di Francesca Trevisan!',
  'Pallonetto di Aurora Piron, punto Smapiù!',
];

const EMPTY: LiveState = { set: 1, our: 0, opp: 0, history: [], events: [], serving: 'us', finished: false };

const DEMO_START = (): LiveState => ({
  set: demoInitial.set, our: demoInitial.our, opp: demoInitial.opp, history: demoInitial.history, events: demoInitial.events, serving: 'us', finished: false,
});

/**
 * Applica un punto secondo il regolamento: chiusura set, cambio campo nel tie-break, fine partita.
 * real: diretta vera, cronaca neutra (niente azioni inventate) e id uuid salvabili nel database.
 */
function scorePoint(s: LiveState, side: 'us' | 'opp', real = false): LiveState {
  if (s.finished) return s;
  const before = { our: s.our, opp: s.opp };
  const after = { our: s.our + (side === 'us' ? 1 : 0), opp: s.opp + (side === 'opp' ? 1 : 0) };
  const stamp = Date.now();
  const event = (text: string, who: 'us' | 'opp', n = 0): LiveEvent => ({ id: real ? newId() : `sim-${stamp}-${n}`, set: s.set, our: after.our, opp: after.opp, side: who, text });
  const usLine = real ? 'Punto Smapiù!' : US_LINES[Math.floor(Math.random() * US_LINES.length)];
  const events: LiveEvent[] = [event(side === 'us' ? usLine : 'Punto per le avversarie.', side)];

  if (isSideSwitch(s.set, before, after)) events.unshift(event(`Cambio campo sull'${after.our}–${after.opp}.`, side, 1));

  const setWon = setWinner(s.set, after);
  if (!setWon) return { ...s, ...after, serving: side, events: [...events, ...s.events].slice(0, 80) };

  const history = [...s.history, after];
  const won = setsWon(history);
  const winner = matchWinner(won);
  events.unshift(event(winner
    ? `Fine partita: ${won.our}–${won.opp}${winner === 'us' ? ', vittoria Smapiù!' : '.'}`
    : `Fine ${s.set}° set: ${after.our}–${after.opp}.`, setWon, 2));
  return winner
    ? { ...s, ...after, history, serving: side, finished: true, events: [...events, ...s.events].slice(0, 80) }
    : { ...s, set: s.set + 1, our: 0, opp: 0, history, serving: side, events: [...events, ...s.events].slice(0, 80) };
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { liveMatch } = useData();
  const { user } = useApp();
  const [state, setState] = useState<LiveState>(EMPTY);
  const [lastPoint, setLastPoint] = useState<LiveCtx['lastPoint']>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isDemo = !!liveMatch?.demoLive;
  const scoringLive = !!liveMatch && !isDemo && user?.role === 'admin';
  // stato corrente letto in addPoint (serve per sapere cosa salvare)
  const stateRef = useRef(state);
  stateRef.current = state;
  // salvataggi in coda (uno alla volta, nell'ordine dei tocchi) e quanti sono ancora in corso
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const failed = useRef(false);
  const reload = useRef<() => void>(() => {});

  // Carica lo stato della partita live (demo o Supabase Realtime)
  useEffect(() => {
    if (!liveMatch) {
      setState(EMPTY);
      reload.current = () => {};
      return;
    }
    if (liveMatch.demoLive) {
      setState(DEMO_START());
      reload.current = () => {};
      return;
    }
    let active = true;
    const load = async () => {
      const snap = await fetchLive(liveMatch.id);
      if (!snap || !active) return;
      const done = snap.sets.filter((_, i) => snap.completed[i]);
      const current = snap.sets.find((_, i) => !snap.completed[i]) ?? { our: 0, opp: 0 };
      const last = snap.events[0];
      setState({
        set: done.length + 1,
        our: last && last.set === done.length + 1 ? last.our : current.our,
        opp: last && last.set === done.length + 1 ? last.opp : current.opp,
        history: done,
        events: snap.events,
        serving: last?.side ?? 'us',
        finished: matchWinner(setsWon(done)) !== null,
      });
    };
    reload.current = load;
    load();
    const unsub = subscribeLive(
      liveMatch.id,
      (e) =>
        setState((s) => {
          // eco dei punti assegnati da questo dispositivo: sono già in lista
          if (s.events.some((x) => x.id === e.id)) return s;
          const side: 'us' | 'opp' = e.set === s.set && e.opp > s.opp ? 'opp' : 'us';
          const ev = { ...e, side };
          setLastPoint({ side, key: Date.now() });
          return { ...s, set: e.set, our: e.our, opp: e.opp, serving: side, events: [ev, ...s.events] };
        }),
      // durante i propri salvataggi il database è indietro rispetto allo stato locale
      () => {
        if (pending.current === 0) load();
      },
    );
    return () => {
      active = false;
      unsub();
    };
  }, [liveMatch]);

  const addPoint = useCallback((side: 'us' | 'opp') => {
    const prev = stateRef.current;
    const next = scorePoint(prev, side, scoringLive);
    if (next === prev) return;
    stateRef.current = next;
    setState(next);
    setLastPoint({ side, key: Date.now() });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!scoringLive || !liveMatch) return;

    // eventi nuovi in testa alla lista; se il set si è chiuso si salva il punteggio finale del set
    const added = prev.events.length ? next.events.slice(0, next.events.indexOf(prev.events[0])) : next.events;
    const closed = next.history.length > prev.history.length;
    const point = {
      set: prev.set,
      score: closed ? next.history[next.history.length - 1] : { our: next.our, opp: next.opp },
      completed: closed,
      events: added,
      final: next.finished ? setsWon(next.history) : null,
    };
    setSaveError(null);
    pending.current += 1;
    saveQueue.current = saveQueue.current
      .then(() => pushLivePoint(liveMatch.id, point))
      .catch((err: unknown) => {
        console.warn('Salvataggio punto non riuscito', err);
        failed.current = true;
        setSaveError('Punto non salvato: controlla la connessione e riprova.');
      })
      .finally(() => {
        pending.current -= 1;
        // in caso di errore, finiti i salvataggi in coda, si torna allo stato del database
        if (pending.current === 0 && failed.current) {
          failed.current = false;
          reload.current();
        }
      });
  }, [scoringLive, liveMatch]);

  const resetDemo = useCallback(() => setState(DEMO_START()), []);

  const value = useMemo<LiveCtx>(() => {
    const won = setsWon(state.history);
    return {
      ...state,
      match: liveMatch,
      ourSets: won.our,
      oppSets: won.opp,
      lastPoint,
      standing: state.finished ? standingPoints(won) : null,
      canScore: (isDemo || scoringLive) && !state.finished,
      scoringLive,
      saveError,
      addPoint,
      resetDemo,
    };
  }, [state, liveMatch, lastPoint, isDemo, scoringLive, saveError, addPoint, resetDemo]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLive deve stare dentro LiveProvider');
  return v;
}
