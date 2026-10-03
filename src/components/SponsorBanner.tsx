import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Image } from 'expo-image';
import { Card } from './Card';
import { Pressy } from './Pressy';
import { useTheme } from '@/theme/ThemeProvider';
import type { Sponsor } from '@/types';

/** Banner home: loghi di tutti gli sponsor (title sponsor compreso) che scorrono */
export function SponsorBanner({ sponsors, onPress }: { sponsors: Sponsor[]; onPress?: () => void }) {
  const { c } = useTheme();
  const [rowW, setRowW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!rowW) return;
    x.setValue(0);
    const loop = Animated.loop(Animated.timing(x, { toValue: -rowW, duration: rowW * 28, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [rowW, x]);

  const chips = (keyPrefix: string) =>
    sponsors.map((s) => (
      <View key={keyPrefix + s.id} style={{ height: 46, width: 104, marginRight: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', padding: 3 }}>
        <Image source={s.logo} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel={s.name} />
      </View>
    ));

  return (
    <Pressy onPress={onPress} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Sponsor">
      <Card style={{ padding: 14, gap: 12 }}>
        <View style={{ overflow: 'hidden' }}>
          <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
            <View style={{ flexDirection: 'row' }} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
              {chips('a')}
            </View>
            <View style={{ flexDirection: 'row' }}>{chips('b')}</View>
          </Animated.View>
        </View>
      </Card>
    </Pressy>
  );
}
