import { FlatList } from 'react-native';
import { NEWS_COMPACT_W, NewsCard } from './NewsCard';
import type { NewsItem } from '@/types';
import { space } from '@/theme/colors';

const GAP = space.md;

/** Slider orizzontale compatto, scorrevole con il dito, con aggancio alla card */
export function NewsSlider({ items, onPressItem }: { items: NewsItem[]; onPressItem?: (n: NewsItem) => void }) {
  const cardW = NEWS_COMPACT_W;
  return (
    <FlatList
      data={items}
      horizontal
      keyExtractor={(n) => n.id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardW + GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={{ gap: GAP, paddingRight: space.md }}
      style={{ marginRight: -space.md, flexGrow: 0 }}
      renderItem={({ item }) => <NewsCard item={item} compact onPress={() => onPressItem?.(item)} />}
    />
  );
}
