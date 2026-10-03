import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { FONT, palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Numero che "salta" e si colora d'oro quando cambia */
export function AnimatedNumber({ value, size, weight = 800 }: { value: number; size: number; weight?: 700 | 800 | 900 }) {
  const { c } = useTheme();
  const anim = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: false, speed: 14, bounciness: 10 }).start();
  }, [value, anim]);
  return (
    <Animated.Text
      style={{
        fontFamily: FONT[weight],
        fontSize: size,
        lineHeight: size * 1.05,
        letterSpacing: -size * 0.03,
        fontVariant: ['tabular-nums'],
        color: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [palette.gold, palette.gold, c.text] }),
        opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [size * 0.4, 0] }) }],
      }}
    >
      {value}
    </Animated.Text>
  );
}
