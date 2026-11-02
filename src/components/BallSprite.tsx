import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { BALL_SPRITE } from '@/data/assets';

const COLS = 6;
const FRAMES = COLS * COLS;

/* per ogni fotogramma due punti con lo stesso valore: l'interpolazione va a scatti, non scorre */
const input: number[] = [];
const outX: number[] = [];
const outY: number[] = [];
for (let n = 0; n < FRAMES; n++) {
  input.push(n, n + 0.999);
  outX.push(-(n % COLS), -(n % COLS));
  outY.push(-Math.floor(n / COLS), -Math.floor(n / COLS));
}

/** Pallone da pallavolo bianco in 3D che ruota su sé stesso (fotogrammi pre-renderizzati, illuminazione fissa) */
export function BallSprite({ size, spinning = true, turnMs = 1100 }: { size: number; spinning?: boolean; turnMs?: number }) {
  const [frame] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!spinning) return;
    const anim = Animated.loop(
      Animated.timing(frame, { toValue: FRAMES, duration: turnMs, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [spinning, turnMs, frame]);

  const tx = frame.interpolate({ inputRange: input, outputRange: outX.map((v) => v * size), extrapolate: 'clamp' });
  const ty = frame.interpolate({ inputRange: input, outputRange: outY.map((v) => v * size), extrapolate: 'clamp' });

  return (
    <View style={{ width: size, height: size, overflow: 'hidden', borderRadius: size / 2 }}>
      <Animated.Image
        source={BALL_SPRITE}
        style={{ width: size * COLS, height: size * COLS, transform: [{ translateX: tx }, { translateY: ty }] }}
      />
    </View>
  );
}
