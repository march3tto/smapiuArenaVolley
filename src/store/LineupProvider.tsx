import { createContext, useContext, type ReactNode } from 'react';
import { useLive } from './LiveProvider';
import { useLineup, type Lineup } from './useLineup';

const Ctx = createContext<Lineup | null>(null);

/** Formazioni della partita in diretta, condivise tra la schermata live e quella della formazione avversaria */
export function LineupProvider({ children }: { children: ReactNode }) {
  const lineup = useLineup(useLive().match);
  return <Ctx.Provider value={lineup}>{children}</Ctx.Provider>;
}

export function useLiveLineup(): Lineup {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLiveLineup deve stare dentro LineupProvider');
  return v;
}
