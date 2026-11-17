import type { Href } from 'expo-router';
import type { Match } from '@/types';

/**
 * Dove porta il tocco su una nostra partita: tutte le gare della sua giornata (anche durante la diretta: da lì la
 * nostra gara apre il live); direttamente il live solo se la giornata non è nota. null se non c'è nulla da aprire.
 */
export function rottaPartita(m: Match): Href | null {
  if (m.giornata != null && m.girone) return { pathname: '/giornata/[numero]', params: { numero: String(m.giornata), girone: m.girone } };
  if (m.status === 'live') return '/live';
  return null;
}
