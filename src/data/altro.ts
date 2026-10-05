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
  organigramma: {
    key: 'organigramma', title: 'Organigramma', subtitle: 'Dirigenza e staff tecnico', Icon: Network,
    body: 'All’interno del progetto sportivo ogni società mantiene la propria autonomia organizzativa e giuridica. All’interno del progetto sportivo comune sono stati assegnati questi ruoli:',
  },
  albo: { key: 'albo', title: "Albo d'oro", subtitle: 'Titoli e piazzamenti per stagione', Icon: Trophy, body: '[Titoli vinti e piazzamenti, stagione per stagione.]' },
  palestre: { key: 'palestre', title: 'Palestre', subtitle: 'Indirizzi e indicazioni', Icon: MapPin },
  safeguarding: { key: 'safeguarding', title: 'Safeguarding', subtitle: 'Tutela dei minori e referente', Icon: ShieldCheck, body: '[Policy di tutela dei minori e contatti del referente safeguarding.]' },
  sponsor: { key: 'sponsor', title: 'Sponsor', subtitle: 'Chi ci sostiene', Icon: Star },
  galleria: { key: 'galleria', title: 'Galleria foto', subtitle: 'Album delle partite', Icon: Image },
};

export const SOCIETA: InfoKey[] = ['storia', 'organigramma', 'albo', 'palestre', 'safeguarding'];
export const MEDIA: InfoKey[] = ['sponsor', 'galleria'];

/** Ruoli del progetto sportivo comune (fonte: sito ufficiale, pagina Società) */
export const ORGANIGRAMMA: { name: string; role: string }[] = [
  { name: 'Fabio Tosi', role: 'Coordinatore generale' },
  { name: 'Marco Piva', role: 'Direttore sportivo Serie A3' },
  { name: 'Fabio Grandi', role: 'Dir. resp. settore giovanile progetto' },
  { name: 'Fausto Calzolari', role: 'Dir. resp. settore giovanile progetto' },
  { name: 'Matteo Schiavo', role: 'Dir. resp. settore giovanile progetto' },
  { name: 'Silvia Polato', role: 'Dir. resp. settore giovanile progetto' },
  { name: 'Greca Pillitu', role: 'Dir. resp. sportivo settore giovanile' },
  { name: 'Nicole Cantarelli', role: 'Preparatore atletico' },
  { name: 'Andrea Bertelli', role: 'Preparatore atletico' },
  { name: 'Dr. Vito Zanella', role: 'Medico Serie A3' },
  { name: 'Lara Visonae e Centro Atlante', role: 'Fisioterapista' },
  { name: 'Claudio Pasquetto', role: 'Resp. marketing e comunicazione' },
  { name: 'Laura Peretti', role: 'Resp. social e rapporti sponsor' },
  { name: 'Roberta Zorzella', role: 'Segreteria e amministrazione' },
];
