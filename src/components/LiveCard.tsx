import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Volleyball } from 'lucide-react-native';
import { AnimatedNumber } from './AnimatedNumber';
import { Button } from './Button';
import { LiveDot } from './LiveDot';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { US } from '@/constants';
import { useLive } from '@/store/LiveProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Card "In diretta" della home: compare solo se esiste una partita live */
export function LiveCard() {
  const { c, mode } = useTheme();
  const router = useRouter();
  const live = useLive();
  const m = live.match;
  if (!m) return null;
  const home = m.homeAway === 'casa';
  const left = { name: home ? US : m.opponent, logo: home ? null : m.opponentLogo, sets: home ? live.ourSets : live.oppSets, pts: home ? live.our : live.opp };
  const right = { name: home ? m.opponent : US, logo: home ? m.opponentLogo : null, sets: home ? live.oppSets : live.ourSets, pts: home ? live.opp : live.our };

  return (
    <LinearGradient
      colors={mode === 'dark' ? ['#10266A', '#081640'] : ['#FFFFFF', '#F1F5FD']}
      style={{ borderRadius: 26, padding: 18, gap: 18, borderWidth: 1.5, borderColor: 'rgba(242,184,0,0.55)' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,77,94,0.14)', borderWidth: 1, borderColor: 'rgba(255,77,94,0.3)' }}>
          <LiveDot />
          <Txt w={700} size={12} color="live">
            In diretta, {live.set}° set
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
          <MapPin size={13} color={c.accent} />
          <Txt size={12.5} color="muted" numberOfLines={1}>
            {m.venue}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TeamCol name={left.name} logo={left.logo} />
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AnimatedNumber value={left.sets} size={56} />
            <Txt w={400} size={40} color="accent">:</Txt>
            <AnimatedNumber value={right.sets} size={56} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
            <Txt w={600} size={12.5} color="muted">{live.set}° set</Txt>
            <Txt w={800} size={15} tnum>{left.pts}–{right.pts}</Txt>
          </View>
        </View>
        <TeamCol name={right.name} logo={right.logo} />
      </View>

      <Button label="Segui la diretta" variant="gold" size="lg" icon={<Volleyball size={18} color={palette.onGold} />} onPress={() => router.push('/live')} />
    </LinearGradient>
  );
}

function TeamCol({ name, logo }: { name: string; logo?: string | number | null }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
      <TeamBadge name={name} logo={logo} size={60} />
      <Txt w={700} size={14} center numberOfLines={2}>
        {name}
      </Txt>
    </View>
  );
}
