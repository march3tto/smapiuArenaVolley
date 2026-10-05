import type { PlayerRole, SponsorTier } from './types';

export const US = 'Smapiù Arena';
export const US_FULL = 'Smapiù Arena Volley Team';
export const LEAGUE = 'Serie A3 femminile';
export const GIRONE = 'Girone B';
export const INSTAGRAM_HANDLE = '@arenavolleyteam';
export const INSTAGRAM_URL = 'https://www.instagram.com/arenavolleyteam/';

// Dati di esempio: sostituire con quelli reali della segreteria
export const CONTACTS = {
  email: 'segreteria@arenavolley.it',
  phone: '+39 045 000 0000',
  hours: 'Lunedì–venerdì, 17:00–19:30',
  address: '[Indirizzo sede]',
  /** Numero WhatsApp in formato internazionale, solo cifre */
  whatsapp: '390450000000',
};

/** Sigla e colore del badge per le avversarie senza logo */
export const TEAM_BADGES: Record<string, [string, string]> = {
  'Azimut Giorgione': ['GIO', '#0E7C66'],
  'Tonno Callipo Calabria': ['TCC', '#C8102E'],
  'CO.GE. Vesuvio Oplonti': ['OPL', '#1F4E9C'],
  'Banca Annia Aduna Padova': ['PAD', '#7B2CBF'],
  'V&V Modena': ['MOD', '#D98E04'],
  'Zero5 Castellana Grotte': ['CAS', '#E85D04'],
  'Olimpia di Navigazione Ravenna': ['RAV', '#0077B6'],
};

export const ROLE_LABEL: Record<PlayerRole, string> = {
  palleggiatrice: 'Palleggiatrice',
  schiacciatrice: 'Schiacciatrice',
  centrale: 'Centrale',
  opposto: 'Opposto',
  libero: 'Libero',
};

export const ROLE_FILTERS: { value: 'all' | PlayerRole; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'palleggiatrice', label: 'Palleggiatrici' },
  { value: 'opposto', label: 'Opposti' },
  { value: 'schiacciatrice', label: 'Schiacciatrici' },
  { value: 'centrale', label: 'Centrali' },
  { value: 'libero', label: 'Liberi' },
];

export const TIER_LABEL: Record<SponsorTier, string> = {
  title: 'Title sponsor',
  main: 'Main sponsor',
  sponsor: 'Sponsor',
  charity: 'Charity partner',
};
export const TIER_ORDER: SponsorTier[] = ['title', 'main', 'sponsor', 'charity'];
