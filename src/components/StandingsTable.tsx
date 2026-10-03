import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Standing } from '@/types';

/** Classifica unica e compatta: prime metà = pool promozione (oro), seconda = pool salvezza (blu) */
export function StandingsTable({ rows }: { rows: Standing[] }) {
  const { c } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const top = Math.max(1, ...rows.map((r) => r.points));
  const half = Math.ceil(rows.length / 2);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: false }).start();
  }, [rows, anim]);

  return (
    <View>
      <View style={{ flexDirection: 'row', paddingVertical: 8, paddingLeft: 10, paddingRight: 4 }}>
        <Txt w={600} size={11} color="muted" style={{ width: 24 }}>#</Txt>
        <Txt w={600} size={11} color="muted" style={{ flex: 1 }}>Squadra</Txt>
        {['Pt', 'G', 'V'].map((h) => (
          <Txt key={h} w={600} size={11} color="muted" center style={{ width: 30 }}>{h}</Txt>
        ))}
      </View>
      {rows.map((r, i) => {
        const promo = i < half;
        const barColor = r.isUs ? palette.gold : promo ? 'rgba(242,184,0,0.55)' : c.cobalt;
        return (
          <View key={r.team} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 10, paddingRight: 4, borderTopWidth: 1, borderTopColor: c.line, borderLeftWidth: 3, borderLeftColor: promo ? 'rgba(242,184,0,0.75)' : c.cobalt }}>
            <Txt w={800} size={15} color={r.isUs ? 'accent' : 'muted'} style={{ width: 24 }} tnum>{i + 1}</Txt>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Txt w={r.isUs ? 800 : 500} size={13} numberOfLines={1}>{r.team}</Txt>
              <View style={{ height: 3, borderRadius: 3, backgroundColor: c.fill2, marginTop: 5, overflow: 'hidden' }}>
                <Animated.View style={{ height: 3, borderRadius: 3, backgroundColor: barColor, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${(r.points / top) * 100}%`] }) }} />
              </View>
            </View>
            <Txt w={800} size={13} center color={r.isUs ? 'accent' : 'text'} style={{ width: 30 }} tnum>{r.points}</Txt>
            <Txt size={13} center style={{ width: 30 }} tnum>{r.played}</Txt>
            <Txt size={13} center style={{ width: 30 }} tnum>{r.won}</Txt>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
        <Legend color={palette.gold} label="Pool promozione" />
        <Legend color={c.cobalt} label="Pool salvezza" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Txt size={12} color="muted">{label}</Txt>
    </View>
  );
}
