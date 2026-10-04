import { useState } from 'react';
import { View } from 'react-native';
import { Bus, House } from 'lucide-react-native';
import { LiveDot } from './LiveDot';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { US } from '@/constants';
import { longDate, timeOf } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import type { Match } from '@/types';

interface Props {
  match: Match;
  /** Punteggio set della diretta (se live) */
  liveSets?: { our: number; opp: number };
  onPress?: () => void;
}

/** Riga partita: giornata a sinistra (se presente), A/R, data e ora centrate, stemmi, risultato e parziali */
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
  // Amichevole = partita senza girone; una partita di campionato può non avere ancora il numero di giornata
  const friendly = m.giornata == null && !m.girone;
  const label = m.season || (friendly ? 'Amichevole' : 'Campionato');
  const border = live ? 'rgba(255,77,94,0.45)' : c.line;
  const stubWidth = m.giornata != null ? 60 : STUB_WIDTH;

  return (
    <Pressy onPress={onPress} disabled={!onPress} scaleTo={0.98} style={{ flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: border }}>
      {m.giornata != null ? (
        <View style={{ width: 60, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: c.fill }} accessibilityLabel={`${m.giornata}ª giornata, ${ritorno ? 'ritorno' : 'andata'}`}>
          <Txt w={800} size={28} tnum style={{ letterSpacing: -1, lineHeight: 30 }}>{m.giornata}</Txt>
          <Txt w={600} size={10} color="muted">giornata</Txt>
          <View style={{ marginTop: 8, width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ritorno ? 'rgba(124,155,255,0.18)' : 'rgba(242,184,0,0.16)' }}>
            <Txt w={800} size={11.5} color={ritorno ? 'cobalt' : 'accent'}>{ritorno ? 'R' : 'A'}</Txt>
          </View>
        </View>
      ) : (
        <SeasonLabel label={label} />
      )}

      <Perforation color={border} />

      <View style={{ flex: 1, padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
          {live ? <LiveDot size={7} /> : null}
          <Txt w={600} size={13} color="muted" center>{longDate(m.date)} · {timeOf(m.date)}</Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Team name={homeName} logo={homeIsUs ? null : m.opponentLogo} />
          <View style={{ minWidth: 72, alignItems: 'center' }}>
            {hasScore ? (
              <>
                <Txt w={800} size={22} tnum style={{ letterSpacing: 0.5 }}>{homeScore} – {awayScore}</Txt>
                {played ? (
                  <View style={{ marginTop: 4, paddingHorizontal: 8, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: won ? 'rgba(61,220,151,0.18)' : 'rgba(255,122,136,0.18)' }}>
                    <Txt w={800} size={11} color={won ? 'ok' : 'danger'}>{won ? 'Vinta' : 'Persa'}</Txt>
                  </View>
                ) : null}
              </>
            ) : (
              <View accessibilityLabel="contro" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
                <Txt w={800} size={12} color="accent" style={{ letterSpacing: -0.3 }}>VS</Txt>
              </View>
            )}
          </View>
          <Team name={awayName} logo={homeIsUs ? m.opponentLogo : null} />
        </View>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {homeIsUs ? <House size={12} color={c.accent} accessibilityLabel="In casa" /> : <Bus size={12} color={c.accent} accessibilityLabel="In trasferta" />}
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

      {/* tacche del biglietto ai due capi della perforazione */}
      <Notch left={stubWidth} top border={border} />
      <Notch left={stubWidth} border={border} />
    </Pressy>
  );
}

/** Colori delle etichette stagione: ogni stagione ne prende uno fisso in base al nome */
const SEASON_COLORS = [
  { fg: '#F2B800', bg: 'rgba(242,184,0,0.16)' },
  { fg: '#7FD8FF', bg: 'rgba(127,216,255,0.16)' },
  { fg: '#3DDC97', bg: 'rgba(61,220,151,0.16)' },
  { fg: '#FF8A9A', bg: 'rgba(255,138,154,0.16)' },
  { fg: '#C9A2FF', bg: 'rgba(201,162,255,0.16)' },
  { fg: '#FFA94D', bg: 'rgba(255,169,77,0.16)' },
];

function seasonColor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return SEASON_COLORS[h % SEASON_COLORS.length];
}

const STUB_WIDTH = 40;
const NOTCH = 16;

/** Linea tratteggiata tra matrice e biglietto */
function Perforation({ color }: { color: string }) {
  return (
    <View style={{ width: 1.5 }}>
      {/* assoluta: i trattini non devono contribuire all'altezza della card */}
      <View style={{ position: 'absolute', top: NOTCH / 2 + 3, bottom: NOTCH / 2 + 3, left: 0, right: 0, gap: 4, overflow: 'hidden' }}>
        {Array.from({ length: 40 }, (_, i) => (
          <View key={i} style={{ height: 5, backgroundColor: color }} />
        ))}
      </View>
    </View>
  );
}

/** Semicerchio "ritagliato" dal bordo della card, sopra o sotto la perforazione */
function Notch({ left, top, border }: { left: number; top?: boolean; border: string }) {
  const { c } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: left + 0.75 - NOTCH / 2, [top ? 'top' : 'bottom']: -NOTCH / 2 - 1,
        width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.bg, borderWidth: 1, borderColor: border,
      }}
    />
  );
}

/** Matrice del biglietto con la stagione scritta in verticale: occupa l'altezza della card senza allungarla */
function SeasonLabel({ label }: { label: string }) {
  const [h, setH] = useState(0);
  const col = seasonColor(label);
  return (
    <View
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
      accessibilityLabel={label}
      style={{ width: STUB_WIDTH, backgroundColor: col.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      {h ? (
        <View style={{ position: 'absolute', width: h - NOTCH - 12, height: STUB_WIDTH, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-90deg' }] }}>
          <Txt w={800} size={10.5} color={col.fg} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ letterSpacing: 0.6 }}>
            {label.toUpperCase()}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

function Team({ name, logo }: { name: string; logo?: string | number | null }) {
  const us = name === US;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <TeamBadge name={name} logo={logo} size={44} />
      <Txt w={700} size={11.5} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} color={us ? 'accent' : 'text'}>{name}</Txt>
    </View>
  );
}
