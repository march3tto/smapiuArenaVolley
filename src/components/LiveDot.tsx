import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function LiveDot({ size = 8, color }: { size?: number; color?: string }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const col = color ?? c.live;
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: 'absolute', width: size, height: size, borderRadius: size, backgroundColor: col,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: col }} />
    </View>
  );
}
