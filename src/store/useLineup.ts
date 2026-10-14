import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteLineupPlayer, fetchLineup, insertLineup, newId, setLineupLibero, setLineupZone, subscribeLineup } from '@/lib/api';
import { demoOpponentLineup } from '@/data/mock';
import { useApp } from './AppProvider';
import { useData } from './DataProvider';
import type { LineupPlayer, Match, Player, PlayerRole } from '@/types';

export const STARTERS = 6;

export interface Lineup {
  us: LineupPlayer[];
  opp: LineupPlayer[];
  loading: boolean;
  /** Admin nella diretta vera, o chiunque nella partita demo (solo in locale) */
  canEdit: boolean;
  error: string | null;
  /** Titolare ↔ panchina; la titolare prende la prima zona libera (I-VI) */
  toggleStarter: (p: LineupPlayer) => void;
  /** Libero ↔ panchina: solo dalla panchina e con ruolo Libero, il nuovo libero sostituisce il precedente */
  toggleLibero: (p: LineupPlayer) => void;
  addOpponent: (p: { number: number | null; name: string; role: PlayerRole | null }) => void;
  remove: (p: LineupPlayer) => void;
}

/** Nostra formazione dalla rosa della prima squadra, ordinata per numero di maglia */
function fromRoster(players: Player[]): LineupPlayer[] {
  return [...players]
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99))
    .map((p, i) => ({
      id: newId(), team: 'us', playerId: p.id, number: p.number ?? null, name: `${p.firstName} ${p.lastName}`.trim(),
      role: p.role, isCaptain: !!p.isCaptain, zone: null, isLibero: false, order: i,
    }));
}

/** Avversarie della partita demo, ogni volta con id nuovi */
const demoOpp = (): LineupPlayer[] => demoOpponentLineup.map((p, i) => ({ ...p, id: newId(), team: 'opp', playerId: null, isLibero: p.role === 'libero', order: i }));

const byOrder = (a: LineupPlayer, b: LineupPlayer) => a.order - b.order || (a.number ?? 99) - (b.number ?? 99);

export function useLineup(match: Match | null): Lineup {
  const { user } = useApp();
  const { players } = useData();
  const isDemo = !!match?.demoLive;
  const live = !!match && !isDemo;
  const canEdit = !!match && (isDemo || user?.role === 'admin');

  const [rows, setRows] = useState<LineupPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // salvataggi in coda, nell'ordine dei tocchi
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const reload = useRef<() => void>(() => {});
  const seeded = useRef<string | null>(null);

  const matchId = match?.id;
  useEffect(() => {
    setError(null);
    if (!matchId) {
      setRows([]);
      return;
    }
    if (!live) {
      // nella demo le avversarie partono già schierate; le modifiche restano solo in locale
      setRows(demoOpp());
      reload.current = () => {};
      return;
    }
    let active = true;
    const load = async () => {
      const r = await fetchLineup(matchId);
      if (!active) return;
      setLoading(false);
      if (r) setRows(r);
    };
    reload.current = load;
    setLoading(true);
    load();
    const unsub = subscribeLineup(matchId, () => {
      if (pending.current === 0) load();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [matchId, live]);

  const save = useCallback((op: () => Promise<void>) => {
    if (!live) return;
    setError(null);
    pending.current += 1;
    queue.current = queue.current
      .then(op)
      .catch((err: unknown) => {
        console.warn('Salvataggio formazione non riuscito', err);
        setError('Formazione non salvata: controlla la connessione e riprova.');
      })
      .finally(() => {
        pending.current -= 1;
        // a coda finita si riallinea con il database (anche dopo un errore)
        if (pending.current === 0) reload.current();
      });
  }, [live]);

  const savedUs = rows.some((p) => p.team === 'us');
  // Nostra squadra in automatico: finché non è salvata si mostra la rosa; l'admin la salva alla prima apertura
  const roster = useMemo(() => fromRoster(players), [players]);
  const [demoUs, setDemoUs] = useState<LineupPlayer[] | null>(null);
  useEffect(() => setDemoUs(null), [matchId]);
  const us = live ? (savedUs ? rows.filter((p) => p.team === 'us').sort(byOrder) : roster) : (demoUs ?? roster);
  const opp = rows.filter((p) => p.team === 'opp').sort(byOrder);

  useEffect(() => {
    if (!live || !canEdit || loading || savedUs || !roster.length || !matchId || seeded.current === matchId) return;
    seeded.current = matchId;
    setRows((r) => [...r, ...roster]);
    save(() => insertLineup(matchId, roster));
  }, [live, canEdit, loading, savedUs, roster, matchId, save]);

  // modifica locale: nella demo la nostra squadra vive in demoUs, il resto in rows
  const patch = useCallback((team: 'us' | 'opp', fn: (list: LineupPlayer[]) => LineupPlayer[]) => {
    if (!live && team === 'us') {
      setDemoUs((d) => fn(d ?? roster));
      return;
    }
    setRows((r) => [...r.filter((p) => p.team !== team), ...fn(r.filter((p) => p.team === team))]);
  }, [live, roster]);

  const toggleStarter = useCallback((p: LineupPlayer) => {
    if (!canEdit || !matchId) return;
    const team = p.team === 'us' ? us : opp;
    let zone: number | null = null;
    if (p.zone == null) {
      if (p.role === 'libero' || p.isLibero) {
        setError('Il libero non può far parte dello Starting Six.');
        return;
      }
      const used = new Set(team.map((x) => x.zone).filter((z): z is number => z != null));
      zone = [1, 2, 3, 4, 5, 6].find((z) => !used.has(z)) ?? null;
      if (zone == null) {
        setError('Starting Six già completo: togli prima una titolare.');
        return;
      }
    }
    setError(null);
    patch(p.team, (list) => list.map((x) => (x.id === p.id ? { ...x, zone } : x)));
    save(() => setLineupZone(p.id, zone));
  }, [canEdit, matchId, us, opp, patch, save]);

  const toggleLibero = useCallback((p: LineupPlayer) => {
    if (!canEdit || !matchId) return;
    if (!p.isLibero && p.role !== 'libero') {
      setError('Come libero si possono scegliere solo le giocatrici con ruolo Libero.');
      return;
    }
    if (p.zone != null) {
      setError('Il libero si sceglie dalla panchina: togli prima la giocatrice dallo Starting Six.');
      return;
    }
    const on = !p.isLibero;
    setError(null);
    patch(p.team, (list) => list.map((x) => ({ ...x, isLibero: on && x.id === p.id })));
    save(() => setLineupLibero(matchId, p.team, on ? p.id : null));
  }, [canEdit, matchId, patch, save]);

  const addOpponent = useCallback((n: { number: number | null; name: string; role: PlayerRole | null }) => {
    if (!canEdit || !matchId) return;
    const name = n.name.trim();
    if (!name) return;
    if (n.number != null && opp.some((x) => x.number === n.number)) {
      setError(`Il numero ${n.number} è già in formazione.`);
      return;
    }
    const p: LineupPlayer = {
      id: newId(), team: 'opp', playerId: null, number: n.number, name, role: n.role, isCaptain: false, zone: null, isLibero: false,
      order: opp.reduce((m, x) => Math.max(m, x.order + 1), 0),
    };
    setError(null);
    patch('opp', (list) => [...list, p]);
    save(() => insertLineup(matchId, [p]));
  }, [canEdit, matchId, opp, patch, save]);

  const remove = useCallback((p: LineupPlayer) => {
    if (!canEdit) return;
    patch(p.team, (list) => list.filter((x) => x.id !== p.id));
    save(() => deleteLineupPlayer(p.id));
  }, [canEdit, patch, save]);

  return { us, opp, loading, canEdit, error, toggleStarter, toggleLibero, addOpponent, remove };
}
