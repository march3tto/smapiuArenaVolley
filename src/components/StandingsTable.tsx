import { ScrollView, View } from 'react-native';
import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeProvider';
import type { Standing } from '@/types';
import { space } from '@/theme/colors';

/**
 * Classifica unica e compatta: prima metà = pool promozione (oro), seconda = pool salvezza (blu).
 * `scroll`: le righe scorrono dentro l'altezza disponibile (il contenitore deve avere un'altezza).
 * `scale`: ingrandisce testo e colonne (es. 1.15 = +15%).
 */
export function StandingsTable({ rows, scroll, scale = 1 }: { rows: Standing[]; scroll?: boolean; scale?: number }) {
  const { c } = useTheme();
  const k = scale;
  const half = Math.ceil(rows.length / 2);

  const body = rows.map((r, i) => {
    const promo = i < half;
    return (
      <View
        key={r.team}
        style={{
          borderTopWidth: 1, borderTopColor: c.line, borderLeftWidth: 3, borderLeftColor: promo ? 'rgba(255,213,3,0.75)' : c.cobalt,
          // la nostra squadra resta riconoscibile anche scorrendo velocemente
          backgroundColor: r.isUs ? 'rgba(255,213,3,0.10)' : undefined,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, paddingLeft: space.sm, paddingRight: space.xs }}>
          <Txt w={800} size={15 * k} color={r.isUs ? 'text' : 'muted'} style={{ width: 24 * k }} tnum>{i + 1}</Txt>
          <View style={{ flex: 1, paddingRight: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Txt w={r.isUs ? 800 : 500} size={teamFontSize(r.team) * k} numberOfLines={scroll ? 1 : undefined} style={{ flexShrink: 1 }}>{r.team}</Txt>
              {r.penalty ? <Txt w={700} size={10.5 * k} color="danger" tnum>−{r.penalty}</Txt> : null}
            </View>
          </View>
          <Txt w={800} size={13 * k} center style={{ width: 30 * k }} tnum>{r.points}</Txt>
          <Txt size={13 * k} center style={{ width: 30 * k }} tnum>{r.played}</Txt>
          <Txt size={13 * k} center style={{ width: 30 * k }} tnum>{r.won}</Txt>
          <Txt size={13 * k} center style={{ width: 30 * k }} tnum>{r.lost}</Txt>
        </View>
      </View>
    );
  });

  return (
    <View style={scroll ? { flex: 1 } : undefined}>
      <View style={{ flexDirection: 'row', paddingVertical: space.sm, paddingLeft: space.sm, paddingRight: space.xs }}>
        <Txt w={600} size={11 * k} color="muted" style={{ width: 24 * k }}>#</Txt>
        <Txt w={600} size={11 * k} color="muted" style={{ flex: 1 }}>Squadra</Txt>
        {['Pt', 'G', 'V', 'P'].map((h) => (
          <Txt key={h} w={600} size={11 * k} color="muted" center style={{ width: 30 * k }}>{h}</Txt>
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
