import { Book, Image, MapPin, Network, ShieldCheck, Star, Trophy, type LucideIcon } from 'lucide-react-native';

export type InfoKey = 'storia' | 'organigramma' | 'albo' | 'palestre' | 'safeguarding' | 'sponsor' | 'galleria';

export interface InfoSection {
  key: InfoKey;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Testo della pagina di dettaglio (paragrafi separati da una riga vuota) */
  body?: string;
}

// Testi di esempio: sostituire con quelli forniti dalla società
export const INFO: Record<InfoKey, InfoSection> = {
  storia: { key: 'storia', title: 'Storia', subtitle: 'Dalla fondazione a oggi', Icon: Book, body: '[Storia della società: anno di fondazione, tappe principali, promozioni.]' },
  organigramma: { key: 'organigramma', title: 'Organigramma', subtitle: 'Dirigenza e staff tecnico', Icon: Network, body: '[Presidente, direttore sportivo, allenatori e staff.]' },
  albo: { key: 'albo', title: "Albo d'oro", subtitle: 'Titoli e piazzamenti per stagione', Icon: Trophy, body: '[Titoli vinti e piazzamenti, stagione per stagione.]' },
  palestre: { key: 'palestre', title: 'Palestre', subtitle: 'Indirizzi e indicazioni', Icon: MapPin },
  safeguarding: { key: 'safeguarding', title: 'Safeguarding', subtitle: 'Tutela dei minori e referente', Icon: ShieldCheck, body: '[Policy di tutela dei minori e contatti del referente safeguarding.]' },
  sponsor: { key: 'sponsor', title: 'Sponsor', subtitle: 'Chi ci sostiene', Icon: Star },
  galleria: { key: 'galleria', title: 'Galleria foto', subtitle: 'Album delle partite', Icon: Image },
};

export const SOCIETA: InfoKey[] = ['storia', 'organigramma', 'albo', 'palestre', 'safeguarding'];
export const MEDIA: InfoKey[] = ['sponsor', 'galleria'];
