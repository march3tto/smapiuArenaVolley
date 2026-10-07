import { useEffect, useRef } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Standing } from '@/types';

/**
 * Classifica unica e compatta: prima metà = pool promozione (oro), seconda = pool salvezza (blu).
 * `scroll`: le righe scorrono dentro l'altezza disponibile (il contenitore deve avere un'altezza).
 */
export function StandingsTable({ rows, scroll }: { rows: Standing[]; scroll?: boolean }) {
  const { c } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const top = Math.max(1, ...rows.map((r) => r.points));
  const half = Math.ceil(rows.length / 2);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: false }).start();
  }, [rows, anim]);

  const body = rows.map((r, i) => {
    const promo = i < half;
    const barColor = r.isUs ? palette.gold : promo ? 'rgba(242,184,0,0.55)' : c.cobalt;
    return (
      <View key={r.team} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 10, paddingRight: 4, borderTopWidth: 1, borderTopColor: c.line, borderLeftWidth: 3, borderLeftColor: promo ? 'rgba(242,184,0,0.75)' : c.cobalt }}>
        <Txt w={800} size={15} color={r.isUs ? 'accent' : 'muted'} style={{ width: 24 }} tnum>{i + 1}</Txt>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Txt w={r.isUs ? 800 : 500} size={teamFontSize(r.team)} numberOfLines={scroll ? 1 : undefined}>{r.team}</Txt>
          <View style={{ height: 3, borderRadius: 3, backgroundColor: c.fill2, marginTop: 5, overflow: 'hidden' }}>
            <Animated.View style={{ height: 3, borderRadius: 3, backgroundColor: barColor, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${(r.points / top) * 100}%`] }) }} />
          </View>
        </View>
        <Txt w={800} size={13} center color={r.isUs ? 'accent' : 'text'} style={{ width: 30 }} tnum>{r.points}</Txt>
        <Txt size={13} center style={{ width: 30 }} tnum>{r.played}</Txt>
        <Txt size={13} center style={{ width: 30 }} tnum>{r.won}</Txt>
        <Txt size={13} center style={{ width: 30 }} tnum>{r.lost}</Txt>
      </View>
    );
  });

  return (
    <View style={scroll ? { flex: 1 } : undefined}>
      <View style={{ flexDirection: 'row', paddingVertical: 8, paddingLeft: 10, paddingRight: 4 }}>
        <Txt w={600} size={11} color="muted" style={{ width: 24 }}>#</Txt>
        <Txt w={600} size={11} color="muted" style={{ flex: 1 }}>Squadra</Txt>
        {['Pt', 'G', 'V', 'P'].map((h) => (
          <Txt key={h} w={600} size={11} color="muted" center style={{ width: 30 }}>{h}</Txt>
        ))}
      </View>
      {scroll ? (
        <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
}

/** Nomi lunghi in corpo più piccolo, per non troncarli */
function teamFontSize(name: string) {
  if (name.length > 26) return 11;
  if (name.length > 20) return 12;
  return 13;
}
