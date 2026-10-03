import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Txt } from './Txt';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** true: larghezza piena con segmenti uguali; false: scorrevole */
  stretch?: boolean;
}

/** Filtro a pillole con indicatore oro che scivola */
export function SegmentedControl<T extends string>({ options, value, onChange, stretch }: Props<T>) {
  const { c } = useTheme();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    Animated.parallel([
      Animated.spring(x, { toValue: l.x, useNativeDriver: false, speed: 18, bounciness: 9 }),
      Animated.spring(w, { toValue: l.w, useNativeDriver: false, speed: 18, bounciness: 9 }),
    ]).start();
    if (!stretch) scroll.current?.scrollTo({ x: Math.max(0, l.x - 40), animated: true });
  }, [value, layouts, x, w, stretch]);

  const onItemLayout = (v: T) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((p) => (p[v]?.x === lx && p[v]?.w === width ? p : { ...p, [v]: { x: lx, w: width } }));
  };

  const inner = (
    <View style={{ flexDirection: 'row', padding: 4, flex: stretch ? 1 : undefined }}>
      <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, left: x, width: w, borderRadius: radius.pill, backgroundColor: palette.gold }} />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onLayout={onItemLayout(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{ paddingHorizontal: 14, height: 34, alignItems: 'center', justifyContent: 'center', flex: stretch ? 1 : undefined }}
          >
            <Txt w={600} size={13} color={active ? palette.onGold : 'muted'}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );

  const shell = { backgroundColor: c.fill, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line } as const;
  if (stretch) return <View style={[shell, { flexDirection: 'row' }]}>{inner}</View>;
  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={[shell, { flexGrow: 0, alignSelf: 'flex-start', maxWidth: '100%' }]}>
      {inner}
    </ScrollView>
  );
}
