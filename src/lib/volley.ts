import type { SetScore } from '@/types';

/*
 * Regole del punteggio (FIVB/FIPAV, pallavolo indoor):
 * - rally point: ogni azione assegna un punto;
 * - set 1-4 a 25, set 5 (tie-break) a 15, sempre con 2 punti di scarto e senza tetto;
 * - nel tie-break si cambia campo quando una squadra arriva a 8;
 * - partita al meglio dei 5 set: vince chi ne conquista 3 (3-0, 3-1, 3-2);
 * - classifica: 3-0 o 3-1 = 3 punti alla vincente e 0 alla perdente, 3-2 = 2 e 1.
 */

export const SETS_TO_WIN = 3;
export const TIE_BREAK_SET = 5;
export const TIE_BREAK_SWITCH = 8;

/** Punti necessari per chiudere il set */
export const setTarget = (set: number) => (set === TIE_BREAK_SET ? 15 : 25);

/** Vincitrice del set, o null se il set è ancora aperto */
export function setWinner(set: number, s: SetScore): 'us' | 'opp' | null {
  const target = setTarget(set);
  if (s.our >= target && s.our - s.opp >= 2) return 'us';
  if (s.opp >= target && s.opp - s.our >= 2) return 'opp';
  return null;
}

/** Set vinti da ciascuna squadra */
export function setsWon(history: SetScore[]) {
  return history.reduce((acc, s) => ({ our: acc.our + (s.our > s.opp ? 1 : 0), opp: acc.opp + (s.opp > s.our ? 1 : 0) }), { our: 0, opp: 0 });
}

/** Vincitrice della partita (prima a 3 set), o null se è ancora in corso */
export function matchWinner(won: { our: number; opp: number }): 'us' | 'opp' | null {
  if (won.our >= SETS_TO_WIN) return 'us';
  if (won.opp >= SETS_TO_WIN) return 'opp';
  return null;
}

/** Punti in classifica a fine partita (campionati italiani) */
export function standingPoints(won: { our: number; opp: number }): { our: number; opp: number } | null {
  const w = matchWinner(won);
  if (!w) return null;
  const tieBreak = Math.min(won.our, won.opp) === 2;
  const [winner, loser] = tieBreak ? [2, 1] : [3, 0];
  return w === 'us' ? { our: winner, opp: loser } : { our: loser, opp: winner };
}

/** Vero quando il punto appena fatto porta una squadra a 8 nel tie-break (cambio campo) */
export function isSideSwitch(set: number, before: SetScore, after: SetScore): boolean {
  return set === TIE_BREAK_SET && Math.max(before.our, before.opp) < TIE_BREAK_SWITCH && Math.max(after.our, after.opp) === TIE_BREAK_SWITCH;
}
