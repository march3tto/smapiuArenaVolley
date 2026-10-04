export const palette = {
  gold: '#F2B800',
  goldHi: '#F2B800',
  blue: '#2A5AA5',
  blueBright: '#3A6CBB',
  blueDeep: '#1F4A8E',
  navy: '#163A75',
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
  bg: '#2A5AA5',
  card: '#224D92',
  cardAlt: '#1E4586',
  line: 'rgba(255,255,255,0.14)',
  lineStrong: 'rgba(255,255,255,0.30)',
  fill: 'rgba(255,255,255,0.06)',
  fill2: 'rgba(255,255,255,0.11)',
  text: '#EEF2FA',
  muted: '#C3D2EE',
  accent: '#F2B800',
  cobalt: '#AFC6FF',
  live: '#FF4D5E',
  ok: '#3DDC97',
  danger: '#FF7A88',
  overlay: 'rgba(12,30,66,0.6)',
};

export const light: Colors = {
  bg: '#EEF2FA',
  card: '#FFFFFF',
  cardAlt: '#F3F6FD',
  line: 'rgba(42,90,165,0.12)',
  lineStrong: 'rgba(42,90,165,0.26)',
  fill: 'rgba(42,90,165,0.06)',
  fill2: 'rgba(42,90,165,0.12)',
  text: '#0A1A45',
  muted: '#5A6890',
  accent: '#F2B800',
  cobalt: '#2A5AA5',
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
