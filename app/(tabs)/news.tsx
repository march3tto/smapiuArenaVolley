import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { NewsCard } from '@/components/NewsCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useData } from '@/store/DataProvider';

export default function News() {
  const { news, loading, refresh } = useData();
  const { width } = useWindowDimensions();
  const [cat, setCat] = useState('all');
  const options = useMemo(() => [{ value: 'all', label: 'Tutte' }, ...[...new Set(news.map((n) => n.category))].map((c) => ({ value: c, label: c }))], [news]);
  const list = cat === 'all' ? news : news.filter((n) => n.category === cat);
  const contentW = Math.min(width, 1120) - 28;
  const cols = width >= 1000 ? 3 : width >= 700 ? 2 : 1;
  const cardW = (contentW - 14 * (cols - 1)) / cols;

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <SectionHeader big title="News" subtitle="Partite, interviste e vita di società." />
      <SegmentedControl options={options} value={cat} onChange={setCat} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {list.map((n) => (
          <NewsCard key={n.id} item={n} width={cardW} />
        ))}
      </View>
    </Screen>
  );
}
