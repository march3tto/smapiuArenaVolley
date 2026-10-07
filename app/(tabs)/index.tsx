import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { LiveCard } from '@/components/LiveCard';
import { MediaStrip } from '@/components/MediaStrip';
import { NewsSlider } from '@/components/NewsSlider';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SponsorBanner } from '@/components/SponsorBanner';
import { StandingsTable } from '@/components/StandingsTable';
import { Txt } from '@/components/Txt';
import { UpcomingList } from '@/components/UpcomingList';
import { useData } from '@/store/DataProvider';

/** Ordine: diretta (solo se esiste) → news → prossime partite → banner sponsor → classifica → video e podcast */
export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { liveMatch, news, sponsors, matches, standings, media, loading, error, refresh } = useData();
  const next = useMemo(
    () => matches.filter((m) => m.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3),
    [matches],
  );
  const twoCols = width >= 900;
  // Sotto "Prossime partite": in colonna sta tra partite e classifica, su due colonne sotto entrambe
  const sponsorBanner = <SponsorBanner sponsors={sponsors} onPress={() => router.navigate('/altro')} />;

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
        <NewsSlider items={news} onPressItem={(n) => router.push({ pathname: '/notizia/[id]', params: { id: n.id } })} />
      </View>

      <View style={{ flexDirection: twoCols ? 'row' : 'column', gap: 16, alignItems: twoCols ? 'stretch' : 'flex-start' }}>
        <Card style={{ gap: 14, flex: twoCols ? 1 : undefined, width: twoCols ? undefined : '100%' }}>
          <SectionHeader title="Prossime partite" action={{ label: 'Calendario', onPress: () => router.navigate({ pathname: '/risultati', params: { filter: 'future' } }) }} />
          <UpcomingList matches={next} onPress={() => router.navigate({ pathname: '/risultati', params: { filter: 'future' } })} />
        </Card>
        {twoCols ? null : <View style={{ width: '100%' }}>{sponsorBanner}</View>}
        <Card style={{ gap: 6, flex: twoCols ? 1 : undefined, width: twoCols ? undefined : '100%' }}>
          <SectionHeader title="Classifica" subtitle="Serie A3, girone B" />
          <StandingsTable rows={standings} />
        </Card>
      </View>
      {twoCols ? sponsorBanner : null}

      {media.length ? (
        <View style={{ gap: 12 }}>
          <SectionHeader title="Video e podcast" action={{ label: 'Tutti', onPress: () => router.navigate('/altro') }} />
          <MediaStrip items={media} />
        </View>
      ) : null}
    </Screen>
  );
}
