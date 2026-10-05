import type { PlayerRole, SponsorTier } from './types';

export const US = 'Smapiù Arena';
export const US_FULL = 'Smapiù Arena Volley Team';
export const LEAGUE = 'Serie A3 femminile';
export const GIRONE = 'Girone B';
export const INSTAGRAM_HANDLE = '@arenavolleyteam';
export const INSTAGRAM_URL = 'https://www.instagram.com/arenavolleyteam/';

export const FACEBOOK_URL = 'https://www.facebook.com/Arenavolleyteam/';

/** Contatti della società (fonte: sito ufficiale, footer e pagina Contatti) */
export const CONTACTS = {
  address: 'Via Mascagni 21, 37060 Castel d’Azzano (VR)',
  email: 'segreteria@arenavolleyteam.it',
  phone: '+39 392 09 24 310',
  /** Numero WhatsApp in formato internazionale, solo cifre */
  whatsapp: '393920924310',
  /** Indirizzi per argomento */
  offices: [
    { label: 'Informazioni generali', email: 'info@arenavolleyteam.it' },
    { label: 'Sponsor e marketing', email: 'marketing@arenavolleyteam.it' },
    { label: 'Ufficio stampa', email: 'ufficiostampa@arenavolleyteam.it' },
  ],
  /** Segreterie per zona di attività */
  desks: [
    { area: 'Castel d’Azzano, Vigasio e Verona – Sacra Famiglia', email: 'segreteria@arenavolleyteam.it', phone: '+39 392 09 24 310' },
    { area: 'Verona (Santa Lucia, centro) – Pallavolo Gaiga Verona', email: 'gaiga@arenavolleyteam.it', phone: '+39 346 09 35 830' },
    { area: 'San Giovanni Lupatoto', email: 'sangio@arenavolleyteam.it', phone: '+39 334 76 29 854' },
  ],
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
