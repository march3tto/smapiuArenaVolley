/** Unica palette dell'app: scala di blu del sito arenavolley, il giallo come solo accento. Colori pieni: niente gradienti né aloni */
export const blue = {
  0: '#FFFFFF',
  50: '#F2F5FA',
  100: '#E4EAF4',
  200: '#D6E4F7',
  300: '#B9C6DC',
  400: '#5AA2F0',
  500: '#115BAB',
  600: '#33456A',
  700: '#0D4A8C',
  800: '#0B3166',
  850: '#092750',
  900: '#061A3A',
  950: '#031A38',
} as const;

export const palette = {
  gold: '#FFD503',
  onGold: blue[900],
  white: blue[0],
  /** Blu notte: fondi pieni scuri (maglie, capitana, card su foto) */
  navy: blue[900],
  /** Blu del brand: seconda squadra, libero, campo */
  blue: blue[500],
} as const;

export interface Colors {
  bg: string;
  card: string;
  cardAlt: string;
  line: string;
  lineStrong: string;
  fill: string;
  fill2: string;
  text: string;
  muted: string;
  accent: string;
  cobalt: string;
  live: string;
  ok: string;
  danger: string;
  overlay: string;
}

export const dark: Colors = {
  bg: blue[900],
  card: blue[800],
  cardAlt: blue[850],
  line: 'rgba(255,255,255,0.12)',
  lineStrong: 'rgba(255,255,255,0.28)',
  fill: 'rgba(255,255,255,0.06)',
  fill2: 'rgba(255,255,255,0.11)',
  text: blue[0],
  muted: blue[300],
  accent: palette.gold,
  cobalt: blue[200],
  live: '#FF4D5E',
  ok: '#3DDC97',
  danger: '#FF7A88',
  overlay: 'rgba(3,26,56,0.6)',
};

export const light: Colors = {
  bg: blue[50],
  card: blue[0],
  cardAlt: blue[100],
  line: 'rgba(12,29,58,0.12)',
  lineStrong: 'rgba(12,29,58,0.26)',
  fill: 'rgba(17,91,171,0.06)',
  fill2: 'rgba(17,91,171,0.12)',
  text: '#0C1D3A',
  muted: blue[600],
  accent: palette.gold,
  cobalt: blue[500],
  live: '#E5243A',
  ok: '#10935B',
  danger: '#C8283B',
  overlay: 'rgba(12,29,58,0.35)',
};

/** Testo: Encode Sans Condensed */
export const FONT = {
  400: 'EncodeSansCondensed_400Regular',
  500: 'EncodeSansCondensed_500Medium',
  600: 'EncodeSansCondensed_600SemiBold',
  700: 'EncodeSansCondensed_700Bold',
  800: 'EncodeSansCondensed_800ExtraBold',
  900: 'EncodeSansCondensed_900Black',
} as const;
export type Weight = keyof typeof FONT;

/** Titoli e numeri: Saira Condensed, maiuscolo (dritto: Saira non ha il corsivo) */
export const DISPLAY = {
  800: 'SairaCondensed_800ExtraBold',
  900: 'SairaCondensed_900Black',
} as const;
/** Saira Condensed è un po' più basso del testo: lo ingrandiamo appena */
export const DISPLAY_SCALE = 1.05;
/**
 * Interlinea dei titoli in Saira Condensed. Il font ha maiuscole alte 0,69 em e discendente di 0,44 em:
 * iOS appoggia il testo sul fondo della riga, e con un'interlinea più stretta di 1,3 em la cima delle maiuscole (e gli accenti) viene tagliata.
 */
export const DISPLAY_LINE = 1.3;
/** Spostamento verso il basso (in em) che su iOS centra le maiuscole in una riga alta `line` em: con l'interlinea naturale (1,57 em) sono già centrate */
export const displayIosShift = (line: number) => 0.783 - line / 2;
/** Sotto questa dimensione i pesi 800/900 restano in Encode Sans Condensed (etichette, badge) */
export const DISPLAY_MIN_SIZE = 17;

export const radius = { sm: 12, md: 18, lg: 24, xl: 28, pill: 999 } as const;

/** Spaziature (gap, padding, margin): griglia a 8, con il mezzo passo da 4 per gli spazi stretti (icona-testo, titolo-sottotitolo) */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40, xxxl: 48 } as const;
