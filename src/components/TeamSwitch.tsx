import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { VolleyBall } from './VolleyBall';
import { blue, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImgSrc } from '@/types';

/** Binario 2:1 con il pallone come pomello: scorrendo da una squadra all'altra il pallone fa un giro su sé stesso */
const TRACK_W = 80;
const TRACK_H = 40;
const BORDER = 2;
const PAD = 2;
const BALL = TRACK_H - 2 * BORDER - 2 * PAD;
const TRAVEL = TRACK_W - 2 * BORDER - 2 * PAD - BALL;

interface Side<T extends string> {
  value: T;
  name: string;
  logo?: ImgSrc | null;
}

/** Interruttore tra due squadre: stemma e nome ai lati, la squadra scelta è evidenziata; si tocca un lato o l'interruttore */
export function TeamSwitch<T extends string>({ left, right, value, onChange }: { left: Side<T>; right: Side<T>; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  const onRight = value === right.value;
  const [x] = useState(() => new Animated.Value(onRight ? 1 : 0));
  useEffect(() => {
    Animated.spring(x, { toValue: onRight ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }, [onRight, x]);

  const label = (s: Side<T>, align: 'left' | 'right') => {
    const on = s.value === value;
    return (
      <Pressable onPress={() => onChange(s.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={s.name}
        style={{ flex: 1, minWidth: 0, flexDirection: align === 'left' ? 'row' : 'row-reverse', alignItems: 'center', gap: space.sm, opacity: on ? 1 : 0.5 }}>
        <TeamBadge name={s.name} logo={s.logo} size={28} />
        <Txt w={700} size={13} numberOfLines={2} style={{ flexShrink: 1, textAlign: align }}>{s.name}</Txt>
      </Pressable>
    );
  };

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {label(left, 'left')}
      <Pressable onPress={() => onChange(onRight ? left.value : right.value)} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: onRight }}
        accessibilityLabel={`Squadra mostrata: ${onRight ? right.name : left.name}. Tocca per passare a ${onRight ? left.name : right.name}`}
        style={{ width: TRACK_W, height: TRACK_H, borderRadius: TRACK_H / 2, padding: PAD, backgroundColor: blue[900], borderWidth: BORDER, borderColor: c.lineStrong, justifyContent: 'center' }}>
        <Animated.View style={{ width: BALL, height: BALL, transform: [
          { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] }) },
          { rotate: x.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
        ] }}>
          <VolleyBall size={BALL} />
        </Animated.View>
      </Pressable>
      {label(right, 'right')}
    </View>
  );
}
