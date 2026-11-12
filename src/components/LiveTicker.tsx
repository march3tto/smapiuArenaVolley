import { Fragment, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { Txt } from './Txt';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Velocità di scorrimento in px al secondo */
const SPEED = 60;

/** Striscia "breaking news" che scorre da destra a sinistra (ultima azione della cronaca, punteggi live...) */
/** Pezzo di testo della striscia: `strong` lo mette in grassetto (es. la nostra partita) */
export interface TickerSegment { text: string; strong?: boolean }

/** Spazio largo con un pallino tra un pezzo e l'altro */
const SEP = '\u2003\u2003●\u2003\u2003';

export function LiveTicker({ text, label = 'ULTIMA AZIONE', segments }: { text: string; label?: string; segments?: TickerSegment[] }) {
  const { c } = useTheme();
  const [boxW, setBoxW] = useState(0);
  const [textW, setTextW] = useState(0);
  const [still, setStill] = useState(false);
  const x = useState(() => new Animated.Value(0))[0];

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

  // con i segmenti: separatore a pallino e grassetto dove richiesto (dentro un unico Text, così si misura e scorre tutto insieme)
  const body = segments?.length
    ? segments.map((sg, i) => (
      <Fragment key={i}>
        {i ? SEP : ''}
        <Txt w={sg.strong ? 900 : 500} size={12.5} color={palette.onGold} display={false}>{sg.text}</Txt>
      </Fragment>
    ))
    : text;

  return (
    <View accessible accessibilityLabel={`${label.charAt(0)}${label.slice(1).toLowerCase()}: ${text}`}
      style={{ flexDirection: 'row', height: 30, borderRadius: 8, overflow: 'hidden', backgroundColor: palette.gold }}>
      <View style={{ justifyContent: 'center', paddingHorizontal: space.sm, backgroundColor: c.live, zIndex: 1 }}>
        <Txt w={800} size={11} color="#FFFFFF" display={false} style={{ letterSpacing: 0.6 }}>{label}</Txt>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', overflow: 'hidden' }} onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
        {still ? (
          <Txt w={700} size={12.5} color={palette.onGold} numberOfLines={1} style={{ paddingHorizontal: space.sm }}>{body}</Txt>
        ) : (
          // contenitore molto largo: il testo si misura sulla sua larghezza naturale, senza andare a capo
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4000, flexDirection: 'row', alignItems: 'center', transform: [{ translateX: x }] }}>
            <Txt w={700} size={12.5} color={palette.onGold} numberOfLines={1} onLayout={(e) => setTextW(e.nativeEvent.layout.width)}>{body}</Txt>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
