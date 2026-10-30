import { View } from 'react-native';
import { Image } from 'expo-image';
import { JerseyNumber } from './JerseyNumber';
import { PlayerPlaceholder } from './PlayerPlaceholder';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { ROLE_LABEL } from '@/constants';
import { blue, palette, space } from '@/theme/colors';
import type { Player } from '@/types';

export function PlayerCard({ player: p, width, onPress }: { player: Player; width: number; onPress?: () => void }) {
  const name = `${p.firstName} ${p.lastName}`;
  return (
    <Pressy onPress={onPress} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={`${name}, ${ROLE_LABEL[p.role]}`}
      style={{ width, height: (width * 4) / 3, borderRadius: 22, overflow: 'hidden', backgroundColor: blue[800], borderWidth: 1, borderColor: 'rgba(214,228,247,0.18)' }}>
      {p.photo !== '' ? (
        <Image source={p.photo} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" contentPosition="top" transition={250} />
      ) : (
        // senza foto il numero di maglia va al centro, al posto di quello in basso
        <PlayerPlaceholder number={p.number} size={Math.round(width * 0.36)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '22%' }} />
      )}
      {p.isCaptain ? (
        <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: palette.gold, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 999 }}>
          <Txt w={700} size={11} color={palette.onGold}>Capitana</Txt>
        </View>
      ) : null}
      {/* fascia scura piena sotto nome e ruolo: restano leggibili su ogni foto */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.sm, backgroundColor: 'rgba(6,26,58,0.85)', flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt w={800} size={16} color="#fff" numberOfLines={1} style={{ letterSpacing: -0.2 }}>{p.firstName}</Txt>
          <Txt w={800} size={16} color="#fff" numberOfLines={1} style={{ letterSpacing: -0.2 }}>{p.lastName}</Txt>
          <Txt w={600} size={12} color={palette.gold}>{ROLE_LABEL[p.role]}</Txt>
          {p.status ? (
            <View style={{ marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)' }}>
              <Txt w={700} size={12} color={p.status === 'nuova' ? palette.gold : '#fff'}>{p.status === 'nuova' ? 'Nuovo arrivo' : 'Confermata'}</Txt>
            </View>
          ) : null}
        </View>
        {p.number != null && p.photo !== '' ? <JerseyNumber value={p.number} size={Math.round(width * 0.26 * 0.7 * 0.9)} /> : null}
      </View>
    </Pressy>
  );
}
