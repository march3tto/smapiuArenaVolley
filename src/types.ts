/** Immagine: require() locale (number) oppure URL remoto (string, es. Supabase Storage) */
export type ImgSrc = number | string;

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';
export type Phase = 'andata' | 'ritorno';
export type HomeAway = 'casa' | 'trasferta';

export interface SetScore {
  our: number;
  opp: number;
}

export interface Competition {
  name: string;
  federation?: string | null;
  logo: ImgSrc;
}

export interface Match {
  id: string;
  /** null per le amichevoli */
  giornata: number | null;
  girone?: string | null;
  phase: Phase;
  /** ISO 8601 */
  date: string;
  homeAway: HomeAway;
  opponent: string;
  opponentLogo?: ImgSrc | null;
  /** Campionato (tabella campionati); null per le amichevoli */
  competition?: Competition | null;
  venue: string;
  status: MatchStatus;
  ourSets?: number | null;
  oppSets?: number | null;
  sets?: SetScore[];
  youtubeLiveId?: string | null;
  /** Solo dati demo: la partita diventa "live" quando l'anteprima è attiva */
  demoLive?: boolean;
}

export interface Standing {
  team: string;
  position: number;
  played: number;
  won: number;
  lost: number;
  points: number;
  isUs: boolean;
}

export type PlayerRole = 'palleggiatrice' | 'schiacciatrice' | 'centrale' | 'opposto' | 'libero';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  role: PlayerRole;
  number?: number | null;
  photo: ImgSrc;
  bio?: string | null;
  status?: 'nuova' | 'confermata' | null;
  born?: number | null;
  isCaptain?: boolean;
  heightCm?: number | null;
  points?: number | null;
  aces?: number | null;
  blocks?: number | null;
}

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  /** ISO 8601 */
  date: string;
  image: ImgSrc;
  excerpt: string;
  body?: string | null;
}

export type SponsorTier = 'title' | 'main' | 'sponsor' | 'charity';

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  logo: ImgSrc;
  url?: string | null;
}

export interface YouthTeam {
  id: string;
  name: string;
  short: string;
  /** Allenatori (tabella staff, per categoria) */
  coach: string;
  description: string;
  /** Non presenti nel database: vuoti se non disponibili */
  training?: string;
  gym?: string;
  next?: { opponent: string; date: string; home: boolean } | null;
  last?: { opponent: string; our: number; opp: number } | null;
}

export interface Venue {
  name: string;
  city: string;
  use: string;
  kind: 'arena' | 'palasport' | 'palestra';
}

export interface LiveEvent {
  id: string;
  set: number;
  our: number;
  opp: number;
  text: string;
  side: 'us' | 'opp';
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role?: 'public' | 'parent' | 'staff' | 'admin';
}

export interface NotifPrefs {
  enabled: boolean;
  start: boolean;
  points: boolean;
  sets: boolean;
  final: boolean;
  news: boolean;
  youth: string[];
}

export interface MediaItem {
  id: string;
  type: 'video' | 'podcast';
  title: string;
  /** ID video YouTube o URL episodio */
  ref: string;
  cover?: string | null;
  duration?: string | null;
  date: string;
}
