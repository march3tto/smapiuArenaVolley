import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { InstagramStrip } from '@/components/InstagramStrip';
import { LiveCard } from '@/components/LiveCard';
import { NewsSlider } from '@/components/NewsSlider';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SponsorBanner } from '@/components/SponsorBanner';
import { StandingsTable } from '@/components/StandingsTable';
import { Txt } from '@/components/Txt';
import { UpcomingList } from '@/components/UpcomingList';
import { useData } from '@/store/DataProvider';

/** Ordine: diretta (solo se esiste) → news → banner sponsor → prossime partite → classifica */
export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { liveMatch, news, sponsors, matches, standings, loading, error, refresh } = useData();
  const next = useMemo(
    () => matches.filter((m) => m.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3),
    [matches],
  );
  const twoCols = width >= 900;

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      {error ? (
        <Card style={{ borderColor: 'rgba(255,122,136,0.4)' }}>
          <Txt w={700} size={14} color="danger">Dati non aggiornati</Txt>
          <Txt size={13} color="muted" style={{ marginTop: 4 }}>{error}. Trascina verso il basso per riprovare.</Txt>
        </Card>
      ) : null}
      {liveMatch ? <LiveCard /> : null}

      <View style={{ gap: 12 }}>
        <SectionHeader title="Ultime notizie" action={{ label: 'Tutte', onPress: () => router.navigate('/news') }} />
        <NewsSlider items={news} onPressItem={() => router.navigate('/news')} />
      </View>

      <SponsorBanner sponsors={sponsors} onPress={() => router.navigate('/altro')} />

      {/* Su due colonne le card hanno la stessa altezza: le partite si distribuiscono sull'altezza della classifica */}
      <View style={{ flexDirection: twoCols ? 'row' : 'column', gap: 16, alignItems: twoCols ? 'stretch' : 'flex-start' }}>
        <Card style={{ gap: 14, flex: twoCols ? 1 : undefined, width: twoCols ? undefined : '100%' }}>
          <SectionHeader title="Prossime partite" action={{ label: 'Calendario', onPress: () => router.navigate({ pathname: '/risultati', params: { filter: 'future' } }) }} />
          <UpcomingList matches={next} fill={twoCols} onPress={() => router.navigate({ pathname: '/risultati', params: { filter: 'future' } })} />
        </Card>
        <Card style={{ gap: 6, flex: twoCols ? 1 : undefined, width: twoCols ? undefined : '100%' }}>
          <SectionHeader title="Classifica" subtitle="Serie A3, girone B" />
          <StandingsTable rows={standings} />
        </Card>
      </View>

      <InstagramStrip />
    </Screen>
  );
}
