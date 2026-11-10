import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { SWITCH_H, SWITCH_PAD, SWITCH_W } from './ThemeSwitch';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const KNOB = SWITCH_H - SWITCH_PAD * 2;

/**
 * Interruttore dell'app, grande come quello dell'aspetto (ThemeSwitch) su iOS, Android e web:
 * acceso giallo con il pallino a destra, spento grigio con il pallino a sinistra; bordo blu nel tema chiaro, giallo nel tema scuro.
 */
export function AppSwitch({ value, onValueChange, disabled, accessibilityLabel }: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { c, mode } = useTheme();
  const [t] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.spring(t, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: 6 }).start();
  }, [value, t]);

  return (
    <Pressable onPress={() => onValueChange(!value)} disabled={disabled} hitSlop={6}
      accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} accessibilityLabel={accessibilityLabel}
      style={{ opacity: disabled ? 0.5 : 1 }}>
      <Animated.View style={{ width: SWITCH_W, height: SWITCH_H, borderRadius: SWITCH_H / 2,
        backgroundColor: t.interpolate({ inputRange: [0, 1], outputRange: [c.fill2, palette.gold] }) }}>
        <Animated.View style={{ position: 'absolute', top: SWITCH_PAD, left: SWITCH_PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#fff',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2,
          transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, SWITCH_W - KNOB - SWITCH_PAD * 2] }) }] }} />
        {/* bordo come quello dell'aspetto, sopra il disegno (non sposta il pallino): blu nel tema chiaro, giallo nel tema scuro */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: SWITCH_H / 2, borderWidth: 1.5,
          borderColor: mode === 'dark' ? palette.gold : palette.blue }} />
      </Animated.View>
    </Pressable>
  );
}
