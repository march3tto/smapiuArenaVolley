import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { blue, palette } from '@/theme/colors';

/** Scala dell'interruttore: 0.8 = 20% più piccolo del disegno originale (76×34) */
const S = 0.8;
/** Misure condivise con AppSwitch: tutti gli interruttori dell'app sono grandi uguali */
export const SWITCH_W = 76 * S;
export const SWITCH_H = 34 * S;
export const SWITCH_PAD = 3 * S;
const W = SWITCH_W;
const H = SWITCH_H;
/** Margine del sole/luna dal bordo */
const PAD = SWITCH_PAD;
const KNOB = H - PAD * 2;

/** Cielo di giorno e di notte: tinte piene della palette blu */
const DAY = blue[200];
const NIGHT = blue[800];
const scale = (d: { x: number; y: number; s: number }) => ({ x: d.x * S, y: d.y * S, s: d.s * S });
const STARS = [
  { x: 10, y: 8, s: 2.5 }, { x: 20, y: 20, s: 2 }, { x: 31, y: 9, s: 3 }, { x: 14, y: 26, s: 1.5 }, { x: 38, y: 22, s: 2 },
].map(scale);
const CLOUDS = [
  { x: 40, y: 22, s: 16 }, { x: 52, y: 17, s: 20 }, { x: 64, y: 21, s: 18 },
].map(scale);
/** Crateri della luna */
const CRATERS = [{ x: 6, y: 6, s: 7 }, { x: 13, y: 15, s: 9 }, { x: 18, y: 7, s: 4 }].map(scale);

/**
 * Interruttore della modalità scura illustrato: di giorno sole a sinistra su cielo chiaro con nuvole,
 * di notte luna a destra su cielo scuro con le stelle. Il passaggio scorre e sfuma.
 */
export function ThemeSwitch({ dark, onChange }: { dark: boolean; onChange: (dark: boolean) => void }) {
  const [t] = useState(() => new Animated.Value(dark ? 1 : 0));
  useEffect(() => {
    Animated.spring(t, { toValue: dark ? 1 : 0, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
  }, [dark, t]);

  const night = t;
  const day = t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

  return (
    <Pressable onPress={() => onChange(!dark)} accessibilityRole="switch" accessibilityState={{ checked: dark }} accessibilityLabel="Modalità scura" hitSlop={6}>
      <View style={{ width: W, height: H, borderRadius: H / 2, overflow: 'hidden' }}>
        {/* giorno */}
        <Animated.View style={[fill, { opacity: day }]}>
          <View style={[fill, { backgroundColor: DAY }]} />
          {CLOUDS.map((c, i) => (
            <View key={i} style={{ position: 'absolute', left: c.x, top: c.y, width: c.s, height: c.s, borderRadius: c.s / 2, backgroundColor: '#FFFFFF' }} />
          ))}
        </Animated.View>
        {/* notte */}
        <Animated.View style={[fill, { opacity: night }]}>
          <View style={[fill, { backgroundColor: NIGHT }]} />
          {STARS.map((s, i) => (
            <View key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: s.s / 2, backgroundColor: '#FFFFFF' }} />
          ))}
        </Animated.View>
        {/* sole ↔ luna */}
        <Animated.View style={{ position: 'absolute', top: PAD, left: PAD, width: KNOB, height: KNOB,
          transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, W - KNOB - PAD * 2] }) }] }}>
          <Animated.View style={[fill, { borderRadius: KNOB / 2, backgroundColor: palette.gold, opacity: day }]} />
          <Animated.View style={[fill, { borderRadius: KNOB / 2, backgroundColor: blue[100], opacity: night }]}>
            {CRATERS.map((k, i) => (
              <View key={i} style={{ position: 'absolute', left: k.x, top: k.y, width: k.s, height: k.s, borderRadius: k.s / 2, backgroundColor: blue[300] }} />
            ))}
          </Animated.View>
        </Animated.View>
        {/* bordo sopra il disegno (non sposta sole e luna): blu di giorno, giallo di notte */}
        <View pointerEvents="none" style={[fill, { borderRadius: H / 2, borderWidth: 1.5, borderColor: dark ? palette.gold : palette.blue }]} />
      </View>
    </Pressable>
  );
}
