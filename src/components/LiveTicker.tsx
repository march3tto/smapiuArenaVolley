import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Velocità di scorrimento in px al secondo */
const SPEED = 60;

/** Striscia "breaking news" con l'ultima azione della cronaca che scorre da destra a sinistra */
export function LiveTicker({ text }: { text: string }) {
  const { c } = useTheme();
  const [boxW, setBoxW] = useState(0);
  const [textW, setTextW] = useState(0);
  const [still, setStill] = useState(false);
  const x = useRef(new Animated.Value(0)).current;

  // con "riduci movimento" attivo il testo resta fermo
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (still || !boxW || !textW) return;
    // ogni giro parte da fuori a destra ed esce del tutto a sinistra
    x.setValue(boxW);
    const anim = Animated.loop(
      Animated.timing(x, { toValue: -textW, duration: ((boxW + textW) / SPEED) * 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [still, boxW, textW, text, x]);

  return (
    <View accessible accessibilityLabel={`Ultima azione: ${text}`}
      style={{ flexDirection: 'row', height: 30, borderRadius: 8, overflow: 'hidden', backgroundColor: palette.gold }}>
      <View style={{ justifyContent: 'center', paddingHorizontal: 9, backgroundColor: c.live, zIndex: 1 }}>
        <Txt w={800} size={11} color="#FFFFFF" display={false} style={{ letterSpacing: 0.6 }}>ULTIMA AZIONE</Txt>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', overflow: 'hidden' }} onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
        {still ? (
          <Txt w={700} size={12.5} color={palette.onGold} numberOfLines={1} style={{ paddingHorizontal: 8 }}>{text}</Txt>
        ) : (
          // contenitore molto largo: il testo si misura sulla sua larghezza naturale, senza andare a capo
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4000, flexDirection: 'row', alignItems: 'center', transform: [{ translateX: x }] }}>
            <Txt w={700} size={12.5} color={palette.onGold} numberOfLines={1} onLayout={(e) => setTextW(e.nativeEvent.layout.width)}>{text}</Txt>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
