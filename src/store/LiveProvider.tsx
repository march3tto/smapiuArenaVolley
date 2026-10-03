import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { fetchLive, subscribeLive } from '@/lib/api';
import { demoLive as demoInitial } from '@/data/mock';
import { useData } from './DataProvider';
import type { LiveEvent, Match, SetScore } from '@/types';

interface LiveState {
  set: number;
  our: number;
  opp: number;
  history: SetScore[];
  events: LiveEvent[];
  serving: 'us' | 'opp';
}

interface LiveCtx extends LiveState {
  match: Match | null;
  ourSets: number;
  oppSets: number;
  /** Ultimo punto: serve alle animazioni (+1) */
  lastPoint: { side: 'us' | 'opp'; key: number } | null;
  /** Simulazione disponibile solo con i dati demo */
  canSimulate: boolean;
  auto: boolean;
  toggleAuto: () => void;
  addPoint: (side: 'us' | 'opp') => void;
}

const Ctx = createContext<LiveCtx | null>(null);

const US_LINES = [
  'Schiacciata vincente in parallela per Nicole Tellaroli!',
  'Muro invalicabile di Anna Riccato!',
  'Ace in battuta per Beatrice Giroldi!',
  'Attacco preciso di Francesca Trevisan!',
  'Pallonetto di Aurora Piron, punto Smapiù!',
];

const EMPTY: LiveState = { set: 1, our: 0, opp: 0, history: [], events: [], serving: 'us' };

function setsWon(history: SetScore[]) {
  return history.reduce((acc, s) => ({ our: acc.our + (s.our > s.opp ? 1 : 0), opp: acc.opp + (s.opp > s.our ? 1 : 0) }), { our: 0, opp: 0 });
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { liveMatch } = useData();
  const [state, setState] = useState<LiveState>(EMPTY);
  const [lastPoint, setLastPoint] = useState<LiveCtx['lastPoint']>(null);
  const [auto, setAuto] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDemo = !!liveMatch?.demoLive;

  // Carica lo stato della partita live (demo o Supabase Realtime)
  useEffect(() => {
    setAuto(false);
    if (!liveMatch) {
      setState(EMPTY);
      return;
    }
    if (liveMatch.demoLive) {
      setState({ set: demoInitial.set, our: demoInitial.our, opp: demoInitial.opp, history: demoInitial.history, events: demoInitial.events, serving: 'us' });
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
    setState((s) => {
      const our = s.our + (side === 'us' ? 1 : 0);
      const opp = s.opp + (side === 'opp' ? 1 : 0);
      const text = side === 'us' ? US_LINES[Math.floor(Math.random() * US_LINES.length)] : 'Punto per le avversarie.';
      const ev: LiveEvent = { id: `sim-${Date.now()}`, set: s.set, our, opp, side, text };
      return { ...s, our, opp, serving: side, events: [ev, ...s.events].slice(0, 80) };
    });
    setLastPoint({ side, key: Date.now() });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const toggleAuto = useCallback(() => setAuto((a) => !a), []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (auto && isDemo) timer.current = setInterval(() => addPoint(Math.random() > 0.4 ? 'us' : 'opp'), 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [auto, isDemo, addPoint]);

  const value = useMemo<LiveCtx>(() => {
    const won = setsWon(state.history);
    return {
      ...state,
      match: liveMatch,
      ourSets: won.our,
      oppSets: won.opp,
      lastPoint,
      canSimulate: isDemo,
      auto,
      toggleAuto,
      addPoint,
    };
  }, [state, liveMatch, lastPoint, isDemo, auto, toggleAuto, addPoint]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLive deve stare dentro LiveProvider');
  return v;
}
