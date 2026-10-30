import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { DISPLAY, DISPLAY_LINE, DISPLAY_SCALE, displayIosShift, FONT, palette } from '@/theme/colors';
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
  const display = weight >= 800;
  const fontSize = display ? Math.round(size * DISPLAY_SCALE) : size;
  return (
    <Animated.Text
      style={{
        fontFamily: display ? DISPLAY[weight === 900 ? 900 : 800] : FONT[weight],
        fontSize,
        lineHeight: display ? Math.round(fontSize * DISPLAY_LINE) : fontSize * 1.05,
        letterSpacing: display ? 0 : -size * 0.03,
        fontVariant: ['tabular-nums'],
        color: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [palette.gold, palette.gold, c.text] }),
        opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
        // su iOS il numero in Saira va abbassato per restare centrato nella riga (vedi DISPLAY_LINE)
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [size * 0.4, 0] }) },
          { translateY: display && Platform.OS === 'ios' ? Math.round(fontSize * displayIosShift(DISPLAY_LINE)) : 0 }],
      }}
    >
      {value}
    </Animated.Text>
  );
}
