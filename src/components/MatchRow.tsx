import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { LiveDot } from './LiveDot';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { US } from '@/constants';
import { longDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import type { Match } from '@/types';

interface Props {
  match: Match;
  /** Punteggio set della diretta (se live) */
  liveSets?: { our: number; opp: number };
  onPress?: () => void;
}

/** Riga partita: giornata a sinistra, A/R, data centrata, stemmi, risultato e parziali */
export function MatchRow({ match: m, liveSets, onPress }: Props) {
  const { c } = useTheme();
  const homeIsUs = m.homeAway === 'casa';
  const homeName = homeIsUs ? US : m.opponent;
  const awayName = homeIsUs ? m.opponent : US;
  const live = m.status === 'live';
  const played = m.status === 'finished';
  const our = live ? liveSets?.our ?? 0 : m.ourSets ?? null;
  const opp = live ? liveSets?.opp ?? 0 : m.oppSets ?? null;
  const hasScore = (played || live) && our != null && opp != null;
  const homeScore = homeIsUs ? our : opp;
  const awayScore = homeIsUs ? opp : our;
  const won = hasScore && (our ?? 0) > (opp ?? 0);
  const ritorno = m.phase === 'ritorno';
  const friendly = m.giornata == null;

  return (
    <Pressy onPress={onPress} disabled={!onPress} scaleTo={0.98} style={{ flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: live ? 'rgba(255,77,94,0.45)' : c.line }}>
      <View style={{ width: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: c.fill, borderRightWidth: 1, borderRightColor: c.line }} accessibilityLabel={friendly ? 'Amichevole' : `${m.giornata}ª giornata, ${ritorno ? 'ritorno' : 'andata'}`}>
        {friendly ? (
          <Txt w={800} size={11} color="muted" center>AMI-{'\n'}CHEVOLE</Txt>
        ) : (
          <>
            <Txt w={800} size={28} tnum style={{ letterSpacing: -1, lineHeight: 30 }}>{m.giornata}</Txt>
            <Txt w={600} size={10} color="muted">giornata</Txt>
            <View style={{ marginTop: 8, width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ritorno ? 'rgba(124,155,255,0.18)' : 'rgba(242,184,0,0.16)' }}>
              <Txt w={800} size={11.5} color={ritorno ? 'cobalt' : 'accent'}>{ritorno ? 'R' : 'A'}</Txt>
            </View>
          </>
        )}
      </View>

      <View style={{ flex: 1, padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
          {live ? <LiveDot size={7} /> : null}
          <Txt w={600} size={13} color="muted" center>{longDate(m.date)}</Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Team name={homeName} logo={homeIsUs ? null : m.opponentLogo} />
          <View style={{ minWidth: 72, alignItems: 'center' }}>
            {hasScore ? (
              <>
                <Txt w={800} size={28} tnum style={{ letterSpacing: -0.6 }}>{homeScore}–{awayScore}</Txt>
                {played ? (
                  <View style={{ marginTop: 4, width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: won ? 'rgba(61,220,151,0.18)' : 'rgba(255,122,136,0.18)' }}>
                    <Txt w={800} size={11} color={won ? 'ok' : 'danger'}>{won ? 'V' : 'P'}</Txt>
                  </View>
                ) : null}
              </>
            ) : (
              <Txt w={600} size={13} color="muted">contro</Txt>
            )}
          </View>
          <Team name={awayName} logo={homeIsUs ? m.opponentLogo : null} />
        </View>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color={c.accent} />
            <Txt size={12.5} color="muted">{m.venue}</Txt>
          </View>
          {m.sets && m.sets.length && played ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 }}>
              {m.sets.map((s, i) => {
                const w = s.our > s.opp;
                const h = homeIsUs ? s.our : s.opp;
                const a = homeIsUs ? s.opp : s.our;
                return (
                  <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: w ? 'rgba(242,184,0,0.13)' : c.fill }}>
                    <Txt w={600} size={12} color={w ? 'accent' : 'text'} tnum>{h}–{a}</Txt>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    </Pressy>
  );
}

function Team({ name, logo }: { name: string; logo?: string | number | null }) {
  const us = name === US;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <TeamBadge name={name} logo={logo} size={44} />
      <Txt w={700} size={13} center numberOfLines={2} color={us ? 'accent' : 'text'}>{name}</Txt>
    </View>
  );
}
