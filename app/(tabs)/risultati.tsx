import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { MatchRow } from '@/components/MatchRow';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StandingsTable } from '@/components/StandingsTable';
import { Txt } from '@/components/Txt';
import { useData } from '@/store/DataProvider';
import { useLive } from '@/store/LiveProvider';
import { useTheme } from '@/theme/ThemeProvider';

type Filter = 'all' | 'past' | 'future';
const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'past', label: 'Giocate' },
  { value: 'future', label: 'Prossime' },
];

export default function Risultati() {
  const { c } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>('all');
  const { matches, standings, loading, refresh } = useData();
  const live = useLive();

  useEffect(() => {
    if (params.filter === 'future' || params.filter === 'past' || params.filter === 'all') setFilter(params.filter);
  }, [params.filter]);

  const list = useMemo(() => {
    const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));
    if (filter === 'past') return sorted.filter((m) => m.status === 'finished');
    if (filter === 'future') return sorted.filter((m) => m.status === 'scheduled' || m.status === 'live' || m.status === 'postponed');
    return sorted;
  }, [matches, filter]);

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <SectionHeader big title="Risultati" subtitle="Calendario e classifica Serie A3 femminile, girone B." />
      <SegmentedControl options={OPTIONS} value={filter} onChange={setFilter} />
      <View style={{ gap: 12 }}>
        {list.length ? (
          list.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              liveSets={m.status === 'live' ? { our: live.ourSets, opp: live.oppSets } : undefined}
              onPress={m.status === 'live' ? () => router.push('/live') : undefined}
            />
          ))
        ) : (
          <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 30 }}>
            <CalendarDays size={26} color={c.accent} />
            <Txt color="muted" center>Nessuna partita in questo elenco.</Txt>
          </Card>
        )}
      </View>
      <Card style={{ gap: 6 }}>
        <SectionHeader title="Classifica" subtitle="Serie A3, girone B" />
        <StandingsTable rows={standings} />
      </Card>
    </Screen>
  );
}
