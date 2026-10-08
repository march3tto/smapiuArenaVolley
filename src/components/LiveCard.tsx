import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedNumber } from './AnimatedNumber';
import { Button } from './Button';
import { LiveSignal } from './LiveDot';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { YoutubeIcon } from './YoutubeIcon';
import { US } from '@/constants';
import { youtubeUrl } from '@/lib/api';
import { useLive } from '@/store/LiveProvider';
import { useTheme } from '@/theme/ThemeProvider';

/** Card "In diretta" della home: compare solo se esiste una partita live */
export function LiveCard() {
  const { c, mode } = useTheme();
  const router = useRouter();
  const live = useLive();
  // Larghezza della colonna del punteggio: la riga "set vinti" la replica, così i numeri cadono sotto le squadre
  const [centerW, setCenterW] = useState(0);
  const m = live.match;
  if (!m) return null;
  const home = m.homeAway === 'casa';
  const left = { name: home ? US : m.opponent, logo: home ? null : m.opponentLogo, sets: home ? live.ourSets : live.oppSets, pts: home ? live.our : live.opp };
  const right = { name: home ? m.opponent : US, logo: home ? m.opponentLogo : null, sets: home ? live.oppSets : live.ourSets, pts: home ? live.opp : live.our };

  const season = m.season || m.competition?.name || 'Campionato';

  return (
    <Pressy onPress={() => router.push('/live')} scaleTo={0.98} accessibilityRole="link" accessibilityLabel="Segui la diretta">
      <LinearGradient
        colors={mode === 'dark' ? ['#2F62B0', '#1E4586'] : ['#FFFFFF', '#F1F5FD']}
        style={{ borderRadius: 22, padding: 14, gap: 12, borderWidth: 1.5, borderColor: 'rgba(242,184,0,0.55)' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: c.live }}>
            <LiveSignal size={13} color="#FFFFFF" />
            <Txt w={800} size={12} color="#FFFFFF" style={{ letterSpacing: 0.6 }}>LIVE</Txt>
          </View>
          <Txt w={600} size={12.5} color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>{season}</Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TeamCol name={left.name} logo={left.logo} />
          <View style={{ alignItems: 'center', gap: 2 }} onLayout={(e) => setCenterW(e.nativeEvent.layout.width)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AnimatedNumber value={left.pts} size={44} />
              <Txt w={800} size={36}>-</Txt>
              <AnimatedNumber value={right.pts} size={44} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
          <View style={{ width: centerW || undefined, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            <Txt w={700} size={10.5} color="muted" style={{ letterSpacing: 0.6 }}>SET VINTI</Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AnimatedNumber value={right.sets} size={24} />
          </View>
        </View>

        {m.youtubeLiveId ? (
          <Button
            label="Guarda su YouTube"
            size="sm"
            icon={<YoutubeIcon size={22} />}
            onPress={() => Linking.openURL(youtubeUrl(m.youtubeLiveId!))}
            accessibilityLabel="Guarda la diretta su YouTube"
          />
        ) : null}
      </LinearGradient>
    </Pressy>
  );
}

function TeamCol({ name, logo }: { name: string; logo?: string | number | null }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <TeamBadge name={name} logo={logo} size={48} />
      <Txt w={800} size={11} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ letterSpacing: 0.2 }}>
        {name.toUpperCase()}
      </Txt>
    </View>
  );
}
