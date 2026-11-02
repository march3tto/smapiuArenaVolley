import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';

/** Trama a rete (linee incrociate, tinta piena): dietro il numero di maglia dell'MVP e sui punteggi nascosti */
export function Mesh({ width, height = width, color }: { width: number; height?: number; color: string }) {
  const id = useId();
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse">
          <Path d="M0 6L6 0M-1 1L1 -1M5 7L7 5M0 0L6 6" stroke={color} strokeWidth={0.8} />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Punteggio coperto dalla trama a rete, con lo stesso ingombro del numero: si usa mentre è aperto il video della diretta
 * (video e livescore FIPAV sono spesso sfasati, così il punteggio non anticipa né contraddice il video).
 */
export function HiddenScore({ width, height, radius = 8 }: { width: number; height: number; radius?: number }) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel="Punteggio nascosto mentre guardi il video"
      style={{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.lineStrong }}>
      <Mesh width={width} height={height} color={c.line} />
    </View>
  );
}
