import { View } from 'react-native';
import { Image } from 'expo-image';
import { CalendarDays, House, Plane } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { dayNum, monthShort } from '@/lib/format';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Match } from '@/types';

export function UpcomingList({ matches, onPress }: { matches: Match[]; onPress?: (m: Match) => void }) {
  const { c } = useTheme();
  if (!matches.length) return <Txt color="muted" size={14}>Nessuna partita in programma.</Txt>;
  return (
    <View style={{ gap: 8 }}>
      {matches.map((m, i) => {
        const first = i === 0;
        const home = m.homeAway === 'casa';
        return (
          <Pressy key={m.id} onPress={() => onPress?.(m)} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, paddingRight: 12, borderRadius: 18, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
            <View style={{ width: 54, paddingVertical: 5, borderRadius: 14, alignItems: 'center', backgroundColor: first ? palette.gold : c.card, borderWidth: first ? 0 : 1, borderColor: c.line }}>
              <CalendarDays size={11} color={first ? palette.onGold : c.muted} style={{ marginBottom: 1 }} />
              <Txt w={800} size={26} color={first ? palette.onGold : 'text'} tnum style={{ lineHeight: 28 }}>{dayNum(m.date)}</Txt>
              <Txt w={700} size={11} color={first ? palette.onGold : 'muted'}>{monthShort(m.date)}</Txt>
              <Txt w={600} size={10} color={first ? palette.onGold : 'muted'} tnum>{new Date(m.date).getFullYear()}</Txt>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TeamBadge name={m.opponent} logo={m.opponentLogo} size={28} />
                <Txt w={700} size={15} numberOfLines={2} style={{ flex: 1 }}>{m.opponent}</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel={`${home ? 'In casa' : 'Trasferta'}${m.venue ? `, ${m.venue}` : ''}`}>
                <View style={{ width: 28, alignItems: 'center' }}>
                  {home ? <House size={16} color={c.accent} /> : <Plane size={16} color={c.cobalt} />}
                </View>
                <Txt size={12.5} color="muted" numberOfLines={1} style={{ flex: 1 }}>
                  {m.venue || (home ? 'In casa' : 'Trasferta')}
                </Txt>
              </View>
            </View>
            {m.competition?.logo ? (
              <Image source={m.competition.logo} style={{ width: 32, height: 40 }} contentFit="contain" accessibilityLabel={m.competition.name} />
            ) : null}
          </Pressy>
        );
      })}
    </View>
  );
}
