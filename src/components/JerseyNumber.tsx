import type { StyleProp, TextStyle } from 'react-native';
import { Txt } from './Txt';

/** Numero di maglia "#14": stesso font e colore nella miniatura e nella scheda della giocatrice */
export function JerseyNumber({ value, size, style }: { value: number; size: number; style?: StyleProp<TextStyle> }) {
  return (
    <Txt w={900} size={size} color="rgba(242,184,0,0.85)" style={[{ letterSpacing: -size * 0.057, lineHeight: size }, style]}>
      #{value}
    </Txt>
  );
}
