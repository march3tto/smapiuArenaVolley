import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Radio } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Pallino della diretta, pieno e senza alone */
export function LiveDot({ size = 8, color }: { size?: number; color?: string }) {
  const { c } = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color ?? c.live }} />;
}

/** Icona "in onda" (antenna con onde) che pulsa, alternativa al pallino */
export function LiveSignal({ size = 16, color }: { size?: number; color?: string }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) }}>
      <Radio size={size} color={color ?? c.live} strokeWidth={2.5} />
    </Animated.View>
  );
}
