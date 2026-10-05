import { STORIA_PHOTO } from './assets';
import { Book, Image, MapPin, Network, ShieldCheck, Star, Trophy, type LucideIcon } from 'lucide-react-native';

export type InfoKey = 'storia' | 'organigramma' | 'albo' | 'palestre' | 'safeguarding' | 'sponsor' | 'galleria';

export interface InfoSection {
  key: InfoKey;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  /** Testo della pagina di dettaglio (paragrafi separati da una riga vuota) */
  body?: string;
  /** Titolo in evidenza sopra il testo */
  headline?: string;
  image?: number;
  /** Numeri chiave mostrati in riquadri */
  facts?: { value: string; label: string }[];
}

// Testi di esempio: sostituire con quelli forniti dalla società
export const INFO: Record<InfoKey, InfoSection> = {
  storia: {
    key: 'storia', title: 'Storia', subtitle: 'Dalla fondazione a oggi', Icon: Book,
    headline: 'Radici profonde, visione vincente',
    image: STORIA_PHOTO,
    facts: [
      { value: '2018', label: 'Anno di nascita' },
      { value: '5', label: 'Società unite' },
      { value: '500', label: 'Atlete circa' },
    ],
    body: [
      'Arena Volley Team Verona è un progetto sportivo nato il 25 luglio 2018 con l’obiettivo di unire e valorizzare la pallavolo femminile nella città e nella provincia di Verona.',
      'Il progetto ha riunito realtà come Gaiga Pallavolo Verona, Vigasio Volley, Volley Victory, Castel d’Azzano Volley e San Giovanni Lupatoto Volley, offrendo alle giovani atlete percorsi di crescita tecnica e sportiva di alto livello, dal settore giovanile alla prima squadra.',
      'Arena Volley è oggi un movimento di riferimento per la pallavolo femminile regionale ed è infatti la prima società nel territorio veronese e tra le prime riconosciute in Veneto.',
      'Un progetto in continua crescita che coinvolge circa 500 atlete, dai 5 anni, e si fonda sul lavoro di tecnici qualificati.',
      'Il settore giovanile rappresenta il cuore del progetto, costruito con metodo e competenza, come dimostrano i risultati sportivi e il riconoscimento della Certificazione di Qualità Argento FIPAV.',
    ].join('\n\n'),
  },
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
