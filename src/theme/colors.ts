/** Colori ufficiali del sito arenavolley (variabili CSS) */
export const brand = {
  bluNotte: '#061A3A',
  bluScuro: '#0B3166',
  blu: '#115BAB',
  giallo: '#FFD503',
  bianco: '#FFFFFF',
  testo2: '#D6E4F7',
  inchiostro: '#0C1D3A',
  inchiostro2: '#33456A',
  carta: '#F2F5FA',
  carta2: '#E4EAF4',
  footer: '#031A38',
  tenue: '#B9C6DC',
  bordo: '#D9DDE4',
} as const;

export const palette = {
  gold: brand.giallo,
  goldHi: brand.giallo,
  blue: brand.blu,
  blueBright: brand.blu,
  blueDeep: brand.bluScuro,
  navy: brand.bluNotte,
  onGold: brand.bluNotte,
  white: brand.bianco,
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
  bg: brand.bluNotte,
  card: brand.bluScuro,
  cardAlt: '#092750',
  line: 'rgba(255,255,255,0.12)',
  lineStrong: 'rgba(255,255,255,0.28)',
  fill: 'rgba(255,255,255,0.06)',
  fill2: 'rgba(255,255,255,0.11)',
  text: brand.bianco,
  muted: brand.tenue,
  accent: brand.giallo,
  cobalt: brand.testo2,
  live: '#FF4D5E',
  ok: '#3DDC97',
  danger: '#FF7A88',
  overlay: 'rgba(3,26,56,0.6)',
};

export const light: Colors = {
  bg: brand.carta,
  card: brand.bianco,
  cardAlt: brand.carta2,
  line: 'rgba(12,29,58,0.12)',
  lineStrong: 'rgba(12,29,58,0.26)',
  fill: 'rgba(17,91,171,0.06)',
  fill2: 'rgba(17,91,171,0.12)',
  text: brand.inchiostro,
  muted: brand.inchiostro2,
  accent: brand.giallo,
  cobalt: brand.blu,
  live: '#E5243A',
  ok: '#10935B',
  danger: '#C8283B',
  overlay: 'rgba(12,29,58,0.35)',
};

/** Testo: Roboto (come il corpo del sito) */
export const FONT = {
  400: 'Roboto_400Regular',
  500: 'Roboto_500Medium',
  600: 'Roboto_600SemiBold',
  700: 'Roboto_700Bold',
  800: 'Roboto_800ExtraBold',
  900: 'Roboto_900Black',
} as const;
export type Weight = keyof typeof FONT;

/** Titoli e numeri: Barlow Condensed corsivo, maiuscolo (come i titoli del sito) */
export const DISPLAY = {
  800: 'BarlowCondensed_800ExtraBold_Italic',
  900: 'BarlowCondensed_900Black_Italic',
} as const;
/** Barlow Condensed è più stretto e basso di Roboto: lo ingrandiamo un po' */
export const DISPLAY_SCALE = 1.15;
/** Sotto questa dimensione i pesi 800/900 restano in Roboto (etichette, badge) */
export const DISPLAY_MIN_SIZE = 17;

export const radius = { sm: 12, md: 18, lg: 24, xl: 28, pill: 999 } as const;

/** Gradiente blu del brand (logo, badge, pannelli) */
export const brandGradient = [palette.blueBright, palette.blueDeep, palette.navy] as const;
