import type { PlayerRole } from '@/types';

/*
 * Rotazioni in campo (FIPAV, pallavolo indoor):
 * - zone viste dalla propria metà, rete in alto: prima linea 4-3-2, seconda linea 5-6-1 (zona 1 = al servizio);
 * - una squadra ruota in senso orario quando vince il punto in ricezione (cambio palla): II→I, I→VI, VI→V, V→IV, IV→III, III→II;
 * - la rotazione si chiama P + zona della palleggiatrice (P1 = palleggiatrice al servizio): P1 → P6 → P5 → P4 → P3 → P2;
 * - il libero sostituisce la centrale di seconda linea: in zona 5 e 6 sempre, in zona 1 solo in ricezione.
 * Funzioni pure, senza React né Supabase: dagli alias si importano solo tipi, così girano anche con node --test.
 */

export type Side = 'us' | 'opp';

/** Sestetto: id della giocatrice in zona 1..6 (indice 0 = zona 1), null se la zona è vuota */
export type Zones = readonly (string | null)[];

export type RoleOf = (id: string) => PlayerRole | null | undefined;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/** Seconda linea: dove il libero può entrare al posto della centrale (zona 1 solo in ricezione) */
const LIBERO_ZONES = [6, 5, 1];

/** Posizione dopo n rotazioni, partendo dalla zona di partenza */
export function rotateZone(zone: number, n: number): number {
  return ((((zone - 1 - n) % 6) + 6) % 6) + 1;
}

/** Sestetto dopo n rotazioni */
export function rotateN(zones: Zones, n: number): (string | null)[] {
  const next: (string | null)[] = [null, null, null, null, null, null];
  zones.slice(0, 6).forEach((id, i) => {
    next[rotateZone(i + 1, n) - 1] = id ?? null;
  });
  return next;
}

/** Sestetto dopo una rotazione (cambio palla vinto) */
export const rotate = (zones: Zones) => rotateN(zones, 1);

/** Le 6 rotazioni in ordine di gioco, dalla partenza */
export const allRotations = (zones: Zones) => [0, 1, 2, 3, 4, 5].map((n) => rotateN(zones, n));

/**
 * Sestetto in P1 (5-1) dai ruoli: palleggiatrice in I, schiacciatrici in II e V, centrali in III e VI, opposto in IV.
 * Le due schiacciatrici e le due centrali seguono l'ordine della lista (la prima va in prima linea).
 * null se i ruoli non sono quelli del 5-1 (4-2, 6-2, ruoli mancanti): lo schieramento resta a mano.
 */
export function p1Lineup(players: readonly { id: string; role: PlayerRole | null }[]): string[] | null {
  if (players.length !== 6) return null;
  const of = (role: PlayerRole) => players.filter((p) => p.role === role).map((p) => p.id);
  const [setters, hitters, middles, opposites] = [of('palleggiatrice'), of('schiacciatrice'), of('centrale'), of('opposto')];
  if (setters.length !== 1 || hitters.length !== 2 || middles.length !== 2 || opposites.length !== 1) return null;
  return [setters[0], hitters[0], middles[0], opposites[0], hitters[1], middles[1]];
}

/** "P1".."P6" dalla zona della palleggiatrice; con due palleggiatrici (4-2, 6-2) conta la prima in ordine di zona, null senza */
export function rotationName(zones: Zones, roleOf: RoleOf): string | null {
  const i = zones.findIndex((id) => !!id && roleOf(id) === 'palleggiatrice');
  return i < 0 ? null : `P${i + 1}`;
}

export interface CourtView {
  /** Chi è davvero in campo: il libero al posto della centrale che sostituisce */
  zones: (string | null)[];
  /** Zona in cui è entrato il libero e centrale che è uscita (null se il libero è fuori) */
  libero: { zone: number; replaced: string } | null;
}

/**
 * Sestetto in campo con il libero: sostituisce la centrale di seconda linea (zona 6 o 5, in zona 1 solo se riceviamo).
 * Quando la centrale torna in prima linea (zona 4) il libero esce. weServe: la squadra è al servizio.
 */
export function onCourt(zones: Zones, roleOf: RoleOf, liberoId: string | null, weServe: boolean): CourtView {
  const court = rotateN(zones, 0);
  if (!liberoId) return { zones: court, libero: null };
  const zone = LIBERO_ZONES
    .filter((z) => z !== 1 || !weServe)
    .find((z) => {
      const id = court[z - 1];
      return !!id && roleOf(id) === 'centrale';
    });
  if (!zone) return { zones: court, libero: null };
  const replaced = court[zone - 1]!;
  court[zone - 1] = liberoId;
  return { zones: court, libero: { zone, replaced } };
}

/** Punto di cronaca: set e punteggio dopo il punto, chi l'ha fatto */
export interface ScoredEvent {
  set: number;
  our: number;
  opp: number;
  side: Side;
}

/**
 * Chi ha vinto ogni punto del set, in ordine di gioco. null = uno o più punti mancanti nella cronaca subito prima del successivo:
 * di quelli non si sa chi servisse, quindi non si contano rotazioni. Le righe che ripetono il punteggio (cambio campo, fine set) si saltano.
 */
export function pointWinners(events: readonly ScoredEvent[], set: number): (Side | null)[] {
  const points = events.filter((e) => e.set === set).sort((a, b) => a.our + a.opp - (b.our + b.opp));
  const out: (Side | null)[] = [];
  let prev = { our: 0, opp: 0 };
  for (const e of points) {
    const total = e.our + e.opp;
    if (total <= prev.our + prev.opp) continue;
    if (total === prev.our + prev.opp + 1) out.push(e.our > prev.our ? 'us' : 'opp');
    else out.push(null, e.side);
    prev = e;
  }
  return out;
}

/**
 * Chi serve per primo nel set (alternanza FIPAV): la scelta dell'admin sullo 0-0 vale sempre; altrimenti
 * nel 1° set noi, nei set 2-4 chi non aveva servito per primo nel set precedente. Il tie-break si sorteggia:
 * senza scelta si continua ad alternare rispetto al 4° set.
 */
export function firstServer(set: number, chosen: Readonly<Partial<Record<number, Side>>>): Side {
  const c = chosen[set];
  if (c) return c;
  if (set <= 1) return 'us';
  return firstServer(set - 1, chosen) === 'us' ? 'opp' : 'us';
}

/** Rotazioni di ciascuna squadra nel set, dallo Starting Six, e chi è al servizio adesso */
export function rotationState(first: Side, winners: readonly (Side | null)[]): { usRotations: number; oppRotations: number; serving: Side } {
  const rot = { us: 0, opp: 0 };
  let server = first;
  let unknown = false;
  for (const w of winners) {
    if (w === null) {
      unknown = true;
      continue;
    }
    // cambio palla: ruota chi vince il punto in ricezione (dopo dei punti mancanti non si sa chi servisse)
    if (!unknown && w !== server) rot[w] += 1;
    server = w;
    unknown = false;
  }
  return { usRotations: rot.us, oppRotations: rot.opp, serving: server };
}

export interface LineupIssue {
  level: 'errore' | 'avviso';
  message: string;
}

/** Diagonali del 5-1, coppie di zone 1↔4, 2↔5, 3↔6: palleggiatrice e opposto, due schiacciatrici, due centrali */
const DIAGONALS: [number, number][] = [[1, 4], [2, 5], [3, 6]];
const DIAGONAL_PAIRS = ['opposto+palleggiatrice', 'schiacciatrice+schiacciatrice', 'centrale+centrale'];

/**
 * Controlli del sestetto: gli errori non sono ammessi, gli avvisi segnalano uno schema diverso dal 5-1 (4-2, 6-2 nelle giovanili).
 * Il libero può stare in una zona (es. al posto di una schiacciatrice in difesa).
 */
export function validateLineup(zones: Zones, liberos: readonly string[], roleOf: RoleOf): LineupIssue[] {
  const issues: LineupIssue[] = [];
  const placed = zones.slice(0, 6).filter((id): id is string => !!id);
  const missing = 6 - placed.length;
  if (missing > 0) issues.push({ level: 'errore', message: missing === 1 ? 'Sestetto incompleto: manca una titolare.' : `Sestetto incompleto: mancano ${missing} titolari.` });
  if (new Set(placed).size < placed.length) issues.push({ level: 'errore', message: 'La stessa giocatrice è in più di una zona.' });
  if (liberos.length > 2) issues.push({ level: 'errore', message: 'Al massimo 2 liberi.' });
  if (liberos.some((id) => roleOf(id) !== 'libero')) issues.push({ level: 'errore', message: 'Come libero si possono scegliere solo le giocatrici con ruolo Libero.' });

  const setters = placed.filter((id) => roleOf(id) === 'palleggiatrice').length;
  if (setters === 0 && placed.length) issues.push({ level: 'avviso', message: 'Nessuna palleggiatrice nel sestetto.' });
  if (setters > 1) issues.push({ level: 'avviso', message: `${setters} palleggiatrici: schema 4-2/6-2?` });

  // le diagonali si controllano solo a sestetto completo, con i ruoli di tutte e una palleggiatrice (5-1)
  const roles = zones.slice(0, 6).map((id) => (id ? roleOf(id) ?? null : null));
  if (missing === 0 && setters === 1 && roles.every((r) => !!r)) {
    const pairs = DIAGONALS.map(([a, b]) => [roles[a - 1]!, roles[b - 1]!].sort().join('+'));
    pairs.forEach((pair, i) => {
      if (!DIAGONAL_PAIRS.includes(pair)) {
        const [a, b] = DIAGONALS[i];
        issues.push({ level: 'avviso', message: `Diagonale ${ROMAN[a]}–${ROMAN[b]}: ${pair.replace('+', ' e ')} (nel 5-1: palleggiatrice e opposto, due schiacciatrici, due centrali).` });
      }
    });
    if (pairs.every((p) => DIAGONAL_PAIRS.includes(p)) && new Set(pairs).size < 3) {
      issues.push({ level: 'avviso', message: 'Diagonali diverse dal 5-1: servono una palleggiatrice con l\'opposto, due schiacciatrici e due centrali.' });
    }
  }
  return issues;
}
