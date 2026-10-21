import { View } from 'react-native';
import { Image } from 'expo-image';
import { House, Plane } from 'lucide-react-native';
import { CountdownPill } from './CountdownPill';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { dayNum, monthShort } from '@/lib/format';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Match } from '@/types';

export function UpcomingList({ matches, onPress }: { matches: Match[]; onPress?: (m: Match) => void }) {
  const { c, mode } = useTheme();
  if (!matches.length) return <Txt color="muted" size={14}>Nessuna partita in programma.</Txt>;
  return (
    <View style={{ gap: 8 }}>
      {matches.map((m, i) => {
        const first = i === 0;
        const home = m.homeAway === 'casa';
        return (
          <Pressy key={m.id} onPress={() => onPress?.(m)} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, paddingRight: 12, borderRadius: 18, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
            <CalendarPage date={m.date} highlight={first} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TeamBadge name={m.opponent} logo={m.opponentLogo} size={28} />
                <Txt w={700} size={15} numberOfLines={2} style={{ flex: 1 }}>{m.opponent}</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel={`${home ? 'In casa' : 'Trasferta'}${m.venue ? `, ${m.venue}` : ''}`}>
                <View style={{ width: 28, alignItems: 'center' }}>
                  {home ? <House size={16} color={c.accent} fill={c.accent} /> : <Plane size={16} color={c.cobalt} />}
                </View>
                <Txt size={12.5} color="muted" numberOfLines={1} style={{ flex: 1 }}>
                  {m.venue || (home ? 'In casa' : 'Trasferta')}
                </Txt>
              </View>
              {first ? <CountdownPill date={m.date} /> : null}
            </View>
            {m.competition?.logo ? (
              <Image source={(mode === 'light' && m.competition.logoLight) || m.competition.logo} style={{ width: 32, height: 40 }} contentFit="contain" accessibilityLabel={m.competition.name} />
            ) : null}
          </Pressy>
        );
      })}
    </View>
  );
}

/** Data a foglio di calendario: anelli in alto, mese nella fascia, giorno grande sotto */
function CalendarPage({ date, highlight }: { date: string; highlight?: boolean }) {
  const { c } = useTheme();
  const frame = highlight ? palette.gold : c.line;
  return (
    <View style={{ width: 56, paddingTop: 4 }} accessibilityLabel={`${dayNum(date)} ${monthShort(date)} ${new Date(date).getFullYear()}`}>
      <View style={{ borderRadius: 11, borderWidth: 2, borderColor: frame, backgroundColor: c.card, overflow: 'hidden' }}>
        <View style={{ paddingTop: 4, paddingBottom: 2, alignItems: 'center', backgroundColor: frame }}>
          <Txt w={800} size={10.5} color={highlight ? palette.onGold : 'muted'} style={{ letterSpacing: 0.8, lineHeight: 13 }}>
            {monthShort(date).toUpperCase()}
          </Txt>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 3 }}>
          <Txt w={800} size={24} tnum style={{ lineHeight: 28 }}>{dayNum(date)}</Txt>
        </View>
      </View>
      {/* anelli del calendario */}
      {[14, 34].map((left) => (
        <View key={left} style={{ position: 'absolute', top: 0, left, width: 4, height: 9, borderRadius: 2, backgroundColor: highlight ? palette.onGold : c.muted }} />
      ))}
    </View>
  );
}
