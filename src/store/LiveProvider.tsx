import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { fetchLive, subscribeLive } from '@/lib/api';
import { demoLive as demoInitial } from '@/data/mock';
import { isSideSwitch, matchWinner, setWinner, setsWon, standingPoints } from '@/lib/volley';
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
  /** Il punteggio si può cambiare a mano solo nella partita demo, finché non è finita */
  canScore: boolean;
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

/** Applica un punto secondo il regolamento: chiusura set, cambio campo nel tie-break, fine partita */
function scorePoint(s: LiveState, side: 'us' | 'opp'): LiveState {
  if (s.finished) return s;
  const before = { our: s.our, opp: s.opp };
  const after = { our: s.our + (side === 'us' ? 1 : 0), opp: s.opp + (side === 'opp' ? 1 : 0) };
  const stamp = Date.now();
  const event = (text: string, who: 'us' | 'opp', n = 0): LiveEvent => ({ id: `sim-${stamp}-${n}`, set: s.set, our: after.our, opp: after.opp, side: who, text });
  const events: LiveEvent[] = [event(side === 'us' ? US_LINES[Math.floor(Math.random() * US_LINES.length)] : 'Punto per le avversarie.', side)];

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
  const [state, setState] = useState<LiveState>(EMPTY);
  const [lastPoint, setLastPoint] = useState<LiveCtx['lastPoint']>(null);
  const isDemo = !!liveMatch?.demoLive;

  // Carica lo stato della partita live (demo o Supabase Realtime)
  useEffect(() => {
    if (!liveMatch) {
      setState(EMPTY);
      return;
    }
    if (liveMatch.demoLive) {
      setState(DEMO_START());
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
    load();
    const unsub = subscribeLive(
      liveMatch.id,
      (e) =>
        setState((s) => {
          const side: 'us' | 'opp' = e.set === s.set && e.opp > s.opp ? 'opp' : 'us';
          const ev = { ...e, side };
          setLastPoint({ side, key: Date.now() });
          return { ...s, set: e.set, our: e.our, opp: e.opp, serving: side, events: [ev, ...s.events] };
        }),
      () => load(),
    );
    return () => {
      active = false;
      unsub();
    };
  }, [liveMatch]);

  const addPoint = useCallback((side: 'us' | 'opp') => {
    setState((s) => scorePoint(s, side));
    setLastPoint({ side, key: Date.now() });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

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
      canScore: isDemo && !state.finished,
      addPoint,
      resetDemo,
    };
  }, [state, liveMatch, lastPoint, isDemo, addPoint, resetDemo]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLive deve stare dentro LiveProvider');
  return v;
}
