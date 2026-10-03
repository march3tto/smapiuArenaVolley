export const palette = {
  gold: '#F2B800',
  goldHi: '#FFD54D',
  blue: '#1D52C4',
  blueBright: '#2F6BE6',
  blueDeep: '#0B338F',
  navy: '#061C52',
  onGold: '#071436',
  white: '#FFFFFF',
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
  bg: '#050D24',
  card: '#0D1D50',
  cardAlt: '#0A1844',
  line: 'rgba(150,178,255,0.14)',
  lineStrong: 'rgba(150,178,255,0.30)',
  fill: 'rgba(255,255,255,0.06)',
  fill2: 'rgba(255,255,255,0.11)',
  text: '#EEF2FA',
  muted: '#8C9AC0',
  accent: '#FFD54D',
  cobalt: '#7C9BFF',
  live: '#FF4D5E',
  ok: '#3DDC97',
  danger: '#FF7A88',
  overlay: 'rgba(3,8,24,0.6)',
};

export const light: Colors = {
  bg: '#EEF2FA',
  card: '#FFFFFF',
  cardAlt: '#F3F6FD',
  line: 'rgba(11,51,143,0.10)',
  lineStrong: 'rgba(11,51,143,0.22)',
  fill: 'rgba(11,51,143,0.05)',
  fill2: 'rgba(11,51,143,0.10)',
  text: '#0A1A45',
  muted: '#5A6890',
  accent: '#8A6400',
  cobalt: '#1D52C4',
  live: '#E5243A',
  ok: '#10935B',
  danger: '#C8283B',
  overlay: 'rgba(10,26,69,0.35)',
};

export const FONT = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
  900: 'Inter_900Black',
} as const;
export type Weight = keyof typeof FONT;

export const radius = { sm: 12, md: 18, lg: 24, xl: 28, pill: 999 } as const;

/** Gradiente blu del brand (logo, badge, pannelli) */
export const brandGradient = [palette.blueBright, palette.blueDeep, palette.navy] as const;
