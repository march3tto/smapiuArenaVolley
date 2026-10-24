import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteLineupPlayer, fetchLineup, fetchTeamRoster, insertLineup, newId, setLineupCaptain, setLineupLibero, setLineupZone, subscribeLineup, updateLineupPlayer } from '@/lib/api';
import { demoHomeLineup, demoOpponentLineup } from '@/data/mock';
import { useApp } from './AppProvider';
import { useData } from './DataProvider';
import type { LineupPlayer, Match, Player, PlayerRole } from '@/types';

export const STARTERS = 6;

export interface NewPlayer {
  number: number | null;
  name: string;
  role: PlayerRole | null;
  playerId?: string | null;
  isCaptain?: boolean;
}

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
  /** Capitana ↔ nessuna: una per squadra, la nuova sostituisce la precedente */
  toggleCaptain: (p: LineupPlayer) => void;
  /** Una o più giocatrici a referto per una squadra; playerId: giocatrice della rosa (tabella giocatrici), senza è inserita a mano */
  addPlayers: (team: 'us' | 'opp', p: NewPlayer | NewPlayer[]) => void;
  /** Corregge numero, nome e ruolo di una giocatrice a referto; false se non salvabile (errore in error) */
  update: (p: LineupPlayer, f: { number: number | null; name: string; role: PlayerRole | null }) => boolean;
  remove: (p: LineupPlayer) => void;
}

/** Formazione dalla rosa di una squadra (la nostra prima squadra o l'avversaria), ordinata per numero di maglia */
function fromRoster(players: Player[], team: 'us' | 'opp'): LineupPlayer[] {
  return [...players]
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99))
    .map((p, i) => ({
      id: newId(), team, playerId: p.id, number: p.number ?? null, name: `${p.firstName} ${p.lastName}`.trim(),
      role: p.role, isCaptain: !!p.isCaptain, zone: null, isLibero: false, order: i,
    }));
}

/** Squadre della partita demo, ogni volta con id nuovi; il libero è uno solo, il primo della lista */
const demoTeam = (list: typeof demoOpponentLineup, team: 'us' | 'opp'): LineupPlayer[] => {
  const libero = list.findIndex((p) => p.role === 'libero');
  return list.map((p, i) => ({ ...p, id: newId(), team, playerId: null, isLibero: i === libero, order: i }));
};

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
  // squadre già salvate in automatico dalla rosa, per partita: `${matchId}:us` / `${matchId}:opp`
  const seeded = useRef(new Set<string>());

  const matchId = match?.id;
  useEffect(() => {
    setError(null);
    if (!matchId) {
      setRows([]);
      return;
    }
    if (!live) {
      // nella demo le avversarie partono già schierate; le modifiche restano solo in locale
      setRows(demoTeam(demoOpponentLineup, 'opp'));
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

  // Rosa della squadra avversaria (tabella giocatrici), legata alla squadra della partita
  const oppTeamId = live ? match?.opponentTeamId ?? null : null;
  const [oppPlayers, setOppPlayers] = useState<{ teamId: string; players: Player[] } | null>(null);
  useEffect(() => {
    if (!oppTeamId) return;
    let active = true;
    fetchTeamRoster(oppTeamId)
      .then((p) => active && setOppPlayers({ teamId: oppTeamId, players: p }))
      .catch((err: unknown) => console.warn('Rosa avversaria non caricata', err));
    return () => {
      active = false;
    };
  }, [oppTeamId]);

  const savedUs = rows.some((p) => p.team === 'us');
  const savedOpp = rows.some((p) => p.team === 'opp');
  // Squadre in automatico: finché non sono salvate si mostra la rosa; l'admin le salva alla prima apertura
  const roster = useMemo(() => fromRoster(players, 'us'), [players]);
  const oppRoster = useMemo(
    () => (oppPlayers && oppPlayers.teamId === oppTeamId ? fromRoster(oppPlayers.players, 'opp') : []),
    [oppPlayers, oppTeamId],
  );
  const [demoUs, setDemoUs] = useState<LineupPlayer[] | null>(null);
  useEffect(() => setDemoUs(null), [matchId]);
  // nella demo tra due avversarie la squadra di casa parte già schierata, altrimenti si usa la nostra rosa
  const otherTeam = isDemo && !!match?.usName;
  const demoHome = useMemo(() => (otherTeam ? demoTeam(demoHomeLineup, 'us') : null), [otherTeam]);
  const demoBase = demoHome ?? roster;
  const us = live ? (savedUs ? rows.filter((p) => p.team === 'us').sort(byOrder) : roster) : (demoUs ?? demoBase);
  const opp = live && !savedOpp ? oppRoster : rows.filter((p) => p.team === 'opp').sort(byOrder);

  useEffect(() => {
    if (!live || !canEdit || loading || !matchId) return;
    const seed = ([['us', savedUs, roster], ['opp', savedOpp, oppRoster]] as const)
      .filter(([team, saved, list]) => !saved && list.length && !seeded.current.has(`${matchId}:${team}`));
    if (!seed.length) return;
    const add = seed.flatMap(([team, , list]) => {
      seeded.current.add(`${matchId}:${team}`);
      return list;
    });
    setRows((r) => [...r, ...add]);
    save(() => insertLineup(matchId, add));
  }, [live, canEdit, loading, savedUs, savedOpp, roster, oppRoster, matchId, save]);

  // modifica locale: nella demo la nostra squadra vive in demoUs, il resto in rows
  const patch = useCallback((team: 'us' | 'opp', fn: (list: LineupPlayer[]) => LineupPlayer[]) => {
    if (!live && team === 'us') {
      setDemoUs((d) => fn(d ?? demoBase));
      return;
    }
    setRows((r) => [...r.filter((p) => p.team !== team), ...fn(r.filter((p) => p.team === team))]);
  }, [live, demoBase]);

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

  const toggleCaptain = useCallback((p: LineupPlayer) => {
    if (!canEdit || !matchId) return;
    const on = !p.isCaptain;
    setError(null);
    patch(p.team, (list) => list.map((x) => ({ ...x, isCaptain: on && x.id === p.id })));
    save(() => setLineupCaptain(matchId, p.team, on ? p.id : null));
  }, [canEdit, matchId, patch, save]);

  const addPlayers = useCallback((team: 'us' | 'opp', input: NewPlayer | NewPlayer[]) => {
    if (!canEdit || !matchId) return;
    const list = [...(team === 'us' ? us : opp)];
    const added: LineupPlayer[] = [];
    let err: string | null = null;
    for (const n of Array.isArray(input) ? input : [input]) {
      const name = n.name.trim();
      if (!name || (n.playerId && list.some((x) => x.playerId === n.playerId))) continue;
      if (n.number != null && list.some((x) => x.number === n.number)) {
        err = `Il numero ${n.number} è già in formazione.`;
        continue;
      }
      const p: LineupPlayer = {
        id: newId(), team, playerId: n.playerId ?? null, number: n.number, name, role: n.role, isCaptain: !!n.isCaptain, zone: null, isLibero: false,
        order: list.reduce((m, x) => Math.max(m, x.order + 1), 0),
      };
      list.push(p);
      added.push(p);
    }
    setError(err);
    if (!added.length) return;
    patch(team, (l) => [...l, ...added]);
    save(() => insertLineup(matchId, added));
  }, [canEdit, matchId, us, opp, patch, save]);

  const update = useCallback((p: LineupPlayer, f: { number: number | null; name: string; role: PlayerRole | null }) => {
    if (!canEdit) return false;
    const name = f.name.trim();
    if (!name) return false;
    const team = p.team === 'us' ? us : opp;
    if (f.number != null && team.some((x) => x.id !== p.id && x.number === f.number)) {
      setError(`Il numero ${f.number} è già in formazione.`);
      return false;
    }
    if (f.role === 'libero' && p.zone != null) {
      setError('Una giocatrice nello Starting Six non può avere ruolo Libero: toglila prima dal campo.');
      return false;
    }
    // cambiando ruolo il libero scelto resta tale solo se è ancora Libero
    const isLibero = p.isLibero && f.role === 'libero';
    setError(null);
    patch(p.team, (list) => list.map((x) => (x.id === p.id ? { ...x, number: f.number, name, role: f.role, isLibero } : x)));
    save(async () => {
      if (p.isLibero && !isLibero && matchId) await setLineupLibero(matchId, p.team, null);
      await updateLineupPlayer(p.id, { number: f.number, name, role: f.role });
    });
    return true;
  }, [canEdit, matchId, us, opp, patch, save]);

  const remove = useCallback((p: LineupPlayer) => {
    if (!canEdit) return;
    patch(p.team, (list) => list.filter((x) => x.id !== p.id));
    save(() => deleteLineupPlayer(p.id));
  }, [canEdit, patch, save]);

  return { us, opp, loading, canEdit, error, toggleStarter, toggleLibero, toggleCaptain, addPlayers, update, remove };
}
