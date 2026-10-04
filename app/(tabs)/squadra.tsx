import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PlayerCard } from '@/components/PlayerCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ROLE_FILTERS } from '@/constants';
import { useData } from '@/store/DataProvider';
import type { PlayerRole } from '@/types';

export default function Squadra() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { players, loading, refresh } = useData();
  const [role, setRole] = useState<'all' | PlayerRole>('all');
  const list = useMemo(() => (role === 'all' ? players : players.filter((p) => p.role === role)), [players, role]);

  const contentW = Math.min(width, 1120) - 28;
  const cols = width >= 1000 ? 4 : width >= 640 ? 3 : 2;
  const gap = 12;
  const cardW = (contentW - gap * (cols - 1)) / cols;

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <SectionHeader big title="Rosa Serie A3" subtitle="Smapiù Arena Volley Team 2026/27. Tocca una giocatrice per aprire la scheda." />
      <SegmentedControl options={ROLE_FILTERS} value={role} onChange={setRole} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {list.map((p) => (
          <PlayerCard key={p.id} player={p} width={cardW} onPress={() => router.push({ pathname: '/player/[id]', params: { id: p.id } })} />
        ))}
      </View>
    </Screen>
  );
}
