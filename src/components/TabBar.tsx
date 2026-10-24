import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Ellipsis, House, Newspaper, Sparkles, Trophy, Users, type LucideIcon } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
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

/** Barra inferiore flottante con indicatore oro che scivola */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const routes = state.routes.filter((r) => !HIDDEN.has(r.name));
  const n = routes.length;
  const itemW = width / n;
  const activeKey = state.routes[state.index]?.key;
  const visibleIndex = Math.max(0, routes.findIndex((r) => r.key === activeKey));

  useEffect(() => {
    if (!width) return;
    Animated.spring(x, { toValue: visibleIndex * itemW, useNativeDriver: true, speed: 16, bounciness: 10 }).start();
  }, [visibleIndex, itemW, width, x]);

  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom: insets.bottom + 10, alignItems: 'center' }} pointerEvents="box-none">
      {/* nella tab Altro l'assistente ha la sua card (qui coprirebbe il popup sponsor) */}
      {state.routes[state.index]?.name !== 'altro' ? <AssistantFab /> : null}
      <View style={{ width: '100%', maxWidth: 560, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
        <BlurView intensity={Platform.OS === 'android' ? 0 : 45} tint={mode === 'dark' ? 'dark' : 'light'} style={{ backgroundColor: Platform.OS === 'android' ? c.card : mode === 'dark' ? 'rgba(34,77,146,0.72)' : 'rgba(255,255,255,0.78)' }}>
          <View style={{ flexDirection: 'row', padding: 6 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 12)}>
            {width > 0 ? (
              <Animated.View style={{ position: 'absolute', top: 6, bottom: 6, left: 6, width: itemW, borderRadius: 18, backgroundColor: palette.gold, transform: [{ translateX: x }] }} />
            ) : null}
            {routes.map((route) => {
              const focused = route.key === activeKey;
              const { options } = descriptors[route.key];
              const label = typeof options.title === 'string' ? options.title : route.name;
              const Icon = ICONS[route.name] ?? House;
              const color = focused ? palette.onGold : c.muted;
              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              };
              return (
                <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, gap: 3 }}>
                  <Icon size={19} color={color} strokeWidth={focused ? 2.4 : 2} />
                  <Txt w={600} size={10.5} color={color} numberOfLines={1}>
                    {label}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

/** Pulsante flottante dell'assistente AI, sopra la barra a destra */
function AssistantFab() {
  const router = useRouter();
  return (
    <View pointerEvents="box-none" style={{ width: '100%', maxWidth: 560, alignItems: 'flex-end', marginBottom: 10 }}>
      <Pressy onPress={() => router.push('/assistente')} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Assistente" hitSlop={6}
        style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold,
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <Sparkles size={22} color={palette.onGold} />
      </Pressy>
    </View>
  );
}
