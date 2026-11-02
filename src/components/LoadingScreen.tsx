import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BallSprite } from './BallSprite';
import { Txt } from './Txt';
import { LOGO_AVT, LOGO_SMAPIU } from '@/data/assets';
import { blue, palette } from '@/theme/colors';

/** Proporzioni dei due loghi (larghezza / altezza dei PNG) */
const AVT_RATIO = 393 / 381;
const SMAPIU_RATIO = 502 / 226;
/** Altezza (in frazione dello schermo) dove il pallone tocca terra durante l'ingresso e poi come loader */
const IMPACT_Y = 0.4;
const LOADER_Y = 0.78;
/** Momenti dei due rimbalzi d'ingresso, per le onde d'urto */
const SHOCKS = [580, 720, 1100];

/**
 * Schermata di caricamento all'avvio: il pallone cade e rimbalza due volte, compare il logo Arena Volley Team
 * in basso, poi Smapiù in alto; infine il pallone scende e rimbalza come indicatore finché i dati non sono pronti.
 * onIntroEnd segnala la fine dell'ingresso, così l'app non lo interrompe a metà.
 */
export function LoadingScreen({ onIntroEnd }: { onIntroEnd?: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [still, setStill] = useState<boolean | null>(null);
  const endRef = useRef(onIntroEnd);
  useEffect(() => { endRef.current = onIntroEnd; }, [onIntroEnd]);

  // valori animati creati una volta sola
  const [v] = useState(() => ({
    ballX: new Animated.Value(0),
    ballY: new Animated.Value(-0.2),
    ballScale: new Animated.Value(1.6),
    bounce: new Animated.Value(0),
    squash: new Animated.Value(0),
    shadow: new Animated.Value(0),
    shocks: SHOCKS.map(() => new Animated.Value(0)),
    arena: new Animated.Value(0),
    smapiu: new Animated.Value(0),
    label: new Animated.Value(0),
    dots: [0, 1, 2].map(() => new Animated.Value(0.2)),
  }));

  // con "riduci movimento" attivo si mostra subito la schermata finale
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => setStill(false));
  }, []);

  useEffect(() => {
    if (still === null) return;
    if (still) {
      v.ballY.setValue(LOADER_Y);
      v.ballScale.setValue(1);
      [v.shadow, v.arena, v.smapiu, v.label, ...v.dots].forEach((a) => a.setValue(1));
      endRef.current?.();
      return;
    }
    const t = (value: Animated.Value, toValue: number, duration: number, easing: (x: number) => number = Easing.inOut(Easing.quad)) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });

    // caduta, due rimbalzi al centro, poi giù fino al loader con una curva verso destra
    const ballIntro = Animated.sequence([
      t(v.ballY, IMPACT_Y, 576, Easing.in(Easing.quad)),
      t(v.ballY, IMPACT_Y - 0.1, 288, Easing.out(Easing.quad)),
      t(v.ballY, IMPACT_Y, 240, Easing.in(Easing.quad)),
      Animated.parallel([
        Animated.sequence([t(v.ballX, 0.34, 432), t(v.ballX, 0, 864)]),
        Animated.sequence([t(v.ballY, IMPACT_Y - 0.02, 432), t(v.ballY, LOADER_Y, 864, Easing.in(Easing.quad))]),
        Animated.sequence([t(v.ballScale, 1.15, 432), t(v.ballScale, 1, 864)]),
      ]),
    ]);
    // rimbalzo continuo, schiacciato quando tocca terra
    const bounceLoop = Animated.loop(Animated.sequence([
      Animated.parallel([t(v.bounce, 1, 450, Easing.out(Easing.quad)), t(v.squash, 0, 110, Easing.out(Easing.quad))]),
      t(v.bounce, 0, 450, Easing.in(Easing.quad)),
      t(v.squash, 1, 60, Easing.linear),
    ]));
    const dotLoops = v.dots.map((d, i) => Animated.sequence([
      Animated.delay(i * 200),
      Animated.loop(Animated.sequence([t(d, 1, 480), t(d, 0.2, 720)])),
    ]));

    const intro = Animated.parallel([
      ...v.shocks.map((s, i) => Animated.sequence([Animated.delay(SHOCKS[i]), t(s, 1, 1100, Easing.out(Easing.quad))])),
      Animated.sequence([Animated.delay(1000), t(v.arena, 1, 900, Easing.bezier(0.2, 0.9, 0.25, 1.15))]),
      Animated.sequence([Animated.delay(1750), t(v.smapiu, 1, 1000, Easing.bezier(0.2, 0.9, 0.25, 1.1))]),
      Animated.sequence([Animated.delay(2100), t(v.shadow, 1, 300)]),
      Animated.sequence([Animated.delay(2500), t(v.label, 1, 500)]),
    ]);

    ballIntro.start(({ finished }) => { if (finished) bounceLoop.start(); });
    intro.start(({ finished }) => {
      if (!finished) return;
      dotLoops.forEach((d) => d.start());
      endRef.current?.();
    });
    return () => {
      [ballIntro, bounceLoop, intro, ...dotLoops].forEach((a) => a.stop());
    };
  }, [still, v]);

  const B = Math.min(W * 0.15, 80);
  const avtW = Math.min(W * 0.4, 220);
  const smapiuW = Math.min(W * 0.84, 460);
  const ringW = W * 1.1;

  return (
    <View style={{ flex: 1, backgroundColor: blue[900], overflow: 'hidden' }} accessibilityLabel="Caricamento in corso">
      <StatusBar style="light" />

      {/* Arena Volley Team: compare per primo, piccolo, in basso */}
      <Animated.View style={{
        position: 'absolute', top: H * 0.51, left: (W - avtW) / 2, width: avtW, height: avtW / AVT_RATIO,
        opacity: v.arena,
        transform: [{ scale: v.arena.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
      }}>
        <Image source={LOGO_AVT} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>

      {/* Smapiù: compare dopo, grande, in alto */}
      <Animated.View style={{
        position: 'absolute', top: H * 0.15, left: (W - smapiuW) / 2, width: smapiuW, height: smapiuW / SMAPIU_RATIO,
        opacity: v.smapiu,
        transform: [
          { translateY: v.smapiu.interpolate({ inputRange: [0, 1], outputRange: [-H * 0.06, 0] }) },
          { scale: v.smapiu.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ],
      }}>
        <Image source={LOGO_SMAPIU} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>

      {/* onde d'urto nel punto in cui il pallone tocca terra */}
      {v.shocks.map((s, i) => (
        <Animated.View key={i} pointerEvents="none" style={{
          // cerchio schiacciato in prospettiva: un'ellisse vera, non una pillola
          position: 'absolute', left: (W - ringW) / 2, top: H * IMPACT_Y + B * 1.3 - ringW / 2,
          width: ringW, height: ringW, borderRadius: ringW / 2,
          borderWidth: 2, borderColor: i === 1 ? palette.white : palette.gold,
          opacity: s.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.9, 0] }),
          transform: [{ scaleY: 0.35 }, { scale: s.interpolate({ inputRange: [0, 1], outputRange: [0.045, 1] }) }],
        }} />
      ))}

      {/* ombra del pallone sul "pavimento" del loader */}
      <Animated.View style={{
        position: 'absolute', top: H * LOADER_Y + B * 0.94, left: (W - B * 0.93) / 2,
        width: B * 0.93, height: B * 0.15, borderRadius: B,
        backgroundColor: 'rgba(0,0,0,0.45)',
        opacity: Animated.multiply(v.shadow, v.bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] })),
        transform: [{ scale: v.bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }],
      }} />

      {/* pallone */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: (W - B) / 2, width: B, height: B,
        transform: [
          { translateX: Animated.multiply(v.ballX, W) },
          { translateY: Animated.multiply(v.ballY, H) },
          { scale: v.ballScale },
        ],
      }}>
        <Animated.View style={{
          transformOrigin: 'bottom',
          transform: [
            { translateY: v.bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -H * 0.07] }) },
            { scaleX: v.squash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            { scaleY: v.squash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) },
          ],
        }}>
          <BallSprite size={B} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 28, flexDirection: 'row', justifyContent: 'center', opacity: v.label }}>
        <Txt w={600} size={12} color="rgba(255,255,255,0.6)" style={{ letterSpacing: 4 }}>CARICAMENTO</Txt>
        {v.dots.map((d, i) => (
          <Animated.View key={i} style={{ opacity: d }}>
            <Txt w={600} size={12} color="rgba(255,255,255,0.6)" style={{ letterSpacing: 4 }}>.</Txt>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}
