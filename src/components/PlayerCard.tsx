import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { JerseyNumber } from './JerseyNumber';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { ROLE_LABEL } from '@/constants';
import { palette } from '@/theme/colors';
import type { Player } from '@/types';

export function PlayerCard({ player: p, width, onPress }: { player: Player; width: number; onPress?: () => void }) {
  const name = `${p.firstName} ${p.lastName}`;
  return (
    <Pressy onPress={onPress} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={`${name}, ${ROLE_LABEL[p.role]}`}
      style={{ width, height: (width * 4) / 3, borderRadius: 22, overflow: 'hidden', backgroundColor: '#0B3166', borderWidth: 1, borderColor: 'rgba(214,228,247,0.18)' }}>
      <Image source={p.photo} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" contentPosition="top" transition={250} />
      <LinearGradient colors={['transparent', 'rgba(6,26,58,0.35)', 'rgba(6,26,58,0.96)']} locations={[0.3, 0.55, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {p.number != null ? (
        <JerseyNumber value={p.number} size={Math.round(width * 0.26)} style={{ position: 'absolute', top: 8, right: 10 }} />
      ) : null}
      {p.isCaptain ? (
        <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: palette.gold, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
          <Txt w={700} size={11} color={palette.onGold}>Capitana</Txt>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
        <Txt w={800} size={16} color="#fff" numberOfLines={2} style={{ letterSpacing: -0.2 }}>{name}</Txt>
        <Txt w={600} size={12} color={palette.goldHi}>{ROLE_LABEL[p.role]}</Txt>
        {p.status || p.born ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)' }}>
            {p.status ? <Txt w={700} size={12} color={p.status === 'nuova' ? palette.goldHi : '#fff'}>{p.status === 'nuova' ? 'Nuovo arrivo' : 'Confermata'}</Txt> : null}
            {p.born ? <Txt size={12} color="rgba(255,255,255,0.75)">Classe {p.born}</Txt> : null}
          </View>
        ) : null}
      </View>
    </Pressy>
  );
}
