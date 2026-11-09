import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Modal, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Check, Ellipsis, House, Newspaper, Trophy, Users, type LucideIcon } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { useToast } from './Toast';
import { AVATARS, avatarLabel, useAssistantAvatar } from '@/lib/avatar';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<string, LucideIcon> = {
  index: House,
  risultati: Trophy,
  squadra: Users,
  news: Newspaper,
  altro: Ellipsis,
};

/** Tab nascoste dalla barra (la schermata resta, ma non c'è il pulsante) */
const HIDDEN = new Set(['giovanili']);
/** Il pulsante dell'assistente sta nella barra subito prima di questa tab (non è una tab: apre la chat) */
const ASSISTANT_BEFORE = 'news';
const ASSISTANT_KEY = '__assistente';
const AVATAR_SIZE = 34;

/** Barra inferiore flottante con indicatore oro che scivola */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { c, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const x = useState(() => new Animated.Value(0))[0];
  const routes = state.routes.filter((r) => !HIDDEN.has(r.name));
  // posti nella barra: le tab visibili più l'assistente
  const slots: string[] = routes.flatMap((r) => (r.name === ASSISTANT_BEFORE ? [ASSISTANT_KEY, r.key] : [r.key]));
  if (!slots.includes(ASSISTANT_KEY)) slots.push(ASSISTANT_KEY);
  const n = slots.length;
  const itemW = width / n;
  const activeKey = state.routes[state.index]?.key;
  const visibleIndex = Math.max(0, slots.indexOf(activeKey ?? ''));

  useEffect(() => {
    if (!width) return;
    Animated.spring(x, { toValue: visibleIndex * itemW, useNativeDriver: true, speed: 16, bounciness: 10 }).start();
  }, [visibleIndex, itemW, width, x]);

  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom: insets.bottom + 10, alignItems: 'center' }} pointerEvents="box-none">
      <View style={{ width: '100%', maxWidth: 560, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
        <BlurView intensity={Platform.OS === 'android' ? 0 : 45} tint={mode === 'dark' ? 'dark' : 'light'} style={{ backgroundColor: Platform.OS === 'android' ? c.card : mode === 'dark' ? 'rgba(34,77,146,0.72)' : 'rgba(255,255,255,0.78)' }}>
          <View style={{ flexDirection: 'row', padding: space.sm }} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 12)}>
            {width > 0 ? (
              <Animated.View style={{ position: 'absolute', top: 6, bottom: 6, left: 6, width: itemW, borderRadius: 18, backgroundColor: palette.gold, transform: [{ translateX: x }] }} />
            ) : null}
            {slots.map((key) => {
              if (key === ASSISTANT_KEY) return <AssistantButton key={key} />;
              const route = routes.find((r) => r.key === key)!;
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
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: AVATAR_SIZE + space.sm }}>
                  <Icon size={21} color={color} strokeWidth={focused ? 2.4 : 2} />
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

/** Pulsante dell'assistente AI nella barra: il suo avatar apre la chat; tenendolo premuto si sceglie il volto */
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
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View ref={ref} collapsable={false}>
        <Pressy onPress={() => router.push('/assistente')} onLongPress={openPicker} delayLongPress={350} scaleTo={0.88}
          accessibilityRole="button" accessibilityLabel="Assistente" accessibilityHint="Tieni premuto per scegliere l'avatar" hitSlop={6}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, overflow: 'hidden', backgroundColor: palette.gold }}>
          <Image source={source} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }} contentFit="cover" accessibilityIgnoresInvertColors />
        </Pressy>
      </View>
      <Modal visible={!!anchor} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setAnchor(null)}>
        {/* sfondo trasparente: la schermata resta visibile, un tocco fuori chiude */}
        <Pressable style={{ flex: 1 }} onPress={() => setAnchor(null)} accessibilityLabel="Chiudi scelta avatar">
          {anchor ? <AvatarPicker anchor={anchor} onDone={() => setAnchor(null)} /> : null}
        </Pressable>
      </Modal>
    </View>
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
          <Animated.View key={i} style={{ opacity: anims[i], transform: [{ scale: anims[i] }, { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <Pressy onPress={() => pick(i)} scaleTo={0.88} accessibilityRole="button" accessibilityLabel={avatarLabel(i)} accessibilityState={{ selected }}
              style={{ width: PICK, height: PICK, borderRadius: PICK / 2, overflow: 'hidden', backgroundColor: palette.gold,
                borderWidth: selected ? 3 : 0, borderColor: palette.navy,
                shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}>
              <Image source={a.source} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
            </Pressy>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Distanza (in celle) di un avatar dal centro della riga più bassa della griglia */
function dist(i: number) {
  const col = Math.abs((i % PER_ROW) - (PER_ROW - 1) / 2);
  const row = Math.floor(i / PER_ROW);
  return col + row;
}
