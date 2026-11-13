import { Fragment } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { House, Plane } from 'lucide-react-native';
import { CountdownPill } from './CountdownPill';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { dayNum, monthShort } from '@/lib/format';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Match } from '@/types';

/** Testo della prima partita (la prossima) più grande del 10% */
const FIRST_SCALE = 1.1;

export function UpcomingList({ matches, onPress }: { matches: Match[]; onPress?: (m: Match) => void }) {
  const { c, mode } = useTheme();
  if (!matches.length) return <Txt color="muted" size={14}>Nessuna partita in programma.</Txt>;
  return (
    <View style={{ gap: space.sm }}>
      {matches.map((m, i) => {
        const first = i === 0;
        const home = m.homeAway === 'casa';
        const f = first ? FIRST_SCALE : 1;
        return (
          <Fragment key={m.id}>
            {/* la prossima partita: bordo spesso (blu sul tema chiaro, giallo sullo scuro) e fondo della card; linea che la separa dalle successive */}
            {i === 1 ? <View style={{ height: 1, backgroundColor: c.line, marginVertical: space.xs }} /> : null}
            <Pressy onPress={() => onPress?.(m)} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.md, borderRadius: 18,
              backgroundColor: first ? c.card : c.fill, borderWidth: first ? 2 : 1, borderColor: first ? (mode === 'dark' ? palette.gold : palette.blue) : c.line }}>
              <CalendarPage date={m.date} highlight={first} scale={f} />
              <View style={{ flex: 1, gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <TeamBadge name={m.opponent} logo={m.opponentLogo} size={28} />
                  <Txt w={700} size={15 * f} numberOfLines={2} style={{ flex: 1 }}>{m.opponent}</Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessibilityLabel={`${home ? 'In casa' : 'Trasferta'}${m.venue ? `, ${m.venue}` : ''}`}>
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {home ? <House size={16} color={c.accent} fill={c.accent} /> : <Plane size={16} color={c.cobalt} />}
                  </View>
                  <Txt size={12.5 * f} color="muted" numberOfLines={1} style={{ flex: 1 }}>
                    {m.venue || (home ? 'In casa' : 'Trasferta')}
                  </Txt>
                </View>
                {first ? <CountdownPill date={m.date} scale={FIRST_SCALE} /> : null}
              </View>
              {m.competition?.logo ? (
                <Image source={(mode === 'light' && m.competition.logoLight) || m.competition.logo} style={{ width: 32, height: 40 }} contentFit="contain" accessibilityLabel={m.competition.name} />
              ) : null}
            </Pressy>
          </Fragment>
        );
      })}
    </View>
  );
}

/** Data a foglio di calendario: anelli in alto, mese nella fascia, giorno grande sotto */
function CalendarPage({ date, highlight, scale = 1 }: { date: string; highlight?: boolean; scale?: number }) {
  const { c } = useTheme();
  const frame = highlight ? palette.gold : c.line;
  return (
    <View style={{ width: 56, paddingTop: space.xs }} accessibilityLabel={`${dayNum(date)} ${monthShort(date)} ${new Date(date).getFullYear()}`}>
      <View style={{ borderRadius: 11, borderWidth: 2, borderColor: frame, backgroundColor: c.card, overflow: 'hidden' }}>
        <View style={{ paddingTop: space.xs, paddingBottom: space.xs, alignItems: 'center', backgroundColor: frame }}>
          <Txt w={800} size={10.5 * scale} color={highlight ? palette.onGold : 'muted'} style={{ letterSpacing: 0.8, lineHeight: 13 * scale }}>
            {monthShort(date).toUpperCase()}
          </Txt>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: space.xs }}>
          <Txt w={800} size={24 * scale} tnum style={{ lineHeight: 28 * scale }}>{dayNum(date)}</Txt>
        </View>
      </View>
      {/* anelli del calendario */}
      {[14, 34].map((left) => (
        <View key={left} style={{ position: 'absolute', top: 0, left, width: 4, height: 9, borderRadius: 2, backgroundColor: highlight ? palette.onGold : c.muted }} />
      ))}
    </View>
  );
}
