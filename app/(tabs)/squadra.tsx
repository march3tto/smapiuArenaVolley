import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Card } from '@/components/Card';
import { PlayerCard } from '@/components/PlayerCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Txt } from '@/components/Txt';
import { ROLE_FILTERS } from '@/constants';
import { initials } from '@/lib/format';
import { useData } from '@/store/DataProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { PlayerRole } from '@/types';

export default function Squadra() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { c } = useTheme();
  const { players, staff, loading, refresh } = useData();
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

      {staff.length ? (
        <View style={{ gap: 12, marginTop: 8 }}>
          <SectionHeader title="Staff tecnico" subtitle="Allenatori e staff della prima squadra." />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {staff.map((s, i) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
                  {s.photo ? (
                    <Image source={s.photo} style={{ width: 44, height: 44 }} contentFit="cover" contentPosition="top" transition={200} />
                  ) : (
                    <Txt w={800} size={14} color={palette.gold}>{initials(s.name)}</Txt>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt w={700} size={16}>{s.name}</Txt>
                  <Txt w={700} size={11.5} color="cobalt" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>{s.role}</Txt>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
