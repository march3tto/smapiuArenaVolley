import { StyleSheet, Text, type TextProps } from 'react-native';
import { DISPLAY, DISPLAY_MIN_SIZE, DISPLAY_SCALE, FONT, type Colors, type Weight } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export interface TxtProps extends TextProps {
  w?: Weight;
  size?: number;
  /** Chiave del tema (es. "muted") o colore esplicito */
  color?: keyof Colors | (string & {});
  center?: boolean;
  tnum?: boolean;
  /** Font dei titoli (Barlow Condensed corsivo maiuscolo). Di default: pesi 800/900 da DISPLAY_MIN_SIZE in su */
  display?: boolean;
}

export function Txt({ w = 400, size = 15, color, center, tnum, display, style, ...rest }: TxtProps) {
  const { c } = useTheme();
  const resolved = color ? ((c as unknown as Record<string, string>)[color] ?? color) : c.text;
  const isDisplay = display ?? (w >= 800 && size >= DISPLAY_MIN_SIZE);

  if (isDisplay) {
    const fontSize = Math.round(size * DISPLAY_SCALE);
    // le spaziature negative pensate per Inter fanno toccare le lettere del condensato
    const { letterSpacing, lineHeight } = StyleSheet.flatten(style) ?? {};
    return (
      <Text
        {...rest}
        style={[
          { fontFamily: DISPLAY[w >= 900 ? 900 : 800], fontSize, color: resolved, lineHeight: Math.round(fontSize * 1.1), textTransform: 'uppercase', paddingRight: Math.ceil(fontSize * 0.05) },
          center && { textAlign: 'center' },
          tnum && { fontVariant: ['tabular-nums'] },
          style,
          { letterSpacing: Math.max(0, letterSpacing ?? 0) },
          lineHeight != null && { lineHeight: Math.round(lineHeight * DISPLAY_SCALE) },
        ]}
      />
    );
  }

  return (
    <Text
      {...rest}
      style={[
        { fontFamily: FONT[w], fontSize: size, color: resolved, lineHeight: Math.round(size * 1.3) },
        center && { textAlign: 'center' },
        tnum && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
