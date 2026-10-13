import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Court } from './LineupPanel';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { POINT_ACTIONS, type PointDetail } from '@/store/LiveProvider';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer } from '@/types';

/** Rettangolo del pulsante + in coordinate di finestra: il riquadro si apre da lì */
export interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GUTTER = 12;

/**
 * Riquadro del punto: campo con lo Starting Six della squadra (giocatrice facoltativa) e azioni di gioco.
 * Toccando un'azione il punto viene assegnato; "Solo punto" lo assegna senza dettagli.
 */
export function PointPicker({ anchor, team, players, onScore, onClose }: {
  anchor: Anchor;
  team: string;
  players: LineupPlayer[];
  onScore: (detail?: PointDetail) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [picked, setPicked] = useState<LineupPlayer | null>(null);
  const t = useRef(new Animated.Value(0)).current;
  const starters = players.filter((p) => p.zone != null);

  const width = Math.min(340, win.width - GUTTER * 2);
  const ax = anchor.x + anchor.w / 2;
  const ay = anchor.y + anchor.h / 2;
  const left = Math.min(Math.max(ax - width / 2, GUTTER), win.width - width - GUTTER);
  const h = size?.h ?? 0;
  // sotto il pulsante se c'è spazio, altrimenti spinto in su quanto basta
  const top = Math.max(insets.top + GUTTER, Math.min(anchor.y + anchor.h + 8, win.height - insets.bottom - GUTTER - h));
  // spostamento dal centro del riquadro al centro del pulsante: da lì parte l'animazione
  const dx = ax - (left + width / 2);
  const dy = ay - (top + h / 2);

  useEffect(() => {
    if (size) Animated.spring(t, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [size, t]);

  const close = (after?: () => void) => {
    after?.();
    Animated.timing(t, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => onClose());
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,26,56,0.45)', opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
        <Pressable onPress={() => close()} accessibilityRole="button" accessibilityLabel="Chiudi" style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        onLayout={(e) => !size && setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{
          position: 'absolute', left, top, width, gap: 12, padding: 14,
          backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line,
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
          opacity: size ? t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }) : 0,
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
          ],
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt w={700} size={15} numberOfLines={1}>Punto {team}</Txt>
            <Txt size={12} color="muted" numberOfLines={1}>
              {picked ? `${picked.number != null ? `#${picked.number} ` : ''}${picked.name}` : starters.length ? 'Chi ha fatto punto? (facoltativo)' : 'Starting Six non inserito'}
            </Txt>
          </View>
          <Pressy onPress={() => close()} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Chiudi"
            style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
            <X size={16} color={c.text} />
          </Pressy>
        </View>

        <Court big players={starters} selectedId={picked?.id} onPick={(p) => setPicked((cur) => (cur?.id === p.id ? null : p))} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {POINT_ACTIONS.map((a) => (
            <Pressy key={a.value} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={`${a.label}, assegna il punto`}
              onPress={() => close(() => onScore({ action: a.value, player: picked?.name }))}
              style={{ flexGrow: 1, flexBasis: '45%', height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
              <Txt w={700} size={14} color={palette.onGold}>{a.label}</Txt>
            </Pressy>
          ))}
        </View>
        <Pressy onPress={() => close(() => onScore())} scaleTo={0.96} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 10 }}>
          <Txt w={600} size={12.5} color="muted">Solo punto, senza dettagli</Txt>
        </Pressy>
      </Animated.View>
    </Modal>
  );
}
