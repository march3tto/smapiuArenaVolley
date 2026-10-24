import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { LIVE_EVENTS_MAX, demoRevision, fetchLive, newId, pushLivePoint, setFirstServe, subscribeDemo, subscribeLive, type DemoChannel, withAction } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { demoLive as demoInitial } from '@/data/mock';
import { isSideSwitch, matchWinner, setWinner, setsWon, standingPoints } from '@/lib/volley';
import { useApp } from './AppProvider';
import { useData } from './DataProvider';
import type { LiveEvent, Match, PointAction, PointDetail, PointPhase, SetScore } from '@/types';

interface LiveState {
  set: number;
  our: number;
  opp: number;
  history: SetScore[];
  events: LiveEvent[];
  serving: 'us' | 'opp';
  /** Partita chiusa: una squadra ha vinto 3 set (history contiene tutti i set) */
  finished: boolean;
  /** Squadra al servizio sullo 0-0, per set, se scelta dall'admin toccando lo stemma */
  firstServe: Record<number, 'us' | 'opp'>;
}

interface LiveCtx extends LiveState {
  match: Match | null;
  ourSets: number;
  oppSets: number;
  /** Ultimo punto: serve alle animazioni (+1) */
  lastPoint: { side: 'us' | 'opp'; key: number } | null;
  /** Punti in classifica a partita finita */
  standing: { our: number; opp: number } | null;
  /** Il punteggio si cambia a mano nella partita demo (con Supabase solo l'admin), o da un admin nella diretta vera, finché non è finita */
  canScore: boolean;
  /** La partita demo si può far ripartire da questo dispositivo */
  canResetDemo: boolean;
  /** Diretta vera: i punti assegnati qui vengono salvati su Supabase */
  scoringLive: boolean;
  /** Ultimo salvataggio non riuscito (il punteggio torna quello del database) */
  saveError: string | null;
  /** Rotazioni di ciascuna squadra nel set in corso, rispetto allo Starting Six */
  rotation: { us: number; opp: number };
  /** detail: azione, posizione, fase, giocatrice e frase scelta; chi fa punto lo dice side, non l'AI */
  addPoint: (side: 'us' | 'opp', detail?: PointDetail) => void;
  /** Riporta la partita demo allo stato iniziale */
  resetDemo: () => void;
  /** Sullo 0-0 del set: si può scegliere chi serve per primo */
  canChooseServe: boolean;
  /** Sceglie la squadra al servizio sullo 0-0 del set in corso */
  chooseServe: (side: 'us' | 'opp') => void;
}

const Ctx = createContext<LiveCtx | null>(null);

export type { PointAction, PointDetail, PointPhase };

/** Azioni di gioco con la fase proposta di default (modificabile nel riquadro del punto) */
export const POINT_ACTIONS: { value: PointAction; label: string; phase: PointPhase }[] = [
  { value: 'schiacciata', label: 'Schiacciata', phase: 'attacco' },
  { value: 'pipe', label: 'Pipe', phase: 'attacco' },
  { value: 'primo_tempo', label: 'Primo tempo', phase: 'attacco' },
  { value: 'pallonetto', label: 'Pallonetto', phase: 'attacco' },
  { value: 'ace', label: 'Ace', phase: 'attacco' },
  { value: 'muro', label: 'Muro', phase: 'difesa' },
  { value: 'errore_avversario', label: 'Errore avv.', phase: 'difesa' },
];
export const PHASE_LABEL: Record<PointPhase, string> = { attacco: 'Attacco', difesa: 'Difesa' };
export const ZONE_LABEL = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

const ACTION_TEXT: Record<PointAction, string> = {
  schiacciata: 'Schiacciata vincente', pipe: 'Pipe vincente', primo_tempo: 'Primo tempo vincente', pallonetto: 'Pallonetto vincente',
  ace: 'Ace in battuta', muro: 'Muro vincente', errore_avversario: 'Errore avversario',
};
export const actionLabel = (a: PointAction) => POINT_ACTIONS.find((x) => x.value === a)?.label ?? a;

/** Nomi delle due squadre, solo nella partita demo tra due avversarie (altrimenti la cronaca parla di Smapiù) */
export type TeamNames = { us: string; opp: string };

/** Nomi da usare in cronaca: solo se nella partita non gioca Smapiù */
export const teamNames = (m: Match | null): TeamNames | undefined => (m?.usName ? { us: m.usName, opp: m.opponent } : undefined);

/** Frase predefinita (senza AI): sempre disponibile come alternativa */
export function detailLine(side: 'us' | 'opp', d: PointDetail, names?: TeamNames): string {
  const where = d.zone ? ` da zona ${ZONE_LABEL[d.zone]}` : '';
  const what = `${ACTION_TEXT[d.action]}${d.player ? ` di ${d.player.name}` : ''}${where}`;
  if (names) {
    const other = side === 'us' ? names.opp : names.us;
    return d.action === 'errore_avversario' ? `Errore ${other}, punto ${names[side]}!` : `${what}, punto ${names[side]}!`;
  }
  if (d.action === 'errore_avversario') return side === 'us' ? 'Errore delle avversarie, punto Smapiù!' : 'Errore Smapiù, punto per le avversarie.';
  return side === 'us' ? `${what}, punto Smapiù!` : `Punto per le avversarie: ${what.charAt(0).toLowerCase()}${what.slice(1)}.`;
}

const US_LINES = [
  'Schiacciata vincente in parallela per Nicole Tellaroli!',
  'Muro invalicabile di Anna Riccato!',
  'Ace in battuta per Beatrice Giroldi!',
  'Attacco preciso di Francesca Trevisan!',
  'Pallonetto di Aurora Piron, punto Smapiù!',
];

const EMPTY: LiveState = { set: 1, our: 0, opp: 0, history: [], events: [], serving: 'us', finished: false, firstServe: {} };

const DEMO_START = (): LiveState => ({
  set: demoInitial.set, our: demoInitial.our, opp: demoInitial.opp, history: demoInitial.history, events: demoInitial.events,
  serving: demoInitial.events[0]?.side ?? 'us', finished: false, firstServe: {},
});

/**
 * Applica un punto secondo il regolamento: chiusura set, cambio campo nel tie-break, fine partita.
 * real: diretta vera, cronaca neutra (niente azioni inventate) e id uuid salvabili nel database.
 * names: partita senza Smapiù, la cronaca usa i nomi delle due squadre.
 */
function scorePoint(s: LiveState, side: 'us' | 'opp', real = false, detail?: PointDetail, names?: TeamNames): LiveState {
  if (s.finished) return s;
  const before = { our: s.our, opp: s.opp };
  const after = { our: s.our + (side === 'us' ? 1 : 0), opp: s.opp + (side === 'opp' ? 1 : 0) };
  const stamp = Date.now();
  const event = (text: string, who: 'us' | 'opp', n = 0): LiveEvent => ({ id: real ? newId() : `sim-${stamp}-${n}`, set: s.set, our: after.our, opp: after.opp, side: who, text });
  const usLine = real ? 'Punto Smapiù!' : US_LINES[Math.floor(Math.random() * US_LINES.length)];
  const plain = names ? `Punto ${names[side]}!` : side === 'us' ? usLine : 'Punto per le avversarie.';
  const line = detail ? detail.text?.trim() || detailLine(side, detail, names) : plain;
  const events: LiveEvent[] = [{ ...event(line, side), detail: detail ? { ...detail, text: line } : null }];

  if (isSideSwitch(s.set, before, after)) events.unshift(event(`Cambio campo sull'${after.our}–${after.opp}.`, side, 1));

  const setWon = setWinner(s.set, after);
  if (!setWon) return { ...s, ...after, serving: side, events: [...events, ...s.events].slice(0, LIVE_EVENTS_MAX) };

  const history = [...s.history, after];
  const won = setsWon(history);
  const winner = matchWinner(won);
  events.unshift(event(winner
    ? `Fine partita: ${won.our}–${won.opp}${names ? `, vittoria ${names[winner]}!` : winner === 'us' ? ', vittoria Smapiù!' : '.'}`
    : `Fine ${s.set}° set: ${after.our}–${after.opp}.`, setWon, 2));
  return winner
    ? { ...s, ...after, history, serving: side, finished: true, events: [...events, ...s.events].slice(0, LIVE_EVENTS_MAX) }
    : { ...s, set: s.set + 1, our: 0, opp: 0, history, serving: side, events: [...events, ...s.events].slice(0, LIVE_EVENTS_MAX) };
}

/**
 * Rotazioni del set in corso: si parte dallo Starting Six e la squadra che fa punto in ricezione (cambio palla)
 * ruota di una posizione. Al primo scambio serve la squadra scelta sullo 0-0 (first), altrimenti chi ha chiuso il set precedente (1° set: noi).
 */
/** Al servizio sullo 0-0 se non scelto: chi ha chiuso il set precedente (1° set: noi) */
const firstServer = (events: LiveEvent[], set: number): 'us' | 'opp' => events.find((e) => e.set === set - 1)?.side ?? 'us';

function setRotations(events: LiveEvent[], set: number, first?: 'us' | 'opp'): { us: number; opp: number } {
  const rot = { us: 0, opp: 0 };
  let server: 'us' | 'opp' = first ?? firstServer(events, set);
  let total = 0;
  // dal più vecchio; cambio campo e fine set ripetono il punteggio del punto e si saltano
  for (const e of [...events].reverse()) {
    if (e.set !== set || e.our + e.opp <= total) continue;
    // se nella cronaca mancano dei punti non si sa chi serviva: niente rotazione
    if (e.our + e.opp === total + 1 && e.side !== server) rot[e.side] += 1;
    server = e.side;
    total = e.our + e.opp;
  }
  return rot;
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { liveMatch } = useData();
  const { user } = useApp();
  const [state, setState] = useState<LiveState>(EMPTY);
  const [lastPoint, setLastPoint] = useState<LiveCtx['lastPoint']>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isDemo = !!liveMatch?.demoLive;
  const scoringLive = !!liveMatch && !isDemo && user?.role === 'admin';
  // con Supabase la demo è condivisa tra i dispositivi e la segna solo l'admin; senza, ognuno la prova per conto suo
  const scoringDemo = isDemo && (!hasSupabase || user?.role === 'admin');
  // demo condivisa: versione dello stato e canale broadcast
  const demoRev = useRef(0);
  const demoChannel = useRef<DemoChannel<LiveState> | null>(null);
  // stato corrente letto in addPoint (serve per sapere cosa salvare)
  const stateRef = useRef(state);
  stateRef.current = state;
  // salvataggi in coda (uno alla volta, nell'ordine dei tocchi) e quanti sono ancora in corso
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const failed = useRef(false);
  const reload = useRef<() => void>(() => {});

  // Carica lo stato della partita live (demo o Supabase Realtime).
  // Dipende solo dall'id: la partita viene ricreata a ogni ricaricamento dei dati e non deve far ripartire la diretta.
  const liveId = liveMatch?.id ?? null;
  useEffect(() => {
    if (!liveId) {
      setState(EMPTY);
      reload.current = () => {};
      return;
    }
    if (isDemo) {
      setState(DEMO_START());
      reload.current = () => {};
      demoRev.current = 0;
      if (!hasSupabase) return;
      const ch = subscribeDemo<LiveState>(
        'live',
        liveId,
        (rev, next) => {
          if (rev <= demoRev.current) return;
          demoRev.current = rev;
          // animazione +1 solo se è stato giocato un punto in più
          const played = (x: LiveState) => x.history.reduce((n, h) => n + h.our + h.opp, 0) + (x.finished ? 0 : x.our + x.opp);
          if (played(next) > played(stateRef.current) && next.events[0]) setLastPoint({ side: next.events[0].side, key: Date.now() });
          stateRef.current = next;
          setState(next);
        },
        // chi entra chiede lo stato: risponde chi ne ha già uno condiviso
        () => {
          if (demoRev.current > 0) ch.send(demoRev.current, stateRef.current);
        },
      );
      demoChannel.current = ch;
      return () => {
        ch.close();
        demoChannel.current = null;
      };
    }
    let active = true;
    const load = async () => {
      const snap = await fetchLive(liveId);
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
        firstServe: snap.firstServe,
      });
    };
    reload.current = load;
    load();
    const unsub = subscribeLive(
      liveId,
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
      // l'azione arriva subito dopo il suo evento: si aggancia alla riga di cronaca
      (a) => setState((s) => (s.events.some((x) => x.id === a.eventId && !x.detail)
        ? { ...s, events: s.events.map((x) => (x.id === a.eventId ? withAction(x, a) : x)) }
        : s)),
    );
    return () => {
      active = false;
      unsub();
    };
  }, [liveId, isDemo]);

  /** Demo condivisa: manda il nuovo stato agli altri dispositivi */
  const shareDemo = useCallback((next: LiveState) => {
    if (!demoChannel.current) return;
    demoRev.current = demoRevision(demoRev.current);
    demoChannel.current.send(demoRev.current, next);
  }, []);

  const addPoint = useCallback((side: 'us' | 'opp', detail?: PointDetail) => {
    const prev = stateRef.current;
    const next = scorePoint(prev, side, scoringLive, detail, teamNames(liveMatch));
    if (next === prev) return;
    stateRef.current = next;
    setState(next);
    setLastPoint({ side, key: Date.now() });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isDemo) shareDemo(next);
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
  }, [isDemo, scoringLive, liveMatch, shareDemo]);

  const resetDemo = useCallback(() => {
    if (!scoringDemo) return;
    const next = DEMO_START();
    stateRef.current = next;
    setState(next);
    shareDemo(next);
  }, [scoringDemo, shareDemo]);

  const chooseServe = useCallback((side: 'us' | 'opp') => {
    const s = stateRef.current;
    if (s.finished || s.our + s.opp > 0 || !(scoringDemo || scoringLive)) return;
    const next = { ...s, firstServe: { ...s.firstServe, [s.set]: side } };
    stateRef.current = next;
    setState(next);
    if (isDemo) shareDemo(next);
    if (!scoringLive || !liveMatch) return;
    setSaveError(null);
    pending.current += 1;
    saveQueue.current = saveQueue.current
      .then(() => setFirstServe(liveMatch.id, s.set, side))
      .catch((err: unknown) => {
        console.warn('Servizio non salvato', err);
        failed.current = true;
        setSaveError('Servizio non salvato: controlla la connessione e riprova.');
      })
      .finally(() => {
        pending.current -= 1;
        if (pending.current === 0 && failed.current) {
          failed.current = false;
          reload.current();
        }
      });
  }, [isDemo, scoringDemo, scoringLive, liveMatch, shareDemo]);

  const value = useMemo<LiveCtx>(() => {
    const won = setsWon(state.history);
    const first = state.firstServe[state.set];
    // sullo 0-0 serve la squadra scelta; senza scelta la regola predefinita (dal 2° set chi ha chiuso il precedente)
    const atStart = state.our + state.opp === 0 && !state.finished;
    return {
      ...state,
      serving: atStart ? first ?? firstServer(state.events, state.set) : state.serving,
      match: liveMatch,
      ourSets: won.our,
      oppSets: won.opp,
      lastPoint,
      standing: state.finished ? standingPoints(won) : null,
      canScore: (scoringDemo || scoringLive) && !state.finished,
      canResetDemo: scoringDemo,
      scoringLive,
      saveError,
      rotation: setRotations(state.events, state.set, first),
      addPoint,
      resetDemo,
      canChooseServe: (scoringDemo || scoringLive) && atStart,
      chooseServe,
    };
  }, [state, liveMatch, lastPoint, scoringDemo, scoringLive, saveError, addPoint, resetDemo, chooseServe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLive deve stare dentro LiveProvider');
  return v;
}
