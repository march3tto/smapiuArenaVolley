import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { blue, palette } from '@/theme/colors';

const W = 76;
const H = 34;
const KNOB = H - 6;

/** Cielo di giorno e di notte: tinte piene della palette blu */
const DAY = blue[200];
const NIGHT = blue[800];
const STARS = [
  { x: 10, y: 8, s: 2.5 }, { x: 20, y: 20, s: 2 }, { x: 31, y: 9, s: 3 }, { x: 14, y: 26, s: 1.5 }, { x: 38, y: 22, s: 2 },
];
const CLOUDS = [
  { x: 40, y: 22, s: 16 }, { x: 52, y: 17, s: 20 }, { x: 64, y: 21, s: 18 },
];

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
        <Animated.View style={{ position: 'absolute', top: 3, left: 3, width: KNOB, height: KNOB,
          transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, W - KNOB - 6] }) }] }}>
          <Animated.View style={[fill, { borderRadius: KNOB / 2, backgroundColor: palette.gold, opacity: day }]} />
          <Animated.View style={[fill, { borderRadius: KNOB / 2, backgroundColor: blue[100], opacity: night }]}>
            <View style={{ position: 'absolute', left: 6, top: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: blue[300] }} />
            <View style={{ position: 'absolute', left: 13, top: 15, width: 9, height: 9, borderRadius: 5, backgroundColor: blue[300] }} />
            <View style={{ position: 'absolute', left: 18, top: 7, width: 4, height: 4, borderRadius: 2, backgroundColor: blue[300] }} />
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}
