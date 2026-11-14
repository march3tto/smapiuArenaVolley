import { useEffect, useRef, useState, type ComponentRef, type ComponentType } from 'react';
import { Animated, Modal, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Check, Ellipsis, House, Newspaper, Users } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { ScoreboardIcon } from './ScoreboardIcon';
import { useToast } from './Toast';
import { Txt } from './Txt';
import { AVATARS, avatarLabel, useAssistantAvatar } from '@/lib/avatar';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

type TabIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const ICONS: Record<string, TabIcon> = {
  index: House,
  risultati: ScoreboardIcon,
  squadra: Users,
  news: Newspaper,
  altro: Ellipsis,
};

/** Dimensione delle icone della barra */
const ICON_SIZE = 22;
/** Icone più grandi del normale (ICON_SIZE): il tabellone dei risultati è largo e basso, a parità di misura sembra più piccolo */
const ICON_SCALE: Record<string, number> = { risultati: 1.15 };

/** Tab nascoste dalla barra (la schermata resta, ma non c'è il pulsante) */
const HIDDEN = new Set(['giovanili']);

/** Barra: altezza, raggio degli angoli e margine interno */
const BAR_H = 64;
const BAR_R = 24;
const BAR_PAD = 6;
/** Pulsante dell'assistente: cerchio sospeso nell'incavo al centro della barra */
const FAB = 60;
/** Il centro del cerchio sta un po' sopra il bordo della barra */
const FAB_LIFT = 10;
/** Incavo: cerchio poco più grande del pulsante, con raccordi morbidi sul bordo */
const NOTCH_R = FAB / 2 + 7;
const NOTCH_FILLET = 10;
/** Le icone scendono un po': quella centrale resta sotto il cerchio dell'assistente, non coperta */
const ICON_DROP = 8;
/** Spinta in più verso il basso per l'icona centrale (Squadra), sotto il cerchio */
const CENTER_ICON_DROP = 5;
/** Indicatore della tab centrale: parte sotto l'incavo (fondo dell'incavo + margine) */
const CENTER_TOP = NOTCH_R - FAB_LIFT + 1;

/**
 * Contorno della barra con l'incavo al centro (coordinate con y verso il basso, bordo superiore a y = 0).
 * L'incavo è un cerchio di raggio NOTCH_R centrato in (cx, -FAB_LIFT); i raccordi sono cerchi di raggio NOTCH_FILLET
 * tangenti al bordo superiore e all'incavo.
 */
function barPath(w: number) {
  const h = BAR_H;
  const r = BAR_R;
  const cx = w / 2;
  const d = FAB_LIFT;
  const f = NOTCH_FILLET;
  const R = NOTCH_R;
  // centro del raccordo sinistro: (cx - dx, f), a distanza R + f dal centro dell'incavo
  const dx = Math.sqrt((R + f) ** 2 - (f + d) ** 2);
  // punto in cui il raccordo tocca l'incavo
  const k = R / (R + f);
  const tx = dx * k;
  const ty = -d + (f + d) * k;
  return [
    `M ${r} 0`,
    `L ${cx - dx} 0`,
    `A ${f} ${f} 0 0 1 ${cx - tx} ${ty}`,
    `A ${R} ${R} 0 0 0 ${cx + tx} ${ty}`,
    `A ${f} ${f} 0 0 1 ${cx + dx} 0`,
    `L ${w - r} 0`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');
}

/** Barra inferiore flottante: tab in fila, l'assistente nel cerchio sospeso sopra quella centrale, indicatore oro che scivola */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { c, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [barW, setBarW] = useState(0);
  const x = useState(() => new Animated.Value(0))[0];
  // l'indicatore si accorcia sotto l'incavo (tab centrale): si sposta in giù il suo bordo superiore
  const top = useState(() => new Animated.Value(0))[0];
  const routes = state.routes.filter((r) => !HIDDEN.has(r.name));
  const center = Math.floor(routes.length / 2);
  const innerW = Math.max(0, barW - BAR_PAD * 2);
  const itemW = routes.length ? innerW / routes.length : 0;
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = routes.findIndex((r) => r.key === activeKey);

  useEffect(() => {
    if (!barW || activeIndex < 0) return;
    Animated.spring(x, { toValue: activeIndex * itemW, useNativeDriver: true, speed: 16, bounciness: 10 }).start();
    Animated.spring(top, { toValue: activeIndex === center ? CENTER_TOP - BAR_PAD : 0, useNativeDriver: true, speed: 16, bounciness: 4 }).start();
  }, [activeIndex, center, itemW, barW, x, top]);

  // fondo pieno (la forma con l'incavo non si può sfocare): stessi colori della barra di prima, quasi opachi
  const fill = Platform.OS === 'android' ? c.card : mode === 'dark' ? 'rgba(34,77,146,0.97)' : 'rgba(255,255,255,0.97)';

  const tab = (route: (typeof routes)[number], i: number) => {
    const focused = route.key === activeKey;
    const { options } = descriptors[route.key];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const Icon = ICONS[route.name] ?? House;
    const color = focused ? palette.onGold : c.muted;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    // solo icona: il nome resta per VoiceOver/TalkBack
    return (
      <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: ICON_DROP + (i === center ? CENTER_ICON_DROP * 2 : 0) }}>
        <Icon size={Math.round(ICON_SIZE * (ICON_SCALE[route.name] ?? 1))} color={color} strokeWidth={focused ? 2.4 : 2} />
      </Pressable>
    );
  };

  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom: insets.bottom + 10, alignItems: 'center' }} pointerEvents="box-none">
      <View style={{ width: '100%', maxWidth: 560, height: BAR_H }} pointerEvents="box-none" onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        {barW > 0 ? (
          <Svg width={barW} height={BAR_H} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
            <Path d={barPath(barW)} fill={fill} stroke={c.line} strokeWidth={1} />
          </Svg>
        ) : null}
        <View style={{ flex: 1, flexDirection: 'row', padding: BAR_PAD }}>
          {barW > 0 && activeIndex >= 0 ? (
            // altezza fissa e taglio in alto con translateY + overflow: si anima con il driver nativo
            <Animated.View style={{ position: 'absolute', top: BAR_PAD, bottom: BAR_PAD, left: BAR_PAD, width: itemW, borderRadius: 18, overflow: 'hidden', transform: [{ translateX: x }] }}>
              <Animated.View style={{ flex: 1, borderRadius: 18, backgroundColor: palette.gold, transform: [{ translateY: top }] }} />
            </Animated.View>
          ) : null}
          {routes.map(tab)}
        </View>
        {/* assistente: cerchio oro sospeso nell'incavo */}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: -FAB_LIFT - FAB / 2, alignItems: 'center' }}>
          <AssistantButton />
        </View>
      </View>
    </View>
  );
}

/** Pulsante dell'assistente AI al centro della barra: il suo avatar apre la chat; tenendolo premuto si sceglie il volto */
function AssistantButton() {
  const router = useRouter();
  const { source } = useAssistantAvatar();
  const ref = useRef<ComponentRef<typeof View>>(null);
  // posizione del pulsante sullo schermo: il selettore si apre subito sopra
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const { width: winW, height: winH } = useWindowDimensions();

  const openPicker = () => {
    ref.current?.measureInWindow((x, y, w) => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // griglia centrata sopra il pulsante, senza uscire dallo schermo
      const left = Math.min(Math.max(x + w / 2 - PICKER_W / 2, space.md), winW - PICKER_W - space.md);
      setAnchor({ left, bottom: winH - y + space.md });
    });
  };

  return (
    <>
      <View ref={ref} collapsable={false} style={{ borderRadius: FAB / 2, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
        <Pressy onPress={() => router.push('/assistente')} onLongPress={openPicker} delayLongPress={350} scaleTo={0.9}
          accessibilityRole="button" accessibilityLabel="Assistente" accessibilityHint="Tieni premuto per scegliere l'avatar" hitSlop={4}
          style={{ width: FAB, height: FAB, borderRadius: FAB / 2, overflow: 'hidden', backgroundColor: palette.gold }}>
          <Image source={source} style={{ width: FAB, height: FAB }} contentFit="cover" accessibilityIgnoresInvertColors />
        </Pressy>
      </View>
      <Modal visible={!!anchor} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setAnchor(null)}>
        {/* sfondo trasparente: la schermata resta visibile, un tocco fuori chiude */}
        <Pressable style={{ flex: 1 }} onPress={() => setAnchor(null)} accessibilityLabel="Chiudi scelta avatar">
          {anchor ? <AvatarPicker anchor={anchor} onDone={() => setAnchor(null)} /> : null}
        </Pressable>
      </Modal>
    </>
  );
}

const PICK = 46;
const PICK_GAP = space.sm;
const PER_ROW = 4;
const PICKER_W = PER_ROW * PICK + (PER_ROW - 1) * PICK_GAP;
type Anchor = { left: number; bottom: number };

/** Griglia degli avatar che sboccia dal pulsante, uno dopo l'altro */
function AvatarPicker({ anchor, onDone }: { anchor: Anchor; onDone: () => void }) {
  const { index, setAvatar } = useAssistantAvatar();
  const toast = useToast();
  const [anims] = useState(() => AVATARS.map(() => new Animated.Value(0)));
  // avatar sotto il mouse (solo PWA da computer): sopra compare il nome prima di sceglierlo
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    // dal più vicino al pulsante (in basso al centro) al più lontano
    const order = AVATARS.map((_, i) => i).sort((a, b) => dist(a) - dist(b));
    Animated.stagger(22, order.map((i) => Animated.spring(anims[i], { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 9 }))).start();
  }, [anims]);

  const pick = (i: number) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    onDone();
    if (i === index) return;
    setAvatar(i);
    toast.show(`Hai scelto ${avatarLabel(i)}`, Check);
  };

  return (
    <View style={{ position: 'absolute', left: anchor.left, bottom: anchor.bottom, width: PICKER_W,
      flexDirection: 'row', flexWrap: 'wrap-reverse', justifyContent: 'center', gap: PICK_GAP }}>
      {AVATARS.map((a, i) => {
        const selected = i === index;
        return (
          <Animated.View key={i} style={{ zIndex: hover === i ? 1 : 0, opacity: anims[i], transform: [{ scale: anims[i] }, { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <Pressy onPress={() => pick(i)} scaleTo={0.88} accessibilityRole="button" accessibilityLabel={avatarLabel(i)} accessibilityState={{ selected }}
              onHoverIn={() => setHover(i)} onHoverOut={() => setHover((h) => (h === i ? null : h))}
              style={{ width: PICK, height: PICK, borderRadius: PICK / 2, overflow: 'hidden', backgroundColor: palette.gold,
                borderWidth: selected ? 3 : 0, borderColor: palette.navy,
                shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}>
              <Image source={a.source} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
            </Pressy>
            {hover === i ? <AvatarName name={avatarLabel(i)} /> : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Etichetta col nome sopra l'avatar sotto il mouse; non intercetta il mouse, così non toglie l'hover all'avatar */
function AvatarName({ name }: { name: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: PICK + 6, left: -PICK, right: -PICK, alignItems: 'center' }}>
      <View style={{ backgroundColor: palette.navy, borderRadius: 8, paddingHorizontal: space.sm, paddingVertical: 4,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
        <Txt w={700} size={12.5} color="#fff" numberOfLines={1}>{name}</Txt>
      </View>
    </View>
  );
}

/** Distanza (in celle) di un avatar dal centro della riga più bassa della griglia */
function dist(i: number) {
  const col = Math.abs((i % PER_ROW) - (PER_ROW - 1) / 2);
  const row = Math.floor(i / PER_ROW);
  return col + row;
}
