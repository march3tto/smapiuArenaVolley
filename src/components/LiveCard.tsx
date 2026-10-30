import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Award } from 'lucide-react-native';
import { AnimatedNumber } from './AnimatedNumber';
import { Button } from './Button';
import { LiveSignal } from './LiveDot';
import { LiveTicker } from './LiveTicker';
import { type MvpTeam } from './MvpPanel';
import { MvpSheet } from './MvpSheet';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { YoutubeIcon } from './YoutubeIcon';
import { US } from '@/constants';
import { useLiveLineup } from '@/store/LineupProvider';
import { useLive } from '@/store/LiveProvider';
import { usePlayer } from '@/store/PlayerProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/colors';

/** Card "In diretta" della home: compare solo se esiste una partita live */
export function LiveCard() {
  const { c, mode } = useTheme();
  const router = useRouter();
  const live = useLive();
  const player = usePlayer();
  const lineup = useLiveLineup();
  // voto MVP aperto dal pulsante della card, sopra la Home
  const [mvpOpen, setMvpOpen] = useState(false);
  // Larghezza della colonna del punteggio: la riga "set vinti" la replica, così i numeri cadono sotto le squadre
  const [centerW, setCenterW] = useState(0);
  const m = live.match;
  if (!m) return null;
  const home = m.homeAway === 'casa';
  const us = m.usName ?? US;
  const left = { name: home ? us : m.opponent, logo: home ? null : m.opponentLogo, sets: home ? live.ourSets : live.oppSets, pts: home ? live.our : live.opp };
  const right = { name: home ? m.opponent : us, logo: home ? m.opponentLogo : null, sets: home ? live.oppSets : live.ourSets, pts: home ? live.opp : live.our };
  // come nella scheda "Vota MVP" della diretta: casa a sinistra, ospite a destra
  const mvpTeams: MvpTeam[] = [{ t: left, side: home ? 'us' : 'opp' } as const, { t: right, side: home ? 'opp' : 'us' } as const]
    .map(({ t, side }) => ({ side, name: t.name, logo: t.logo, players: side === 'us' ? lineup.us : lineup.opp }));

  const season = m.season || m.competition?.name || 'Campionato';
  // la cronaca è dalla più recente
  const last = live.events[0];

  return (
    <>
    <Pressy onPress={() => router.push('/live')} scaleTo={0.98} accessibilityRole="link" accessibilityLabel="Segui la diretta">
      <View
        style={{ backgroundColor: c.card, borderRadius: 22, padding: space.md, gap: space.md, borderWidth: 1.5, borderColor: 'rgba(255,213,3,0.55)' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 8, backgroundColor: c.live }}>
            <LiveSignal size={13} color="#FFFFFF" />
            <Txt w={800} size={12} color="#FFFFFF" style={{ letterSpacing: 0.6 }}>LIVE</Txt>
          </View>
          <Txt w={600} size={12.5} color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{season}</Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TeamCol name={left.name} logo={left.logo} />
          <View style={{ alignItems: 'center', gap: space.xs }} onLayout={(e) => setCenterW(e.nativeEvent.layout.width)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <AnimatedNumber value={left.pts} size={44} />
              <Txt w={800} size={36}>-</Txt>
              <AnimatedNumber value={right.pts} size={44} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Txt w={700} size={12.5}>Set {live.set}</Txt>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.ok }} />
            </View>
          </View>
          <TeamCol name={right.name} logo={right.logo} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel={`Set vinti ${left.sets} a ${right.sets}`}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AnimatedNumber value={left.sets} size={24} />
          </View>
          <View style={{ width: centerW || undefined, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            <Txt w={700} size={10.5} color="muted" style={{ letterSpacing: 0.6 }}>SET VINTI</Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AnimatedNumber value={right.sets} size={24} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {m.youtubeLiveId ? (
            <Button
              label="Guarda la diretta"
              size="sm"
              icon={<YoutubeIcon size={22} />}
              // il video si apre nella schermata Live, dentro l'app
              onPress={() => { player.open(m.youtubeLiveId!, `${left.name} – ${right.name}`); router.push('/live'); }}
              accessibilityLabel="Guarda la diretta video"
              style={{ flex: 1, paddingHorizontal: space.sm }}
            />
          ) : null}
          <Button label="Vota la tua MVP" size="sm" icon={<Award size={18} color={c.text} />} onPress={() => setMvpOpen(true)} style={{ flex: 1, paddingHorizontal: space.sm }} />
        </View>

        {last ? <LiveTicker text={`${last.set}° set ${home ? `${last.our}–${last.opp}` : `${last.opp}–${last.our}`} · ${last.text}`} /> : null}
      </View>
    </Pressy>
    <MvpSheet open={mvpOpen} onClose={() => setMvpOpen(false)} match={m} awayMatch={!home} events={live.events} finished={live.finished} teams={mvpTeams} />
    </>
  );
}

function TeamCol({ name, logo }: { name: string; logo?: string | number | null }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
      <TeamBadge name={name} logo={logo} size={48} />
      <Txt w={800} size={11} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ letterSpacing: 0.2 }}>
        {name.toUpperCase()}
      </Txt>
    </View>
  );
}
