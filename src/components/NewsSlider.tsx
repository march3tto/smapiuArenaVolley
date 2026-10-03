import { FlatList, useWindowDimensions } from 'react-native';
import { NewsCard } from './NewsCard';
import type { NewsItem } from '@/types';

const GAP = 12;

/** Slider orizzontale compatto, scorrevole con il dito, con aggancio alla card */
export function NewsSlider({ items, onPressItem }: { items: NewsItem[]; onPressItem?: (n: NewsItem) => void }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(250, Math.round(width * 0.7));
  return (
    <FlatList
      data={items}
      horizontal
      keyExtractor={(n) => n.id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardW + GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={{ gap: GAP, paddingRight: 14 }}
      style={{ marginRight: -14, flexGrow: 0 }}
      renderItem={({ item }) => <NewsCard item={item} width={cardW} compact onPress={() => onPressItem?.(item)} />}
    />
  );
}
