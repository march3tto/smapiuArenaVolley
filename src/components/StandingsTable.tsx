import { useEffect, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Standing } from '@/types';

/**
 * Classifica unica e compatta: prima metà = pool promozione (oro), seconda = pool salvezza (blu).
 * Toccando una squadra si aprono le statistiche complete (set, quozienti, punti, penalità).
 * `scroll`: le righe scorrono dentro l'altezza disponibile (il contenitore deve avere un'altezza).
 */
export function StandingsTable({ rows, scroll }: { rows: Standing[]; scroll?: boolean }) {
  const { c } = useTheme();
  const [anim] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState<string | null>(null);
  const top = Math.max(1, ...rows.map((r) => r.points));
  const half = Math.ceil(rows.length / 2);
  const detailed = rows.some((r) => r.setsWon != null);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 1000, delay: 250, useNativeDriver: false }).start();
  }, [rows, anim]);

  const body = rows.map((r, i) => {
    const promo = i < half;
    const barColor = r.isUs ? palette.gold : promo ? 'rgba(255,213,3,0.55)' : c.cobalt;
    const expanded = open === r.team;
    return (
      <Pressy
        key={r.team}
        onPress={detailed ? () => setOpen(expanded ? null : r.team) : undefined}
        disabled={!detailed}
        scaleTo={0.99}
        accessibilityRole={detailed ? 'button' : undefined}
        accessibilityState={detailed ? { expanded } : undefined}
        accessibilityHint={detailed ? 'Mostra le statistiche della squadra' : undefined}
        style={{
          borderTopWidth: 1, borderTopColor: c.line, borderLeftWidth: 3, borderLeftColor: promo ? 'rgba(255,213,3,0.75)' : c.cobalt,
          // la nostra squadra resta riconoscibile anche scorrendo velocemente
          backgroundColor: r.isUs ? 'rgba(255,213,3,0.10)' : undefined,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 10, paddingRight: 4 }}>
          <Txt w={800} size={15} color={r.isUs ? 'accent' : 'muted'} style={{ width: 24 }} tnum>{i + 1}</Txt>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Txt w={r.isUs ? 800 : 500} size={teamFontSize(r.team)} numberOfLines={scroll ? 1 : undefined} style={{ flexShrink: 1 }}>{r.team}</Txt>
              {r.penalty ? <Txt w={700} size={10.5} color="danger" tnum>−{r.penalty}</Txt> : null}
              {detailed ? <ChevronDown size={13} color={c.muted} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} /> : null}
            </View>
            <View style={{ height: 3, borderRadius: 3, backgroundColor: c.fill2, marginTop: 5, overflow: 'hidden' }}>
              <Animated.View style={{ height: 3, borderRadius: 3, backgroundColor: barColor, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${(Math.max(0, r.points) / top) * 100}%`] }) }} />
            </View>
          </View>
          <Txt w={800} size={13} center color={r.isUs ? 'accent' : 'text'} style={{ width: 30 }} tnum>{r.points}</Txt>
          <Txt size={13} center style={{ width: 30 }} tnum>{r.played}</Txt>
          <Txt size={13} center style={{ width: 30 }} tnum>{r.won}</Txt>
          <Txt size={13} center style={{ width: 30 }} tnum>{r.lost}</Txt>
        </View>
        {expanded ? <Details r={r} /> : null}
      </Pressy>
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
      {detailed ? (
        <Txt size={11} color="muted" style={{ paddingTop: 10, paddingHorizontal: 10 }}>
          Tocca una squadra per set, quozienti e punti fatti e subiti.
        </Txt>
      ) : null}
    </View>
  );
}

/** Statistiche complete della squadra, sotto la riga */
function Details({ r }: { r: Standing }) {
  const { c } = useTheme();
  const items: [string, string][] = [
    ['Vinte 3-0 / 3-1', String(r.won30 ?? 0)],
    ['Vinte 3-2', String(r.won32 ?? 0)],
    ['Perse 2-3', String(r.lost23 ?? 0)],
    ['Perse 0-3 / 1-3', String(r.lost03 ?? 0)],
    ['Set vinti – persi', `${r.setsWon ?? 0} – ${r.setsLost ?? 0}`],
    ['Quoziente set', ratio(r.setRatio, r.setsWon)],
    ['Punti fatti – subiti', `${r.pointsFor ?? 0} – ${r.pointsAgainst ?? 0}`],
    ['Quoziente punti', ratio(r.pointRatio, r.pointsFor)],
  ];
  if (r.penalty) items.push(['Penalizzazione', `−${r.penalty} pt`]);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingLeft: 34, paddingRight: 10, paddingTop: 8, paddingBottom: 10, rowGap: 6 }}>
      {items.map(([label, value]) => (
        <View key={label} style={{ width: '50%', paddingRight: 8 }}>
          <Txt size={10.5} color="muted">{label}</Txt>
          <Txt w={700} size={13} tnum color={label === 'Penalizzazione' ? 'danger' : 'text'}>{value}</Txt>
        </View>
      ))}
      <View style={{ position: 'absolute', left: 34, right: 10, top: 0, height: 1, backgroundColor: c.line }} />
    </View>
  );
}

/** Quoziente con 3 decimali; "Max" se il denominatore è zero e la squadra ha vinto qualcosa */
function ratio(q: number | null | undefined, num: number | undefined) {
  if (q != null) return q.toFixed(3);
  return num ? 'Max' : '–';
}

/** Nomi lunghi in corpo più piccolo, per non troncarli */
function teamFontSize(name: string) {
  if (name.length > 26) return 11;
  if (name.length > 20) return 12;
  return 13;
}
