import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { LIVE_EVENTS_MAX, demoRevision, fetchLive, newId, pushLiveNote, resubscribable, setFirstServe, subscribeDemo, subscribeLive, type DemoChannel, withAction } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { demoLive as demoInitial } from '@/data/mock';
import { firstServer, pointWinners, rotationState } from '@/lib/rotations';
import { isSideSwitch, matchWinner, setWinner, setsWon, standingPoints } from '@/lib/volley';
import { useApp } from './AppProvider';
import { useData } from './DataProvider';
import type { LiveEvent, Match, PlayerRole, PointAction, PointDetail, PointPhase, SetScore } from '@/types';

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
  /** Punteggio automatico: letture del punteggio del set in corso (con chi ha fatto punto), per rotazioni e servizio */
  readings: LiveEvent[];
}

interface LiveCtx extends LiveState {
  match: Match | null;
  ourSets: number;
  oppSets: number;
  /** Ultimo punto: serve alle animazioni (+1) */
  lastPoint: { side: 'us' | 'opp'; key: number } | null;
  /** Punti in classifica a partita finita */
  standing: { our: number; opp: number } | null;
  /** Il + si usa nella partita demo (con Supabase solo l'admin) e da un admin nella diretta vera, finché non è finita */
  canScore: boolean;
  /** Diretta vera (casa e trasferta): il punteggio lo scrive l'agente a3live, il + aggiunge solo cronaca senza punti */
  autoScore: boolean;
  /** La partita demo si può far ripartire da questo dispositivo */
  canResetDemo: boolean;
  /** Diretta vera con admin: la cronaca scritta qui viene salvata su Supabase */
  scoringLive: boolean;
  /** Ultimo salvataggio non riuscito (il punteggio torna quello del database) */
  saveError: string | null;
  /** Rotazioni di ciascuna squadra nel set in corso, rispetto allo Starting Six */
  rotation: { us: number; opp: number };
  /** detail: azione, posizione, fase, giocatrice e frase scelta; chi fa punto lo dice side, non l'AI */
  addPoint: (side: 'us' | 'opp', detail?: PointDetail) => void;
  /** Riga di cronaca senza punto (dettata a voce, timeout, cambio), col punteggio attuale; side: squadra a cui si riferisce. false se non inserita */
  addNote: (text: string, side?: 'us' | 'opp') => boolean;
  /** Timeout in corso su questo dispositivo: fino a until non si inseriscono punti né altre righe di cronaca */
  timeout: { side: 'us' | 'opp'; until: number } | null;
  /** Riga di cronaca del timeout e blocco di TIMEOUT_MS */
  callTimeout: (text: string, side: 'us' | 'opp') => void;
  /** Riporta la partita demo allo stato iniziale */
  resetDemo: () => void;
  /** Sullo 0-0 del set: si può scegliere chi serve per primo */
  canChooseServe: boolean;
  /** Sceglie la squadra al servizio sullo 0-0 del set in corso */
  chooseServe: (side: 'us' | 'opp') => void;
  /** Rilegge punteggio, set e cronaca; prima riapre il canale Realtime se non è più SUBSCRIBED */
  refresh: () => Promise<void>;
}

const Ctx = createContext<LiveCtx | null>(null);

/** Durata di un timeout: 30 secondi */
export const TIMEOUT_MS = 30000;

export type { PointAction, PointDetail, PointPhase };

/** Azioni di gioco con la fase proposta di default (modificabile nel riquadro del punto) */
export const POINT_ACTIONS: { value: PointAction; label: string; phase: PointPhase }[] = [
  { value: 'schiacciata', label: 'Schiacciata', phase: 'attacco' },
  { value: 'parallela', label: 'Parallela', phase: 'attacco' },
  { value: 'mani_fuori', label: 'Mani fuori', phase: 'attacco' },
  { value: 'pipe', label: 'Pipe', phase: 'attacco' },
  { value: 'primo_tempo', label: 'Primo tempo', phase: 'attacco' },
  { value: 'fast', label: 'Fast', phase: 'attacco' },
  { value: 'pallonetto', label: 'Pallonetto', phase: 'attacco' },
  { value: 'ace', label: 'Ace', phase: 'attacco' },
  { value: 'muro', label: 'Muro', phase: 'difesa' },
  { value: 'battuta_out', label: 'Battuta out', phase: 'difesa' },
  { value: 'errore_avversario', label: 'Errore avv.', phase: 'difesa' },
];
/** Azioni riservate a un ruolo: la fast la esegue solo la centrale */
export const ACTION_ROLE: Partial<Record<PointAction, PlayerRole>> = { fast: 'centrale' };
export const PHASE_LABEL: Record<PointPhase, string> = { attacco: 'Attacco', difesa: 'Difesa' };
export const ZONE_LABEL = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

const ACTION_TEXT: Record<PointAction, string> = {
  schiacciata: 'Schiacciata vincente', pipe: 'Pipe vincente', primo_tempo: 'Primo tempo vincente', pallonetto: 'Pallonetto vincente',
  parallela: 'Parallela vincente', mani_fuori: 'Mani fuori', fast: 'Fast vincente',
  ace: 'Ace in battuta', muro: 'Muro vincente', battuta_out: 'Battuta out', errore_avversario: 'Errore avversario', punto: 'Punto',
};
export const actionLabel = (a: PointAction) => POINT_ACTIONS.find((x) => x.value === a)?.label ?? ACTION_TEXT[a];

/** Nomi delle due squadre, solo nella partita demo tra due avversarie (altrimenti la cronaca parla di Smapiù) */
export type TeamNames = { us: string; opp: string };

/** Nomi da usare in cronaca: solo se nella partita non gioca Smapiù */
export const teamNames = (m: Match | null): TeamNames | undefined => (m?.usName ? { us: m.usName, opp: m.opponent } : undefined);

/** Frase predefinita (senza AI): sempre disponibile come alternativa */
export function detailLine(side: 'us' | 'opp', d: PointDetail, names?: TeamNames): string {
  const where = d.zone ? ` da zona ${ZONE_LABEL[d.zone]}` : '';
  const what = `${ACTION_TEXT[d.action]}${d.player ? ` di ${d.player.name}` : ''}${where}`;
  // solo punto: conta la giocatrice, nessun fondamentale da raccontare
  if (d.action === 'punto') {
    const by = d.player ? ` firmato da ${d.player.name}` : '';
    if (names) return `Punto ${names[side]}${by}!`;
    return side === 'us' ? `Punto Smapiù${by}!` : `Punto per le avversarie${by}.`;
  }
  if (names) {
    const other = side === 'us' ? names.opp : names.us;
    if (d.action === 'battuta_out') return `Battuta out ${other}, punto ${names[side]}!`;
    return d.action === 'errore_avversario' ? `Errore ${other}, punto ${names[side]}!` : `${what}, punto ${names[side]}!`;
  }
  if (d.action === 'battuta_out') return side === 'us' ? 'Battuta out delle avversarie, punto Smapiù!' : 'Battuta out Smapiù, punto per le avversarie.';
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

const EMPTY: LiveState = { set: 1, our: 0, opp: 0, history: [], events: [], serving: 'us', finished: false, firstServe: {}, readings: [] };

const DEMO_START = (): LiveState => ({
  set: demoInitial.set, our: demoInitial.our, opp: demoInitial.opp, history: demoInitial.history, events: demoInitial.events,
  serving: demoInitial.events[0]?.side ?? 'us', finished: false, firstServe: {}, readings: [],
});

/** Punti giocati in tutta la partita */
const played = (x: LiveState) => x.history.reduce((n, h) => n + h.our + h.opp, 0) + (x.finished ? 0 : x.our + x.opp);

/**
 * Punteggio automatico: chi ha fatto l'ultimo punto tra due letture del database.
 * null se non è cambiato niente o se l'agente ha scritto più punti insieme (di entrambe le squadre).
 */
function lastScorer(prev: LiveState, next: LiveState): 'us' | 'opp' | null {
  if (played(next) <= played(prev)) return null;
  if (next.set === prev.set && !next.finished) {
    const us = next.our - prev.our;
    const opp = next.opp - prev.opp;
    return us > 0 && opp === 0 ? 'us' : opp > 0 && us === 0 ? 'opp' : null;
  }
  // set chiuso: l'ultimo punto è di chi l'ha vinto (se il nuovo set non è già cominciato)
  const closed = next.history[next.history.length - 1];
  if (!closed || (!next.finished && next.our + next.opp > 0)) return null;
  return closed.our > closed.opp ? 'us' : 'opp';
}

/**
 * Partita demo: applica un punto secondo il regolamento (chiusura set, cambio campo nel tie-break, fine partita).
 * Nelle partite vere il punteggio lo scrive l'agente a3live.
 * names: partita senza Smapiù, la cronaca usa i nomi delle due squadre.
 */
function scorePoint(s: LiveState, side: 'us' | 'opp', detail?: PointDetail, names?: TeamNames): LiveState {
  if (s.finished) return s;
  const before = { our: s.our, opp: s.opp };
  const after = { our: s.our + (side === 'us' ? 1 : 0), opp: s.opp + (side === 'opp' ? 1 : 0) };
  const stamp = Date.now();
  const event = (text: string, who: 'us' | 'opp', n = 0): LiveEvent => ({ id: `sim-${stamp}-${n}`, set: s.set, our: after.our, opp: after.opp, side: who, text });
  const usLine = US_LINES[Math.floor(Math.random() * US_LINES.length)];
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
 * ruota di una posizione. Al primo scambio serve la squadra scelta sullo 0-0, altrimenti quella dell'alternanza FIPAV.
 */
function setRotations(events: readonly LiveEvent[], set: number, chosen: LiveState['firstServe']): { us: number; opp: number } {
  const r = rotationState(firstServer(set, chosen), pointWinners(events, set));
  return { us: r.usRotations, opp: r.oppRotations };
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { liveMatch } = useData();
  const { user } = useApp();
  const [state, setState] = useState<LiveState>(EMPTY);
  const [lastPoint, setLastPoint] = useState<LiveCtx['lastPoint']>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [timeout, setTimeoutLock] = useState<LiveCtx['timeout']>(null);
  // fine del timeout letta da addPoint e addNote (il blocco vale anche prima che lo stato si aggiorni)
  const timeoutUntil = useRef(0);
  useEffect(() => {
    if (!timeout) return;
    const t = setTimeout(() => setTimeoutLock(null), Math.max(0, timeout.until - Date.now()));
    return () => clearTimeout(t);
  }, [timeout]);
  const isDemo = !!liveMatch?.demoLive;
  // partite vere: punteggio dall'agente a3live (set_partita), in casa come in trasferta
  const autoScore = !!liveMatch && !isDemo;
  const scoringLive = autoScore && user?.role === 'admin';
  // con Supabase la demo è condivisa tra i dispositivi e la segna solo l'admin; senza, ognuno la prova per conto suo
  const scoringDemo = isDemo && (!hasSupabase || user?.role === 'admin');
  // demo condivisa: versione dello stato e canale broadcast
  const demoRev = useRef(0);
  const demoChannel = useRef<DemoChannel<LiveState> | null>(null);
  // stato corrente letto in addPoint (serve per sapere cosa salvare)
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  // salvataggi in coda (uno alla volta, nell'ordine dei tocchi) e quanti sono ancora in corso
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const failed = useRef(false);
  const reload = useRef<() => Promise<void>>(async () => {});
  // riapre il canale Realtime della diretta se è caduto (es. iOS in background)
  const ensureRealtime = useRef<() => void>(() => {});

  // Carica lo stato della partita live (demo o Supabase Realtime).
  // Dipende solo dall'id: la partita viene ricreata a ogni ricaricamento dei dati e non deve far ripartire la diretta.
  const liveId = liveMatch?.id ?? null;
  useEffect(() => {
    if (!liveId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset insieme alle sottoscrizioni Realtime della partita (stesso effetto)
      setState(EMPTY);
      reload.current = async () => {};
      return;
    }
    if (isDemo) {
      setState(DEMO_START());
      // demo: lo stato arriva dal canale broadcast, che realtime-js ricollega da solo (non va chiuso, vedi subscribeDemo)
      reload.current = async () => {};
      demoRev.current = 0;
      if (!hasSupabase) return;
      const ch = subscribeDemo<LiveState>(
        'live',
        liveId,
        (rev, next) => {
          if (rev <= demoRev.current) return;
          demoRev.current = rev;
          // animazione +1 solo se è stato giocato un punto in più
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
    // la prima lettura non ha un punteggio precedente con cui confrontarsi
    let first = true;
    // il punteggio è quello di set_partita (lo scrive l'agente): le righe di cronaca non lo cambiano
    const load = async () => {
      const snap = await fetchLive(liveId);
      if (!snap || !active) return;
      const done = snap.sets.filter((_, i) => snap.completed[i]);
      const current = snap.sets.find((_, i) => !snap.completed[i]) ?? { our: 0, opp: 0 };
      const prev = stateRef.current;
      const next: LiveState = {
        set: done.length + 1,
        our: current.our,
        opp: current.opp,
        history: done,
        events: snap.events,
        serving: prev.serving,
        finished: matchWinner(setsWon(done)) !== null,
        firstServe: snap.firstServe,
        readings: first ? [] : prev.readings,
      };
      const scorer = first ? null : lastScorer(prev, next);
      if (scorer) {
        next.serving = scorer;
        setLastPoint({ side: scorer, key: Date.now() });
      } else if (first) next.serving = snap.events[0]?.side ?? 'us';
      // letture del set in corso: con l'agente ogni 30" sono quasi sempre un punto alla volta
      if (next.set !== prev.set || first) next.readings = [];
      if (!first && next.set === prev.set && played(next) > played(prev)) {
        next.readings = [{ id: `lettura-${Date.now()}`, set: next.set, our: next.our, opp: next.opp, side: scorer ?? next.serving, text: '' }, ...next.readings];
      }
      first = false;
      stateRef.current = next;
      setState(next);
    };
    reload.current = load;
    load();
    const sub = resubscribable(() => subscribeLive(
      liveId,
      (e) =>
        setState((s) => {
          // eco delle righe scritte da questo dispositivo: sono già in lista
          if (s.events.some((x) => x.id === e.id)) return s;
          // solo cronaca: il punteggio arriva da set_partita
          return { ...s, events: [e, ...s.events].slice(0, LIVE_EVENTS_MAX) };
        }),
      // punteggio scritto dall'agente (o primo servizio scelto dall'admin)
      () => load(),
      // l'azione arriva subito dopo il suo evento: si aggancia alla riga di cronaca
      (a) => setState((s) => (s.events.some((x) => x.id === a.eventId && !x.detail)
        ? { ...s, events: s.events.map((x) => (x.id === a.eventId ? withAction(x, a) : x)) }
        : s)),
    ));
    ensureRealtime.current = sub.ensure;
    return () => {
      active = false;
      ensureRealtime.current = () => {};
      reload.current = async () => {};
      sub.close();
    };
  }, [liveId, isDemo]);

  // prima il canale (così non si perde niente di quello che arriva durante la lettura), poi la lettura dal database
  const refresh = useCallback(async () => {
    ensureRealtime.current();
    await reload.current();
  }, []);

  /** Demo condivisa: manda il nuovo stato agli altri dispositivi */
  const shareDemo = useCallback((next: LiveState) => {
    if (!demoChannel.current) return;
    demoRev.current = demoRevision(demoRev.current);
    demoChannel.current.send(demoRev.current, next);
  }, []);

  const addPoint = useCallback((side: 'us' | 'opp', detail?: PointDetail) => {
    // partite vere: i punti li assegna solo l'agente
    if (autoScore || Date.now() < timeoutUntil.current) return;
    const prev = stateRef.current;
    const next = scorePoint(prev, side, detail, teamNames(liveMatch));
    if (next === prev) return;
    stateRef.current = next;
    setState(next);
    setLastPoint({ side, key: Date.now() });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isDemo) shareDemo(next);
  }, [isDemo, autoScore, liveMatch, shareDemo]);

  const addNote = useCallback((text: string, side?: 'us' | 'opp') => {
    const s = stateRef.current;
    if (!(scoringDemo || scoringLive) || !text.trim() || Date.now() < timeoutUntil.current) return false;
    // stesso punteggio dell'ultima riga: rotazioni, grafico e statistiche la saltano
    const note: LiveEvent = { id: scoringLive ? newId() : `sim-${Date.now()}-n`, set: s.set, our: s.our, opp: s.opp, side: side ?? s.events[0]?.side ?? s.serving, text: text.trim() };
    const next = { ...s, events: [note, ...s.events].slice(0, LIVE_EVENTS_MAX) };
    stateRef.current = next;
    setState(next);
    if (isDemo) shareDemo(next);
    if (!scoringLive || !liveMatch) return true;
    setSaveError(null);
    pending.current += 1;
    saveQueue.current = saveQueue.current
      .then(() => pushLiveNote(liveMatch.id, note))
      .catch((err: unknown) => {
        console.warn('Cronaca non salvata', err);
        failed.current = true;
        setSaveError('Cronaca non salvata: controlla la connessione e riprova.');
      })
      .finally(() => {
        pending.current -= 1;
        if (pending.current === 0 && failed.current) {
          failed.current = false;
          reload.current();
        }
      });
    return true;
  }, [isDemo, scoringDemo, scoringLive, liveMatch, shareDemo]);

  const callTimeout = useCallback((text: string, side: 'us' | 'opp') => {
    if (!addNote(text, side)) return;
    const until = Date.now() + TIMEOUT_MS;
    timeoutUntil.current = until;
    setTimeoutLock({ side, until });
  }, [addNote]);

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
    // sullo 0-0 serve la squadra scelta; senza scelta l'alternanza FIPAV (dal 2° set chi aveva ricevuto per prima nel precedente)
    const atStart = state.our + state.opp === 0 && !state.finished;
    return {
      ...state,
      serving: atStart ? firstServer(state.set, state.firstServe) : state.serving,
      match: liveMatch,
      ourSets: won.our,
      oppSets: won.opp,
      lastPoint,
      standing: state.finished ? standingPoints(won) : null,
      canScore: (scoringDemo || scoringLive) && !state.finished,
      autoScore,
      canResetDemo: scoringDemo,
      scoringLive,
      saveError,
      // punteggio automatico: contano le letture del punteggio, poi la cronaca col punteggio del momento
      rotation: setRotations(autoScore ? [...state.readings, ...state.events] : state.events, state.set, state.firstServe),
      addPoint,
      addNote,
      timeout,
      callTimeout,
      resetDemo,
      canChooseServe: (scoringDemo || scoringLive) && atStart,
      chooseServe,
      refresh,
    };
  }, [state, liveMatch, lastPoint, scoringDemo, autoScore, scoringLive, saveError, addPoint, addNote, timeout, callTimeout, resetDemo, chooseServe, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLive(): LiveCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLive deve stare dentro LiveProvider');
  return v;
}
