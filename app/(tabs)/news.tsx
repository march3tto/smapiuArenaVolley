import { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MediaList } from '@/components/MediaList';
import { NewsCard } from '@/components/NewsCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useData } from '@/store/DataProvider';

/** Valore del filtro che mostra solo video e podcast */
const MEDIA = '__media';

export default function News() {
  const router = useRouter();
  const { news, media, loading, refresh } = useData();
  const { width } = useWindowDimensions();
  const [cat, setCat] = useState('all');
  // "Tutti" del banner video e podcast in home apre la tab già filtrata
  const { filtro } = useLocalSearchParams<{ filtro?: string }>();
  useEffect(() => {
    if (filtro !== 'media') return;
    setCat(MEDIA);
    router.setParams({ filtro: undefined });
  }, [filtro, router]);
  const options = useMemo(() => [
    { value: 'all', label: 'Tutte' },
    ...[...new Set(news.map((n) => n.category))].map((c) => ({ value: c, label: c })),
    ...(media.length ? [{ value: MEDIA, label: 'Video e podcast' }] : []),
  ], [news, media.length]);
  const list = cat === 'all' ? news : news.filter((n) => n.category === cat);
  const showMedia = media.length > 0 && (cat === 'all' || cat === MEDIA);
  const contentW = Math.min(width, 1120) - 28;
  const cols = width >= 1000 ? 3 : width >= 700 ? 2 : 1;
  const cardW = (contentW - 14 * (cols - 1)) / cols;

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <SectionHeader big title="News" subtitle="Partite, interviste e vita di società." />
      <SegmentedControl options={options} value={cat} onChange={setCat} />
      {cat === MEDIA ? null : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {list.map((n) => (
            <NewsCard key={n.id} item={n} width={cardW} onPress={() => router.push({ pathname: '/notizia/[id]', params: { id: n.id } })} />
          ))}
        </View>
      )}
      {showMedia ? (
        <View style={{ gap: 12 }}>
          {cat === 'all' ? <SectionHeader title="Video e podcast" subtitle="Interviste e dietro le quinte, su YouTube." /> : null}
          <MediaList items={media} />
        </View>
      ) : null}
    </Screen>
  );
}
