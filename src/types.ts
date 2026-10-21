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
  /** Logo per la modalità chiara, se diverso */
  logoLight?: ImgSrc | null;
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
  /** Squadra avversaria (tabella squadre): la sua rosa serve per la formazione in diretta */
  opponentTeamId?: string | null;
  /** Campionato (tabella campionati); null per le amichevoli */
  competition?: Competition | null;
  /** Etichetta della stagione (tabella stagioni), es. "Pre-season" */
  season?: string | null;
  venue: string;
  status: MatchStatus;
  ourSets?: number | null;
  oppSets?: number | null;
  sets?: SetScore[];
  youtubeLiveId?: string | null;
  /** Solo dati demo: la partita diventa "live" quando l'anteprima è attiva */
  demoLive?: boolean;
}

/** Gara del calendario completo del girone (tabella partite, anche con nostra_partita = false) */
export interface LeagueGame {
  id: string;
  /** Numero gara federale */
  number: number;
  giornata: number;
  phase: Phase;
  /** ISO 8601 */
  date: string;
  home: string;
  away: string;
  homeLogo?: ImgSrc | null;
  awayLogo?: ImgSrc | null;
  status: MatchStatus;
  homeSets?: number | null;
  awaySets?: number | null;
  /** Parziali dal punto di vista della squadra di casa */
  sets?: { home: number; away: number }[];
  /** Id della partita se è una gara della nostra squadra, altrimenti null */
  matchId?: string | null;
}

export interface Standing {
  team: string;
  position: number;
  played: number;
  won: number;
  lost: number;
  points: number;
  isUs: boolean;
  /** Statistiche calcolate dal database (classifica automatica); assenti nei dati demo */
  won30?: number;
  won32?: number;
  lost23?: number;
  lost03?: number;
  setsWon?: number;
  setsLost?: number;
  /** null se set persi = 0 */
  setRatio?: number | null;
  pointsFor?: number;
  pointsAgainst?: number;
  /** null se punti subiti = 0 */
  pointRatio?: number | null;
  /** Punti di penalizzazione, già tolti da points */
  penalty?: number;
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
  /** Data di nascita completa (ISO "AAAA-MM-GG"), se disponibile */
  birthDate?: string | null;
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

/** Staff tecnico e dirigenti della prima squadra (tabella staff, righe senza categoria giovanile) */
/** Rosa e tecnici di una squadra regionale (Serie B2, Serie D), dalle tabelle giocatrici e staff */
export interface RegionalRoster {
  players: { id: string; name: string; number: number | null; birthDate: string | null }[];
  staff: { id: string; name: string; role: string }[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  /** Vuota se non disponibile: si mostrano le iniziali */
  photo: ImgSrc;
}

export interface Venue {
  name: string;
  /** Via e località, come da indirizzo postale */
  address: string;
  /** Comune, usato per raggruppare */
  city: string;
  kind: 'arena' | 'palasport' | 'palestra';
}

export type PointAction = 'schiacciata' | 'pipe' | 'primo_tempo' | 'pallonetto' | 'ace' | 'muro' | 'errore_avversario';
export type PointPhase = 'attacco' | 'difesa';

/** Azione tecnica di un punto (tabella azioni_punto), separata dalla frase di cronaca */
export interface PointDetail {
  action: PointAction;
  phase: PointPhase;
  /** Posizione in campo I-VI */
  zone?: number | null;
  /** Giocatrice che ha fatto il punto, se scelta */
  player?: { lineupId: string; playerId?: string | null; name: string; number: number | null } | null;
  /** Frase di cronaca scelta (dall'AI o predefinita) */
  text?: string;
  aiText?: boolean;
}

export interface LiveEvent {
  id: string;
  set: number;
  our: number;
  opp: number;
  text: string;
  side: 'us' | 'opp';
  /** Solo per i punti registrati con l'azione */
  detail?: PointDetail | null;
}

/** Giocatrice a referto nella formazione di una partita (nostra o avversaria) */
export interface LineupPlayer {
  id: string;
  team: 'us' | 'opp';
  /** Solo nostra squadra: giocatrice della rosa */
  playerId?: string | null;
  number: number | null;
  name: string;
  role: PlayerRole | null;
  isCaptain: boolean;
  /** Posizione nello Starting Six (I-VI del foglio formazione, 1 = al servizio), null in panchina */
  zone: number | null;
  /** Libero scelto dalla panchina (uno per squadra) */
  isLibero: boolean;
  order: number;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role?: 'public' | 'parent' | 'staff' | 'admin';
  /** false se nome e cognome non sono noti (il nome mostrato viene dall'email) */
  hasName?: boolean;
  /** Metodi di accesso collegati all'account */
  providers?: ('email' | 'apple' | 'google' | 'facebook')[];
  /** Categoria giovanile di interesse (profili.categoria_giovanile_id), scelta dai genitori */
  youthCategoryId?: string | null;
}

export interface NotifPrefs {
  enabled: boolean;
  start: boolean;
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
