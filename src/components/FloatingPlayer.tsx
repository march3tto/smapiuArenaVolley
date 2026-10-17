import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, Maximize2, Minimize2, X } from 'lucide-react-native';
import { LiveDot } from './LiveDot';
import { Pressy } from './Pressy';
import { StreamView } from './StreamView';
import { Txt } from './Txt';
import { usePlayer } from '@/store/PlayerProvider';
import { useTheme } from '@/theme/ThemeProvider';

/** Altezza della barra dei comandi sotto il video (agganciato / finestrella) */
const BAR = 40;
const MINI_BAR = 30;
const MARGIN = 10;

/**
 * Player della diretta sopra tutta l'app. Agganciato allo spazio riservato nella schermata Live,
 * oppure ridotto a finestrella che si trascina dove si vuole e resta aperta cambiando schermata.
 * Il video è sempre lo stesso elemento: cambiando modalità non riparte.
 */
export function FloatingPlayer() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const { stream, title, minimized, dock, close, setMinimized } = usePlayer();
  const docked = !minimized && !!dock;

  const miniW = Math.min(240, Math.round(W * 0.56));
  const miniH = Math.round((miniW * 9) / 16) + MINI_BAR;
  // limiti della finestrella: dentro l'area sicura, sopra la barra delle schede
  const minX = MARGIN, maxX = W - miniW - MARGIN, minY = insets.top + MARGIN, maxY = H - miniH - insets.bottom - 80;

  const [pan] = useState(() => new Animated.ValueXY({ x: maxX, y: maxY }));
  const pos = useRef({ x: maxX, y: maxY });
  useEffect(() => {
    const id = pan.addListener((v) => { pos.current = v; });
    return () => pan.removeListener(id);
  }, [pan]);

  // rilasciata: resta dove la si lascia in verticale e si attacca al bordo più vicino
  const settle = useCallback(() => {
    const { x, y } = pos.current;
    const to = { x: x + miniW / 2 < W / 2 ? minX : maxX, y: Math.min(Math.max(y, minY), maxY) };
    Animated.spring(pan, { toValue: to, useNativeDriver: false, speed: 18, bounciness: 6 }).start();
  }, [pan, miniW, W, minX, maxX, minY, maxY]);

  // rotazione dello schermo o nuova dimensione: la finestrella rientra nei limiti
  useEffect(() => { settle(); }, [settle]);

  const responder = useMemo(() => PanResponder.create({
    // un tocco breve resta ai pulsanti; si trascina solo muovendo il dito
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      pan.setOffset(pos.current);
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (_, g) => pan.setValue({ x: g.dx, y: g.dy }),
    onPanResponderRelease: () => { pan.flattenOffset(); settle(); },
    onPanResponderTerminate: () => { pan.flattenOffset(); settle(); },
  }), [pan, settle]);

  if (!stream) return null;

  const expand = () => {
    setMinimized(false);
    // la schermata Live non è in primo piano: ci si torna e il player si aggancia lì
    if (!dock) router.push('/live');
  };

  const frame = docked
    ? { left: dock.x, top: dock.y, width: dock.w, height: dock.h, borderRadius: 16 }
    : { left: 0, top: 0, width: miniW, height: miniH, borderRadius: 14, transform: pan.getTranslateTransform() };

  return (
    <Animated.View
      {...(docked ? {} : responder.panHandlers)}
      style={[{ position: 'absolute', overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line },
        !docked && { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 }, frame]}>
      {/* in finestrella il video non prende i tocchi: si trascina tutta e un tocco la ingrandisce */}
      <View style={{ flex: 1 }} pointerEvents={docked ? 'auto' : 'none'}>
        <StreamView stream={stream} />
      </View>
      {!docked ? (
        <Pressy onPress={expand} accessibilityRole="button" accessibilityLabel="Ingrandisci la diretta"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: MINI_BAR }}>{null}</Pressy>
      ) : null}
      <View style={{ height: docked ? BAR : MINI_BAR, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
        <LiveDot />
        <Txt w={700} size={docked ? 13 : 11.5} numberOfLines={1} style={{ flex: 1, marginLeft: 4 }}>{title}</Txt>
        {docked ? (
          <>
            <BarButton label="Apri nel browser" onPress={() => WebBrowser.openBrowserAsync(stream.url).catch(() => undefined)}>
              <ExternalLink size={17} color={c.text} />
            </BarButton>
            <BarButton label="Riduci a finestrella" onPress={() => setMinimized(true)}>
              <Minimize2 size={17} color={c.text} />
            </BarButton>
          </>
        ) : (
          <BarButton label="Ingrandisci la diretta" small onPress={expand}>
            <Maximize2 size={14} color={c.text} />
          </BarButton>
        )}
        <BarButton label="Chiudi la diretta" small={!docked} onPress={close}>
          <X size={docked ? 18 : 15} color={c.text} />
        </BarButton>
      </View>
    </Animated.View>
  );
}

function BarButton({ children, label, onPress, small }: { children: ReactNode; label: string; onPress: () => void; small?: boolean }) {
  const { c } = useTheme();
  const s = small ? 24 : 32;
  return (
    <Pressy onPress={onPress} scaleTo={0.88} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill }}>
      {children}
    </Pressy>
  );
}

/**
 * Spazio del player nella schermata Live: comunica la sua posizione al player flottante, che ci si aggancia.
 * Lasciando la schermata (o aprendone un'altra sopra) il player diventa finestrella.
 */
export function PlayerSlot() {
  const { stream, minimized, setDock } = usePlayer();
  const navigation = useNavigation();
  const ref = useRef<View>(null);
  const focused = useRef(false);

  const measure = useCallback(() => {
    if (!focused.current) return;
    ref.current?.measureInWindow((x, y, w, h) => { if (w > 0 && h > 0) setDock({ x, y, w, h }); });
  }, [setDock]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    measure();
    return () => { focused.current = false; setDock(null); };
  }, [measure, setDock]));

  // durante l'animazione d'ingresso la posizione non è ancora quella finale: si rimisura a fine transizione
  useEffect(() => navigation.addListener('transitionEnd' as never, measure), [navigation, measure]);

  if (!stream || minimized) return null;
  // su schermi larghi il video non deve coprire mezza pagina
  return (
    <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 10 }}>
      {/* il riquadro misurato è quello interno, senza i margini: video 16:9 più la barra dei comandi */}
      <View ref={ref} collapsable={false} onLayout={measure}>
        <View style={{ aspectRatio: 16 / 9 }} />
        <View style={{ height: BAR }} />
      </View>
    </View>
  );
}