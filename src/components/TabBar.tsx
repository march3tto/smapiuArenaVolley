import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Ellipsis, House, Newspaper, Sprout, Trophy, Users, type LucideIcon } from 'lucide-react-native';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<string, LucideIcon> = {
  index: House,
  risultati: Trophy,
  squadra: Users,
  giovanili: Sprout,
  news: Newspaper,
  altro: Ellipsis,
};

/** Barra inferiore flottante con indicatore oro che scivola */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const n = state.routes.length;
  const itemW = width / n;

  useEffect(() => {
    if (!width) return;
    Animated.spring(x, { toValue: state.index * itemW, useNativeDriver: true, speed: 16, bounciness: 10 }).start();
  }, [state.index, itemW, width, x]);

  return (
    <View style={{ position: 'absolute', left: 10, right: 10, bottom: insets.bottom + 10, alignItems: 'center' }} pointerEvents="box-none">
      <View style={{ width: '100%', maxWidth: 560, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.line }}>
        <BlurView intensity={Platform.OS === 'android' ? 0 : 45} tint={mode === 'dark' ? 'dark' : 'light'} style={{ backgroundColor: Platform.OS === 'android' ? c.card : mode === 'dark' ? 'rgba(13,29,80,0.72)' : 'rgba(255,255,255,0.78)' }}>
          <View style={{ flexDirection: 'row', padding: 6 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 12)}>
            {width > 0 ? (
              <Animated.View style={{ position: 'absolute', top: 6, bottom: 6, left: 6, width: itemW, borderRadius: 18, backgroundColor: palette.gold, transform: [{ translateX: x }] }} />
            ) : null}
            {state.routes.map((route, i) => {
              const focused = state.index === i;
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
