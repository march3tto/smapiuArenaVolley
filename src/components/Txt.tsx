import { Text, type TextProps } from 'react-native';
import { FONT, type Colors, type Weight } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export interface TxtProps extends TextProps {
  w?: Weight;
  size?: number;
  /** Chiave del tema (es. "muted") o colore esplicito */
  color?: keyof Colors | (string & {});
  center?: boolean;
  tnum?: boolean;
}

export function Txt({ w = 400, size = 15, color, center, tnum, style, ...rest }: TxtProps) {
  const { c } = useTheme();
  const resolved = color ? ((c as unknown as Record<string, string>)[color] ?? color) : c.text;
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
