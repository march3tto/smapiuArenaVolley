import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Trophy } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { MatchRow } from '@/components/MatchRow';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StandingsTable } from '@/components/StandingsTable';
import { Txt } from '@/components/Txt';
import { useData } from '@/store/DataProvider';
import { useLive } from '@/store/LiveProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

type Filter = 'all' | 'past' | 'future' | 'a3' | 'standings';
const OPTIONS: { value: Exclude<Filter, 'standings'>; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'past', label: 'Giocate' },
  { value: 'future', label: 'Prossime' },
  { value: 'a3', label: 'Serie A3' },
];
// la classifica non sta nel banner: si apre con l'icona alla sua destra
const FILTERS = [...OPTIONS.map((o) => o.value as string), 'standings'];

export default function Risultati() {
  const { c } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>('future');
  const { matches, standings, loading, refresh } = useData();
  const live = useLive();

  useEffect(() => {
    if (params.filter && FILTERS.includes(params.filter)) setFilter(params.filter as Filter);
  }, [params.filter]);

  const list = useMemo(() => {
    const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date));
    if (filter === 'past') return sorted.filter((m) => m.status === 'finished');
    if (filter === 'future') return sorted.filter((m) => m.status === 'scheduled' || m.status === 'live' || m.status === 'postponed');
    if (filter === 'a3') return sorted.filter((m) => m.competition?.name.includes('Serie A3'));
    return sorted;
  }, [matches, filter]);

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <SectionHeader big title="Risultati" subtitle="Calendario e classifica Serie A3 femminile, girone B." />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flexShrink: 1 }}>
          {/* con la classifica aperta nessuna pillola è evidenziata */}
          <SegmentedControl options={OPTIONS} value={filter === 'standings' ? null : filter} onChange={setFilter} />
        </View>
        <IconButton label="Classifica" size={44} active={filter === 'standings'} onPress={() => setFilter('standings')}>
          <Trophy size={19} color={filter === 'standings' ? palette.onGold : c.accent} />
        </IconButton>
      </View>
      {filter === 'standings' ? (
        <Card style={{ gap: 6 }}>
          <SectionHeader title="Classifica" subtitle="Serie A3, girone B" />
          <StandingsTable rows={standings} />
        </Card>
      ) : (
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
      )}
    </Screen>
  );
}
