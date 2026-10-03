import { View } from 'react-native';
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
            <View style={{ width: 54, paddingVertical: 6, borderRadius: 14, alignItems: 'center', backgroundColor: first ? palette.gold : c.card, borderWidth: first ? 0 : 1, borderColor: c.line }}>
              <CalendarDays size={11} color={first ? palette.onGold : c.muted} style={{ marginBottom: 1 }} />
              <Txt w={800} size={26} color={first ? palette.onGold : 'text'} tnum style={{ lineHeight: 28 }}>{dayNum(m.date)}</Txt>
              <Txt w={700} size={11} color={first ? palette.onGold : 'muted'}>{monthShort(m.date)}</Txt>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TeamBadge name={m.opponent} logo={m.opponentLogo} size={28} />
                <Txt w={700} size={15} numberOfLines={2} style={{ flex: 1 }}>{m.opponent}</Txt>
              </View>
              <Txt size={12.5} color="muted" numberOfLines={1}>
                {m.venue ? `${m.venue} · ` : ''}{m.giornata != null ? `${m.giornata}ª giornata` : m.girone ? 'campionato' : 'amichevole'}
              </Txt>
            </View>
            <View accessibilityLabel={home ? 'In casa' : 'Trasferta'} style={{ width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: home ? 'rgba(242,184,0,0.14)' : 'rgba(124,155,255,0.15)' }}>
              {home ? <House size={16} color={c.accent} /> : <Plane size={16} color={c.cobalt} />}
            </View>
          </Pressy>
        );
      })}
    </View>
  );
}
