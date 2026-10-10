import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CoverImage } from './CoverImage';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { newsDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import type { NewsItem } from '@/types';

interface Props {
  item: NewsItem;
  width?: number;
  compact?: boolean;
  onPress?: () => void;
}

/** Card verticale del carosello in home: altezza come la vecchia card orizzontale, formato 4:5 come le copertine */
export const NEWS_COMPACT_H = 208;
export const NEWS_COMPACT_W = Math.round((NEWS_COMPACT_H * 4) / 5);

export function NewsCard({ item, width, compact, onPress }: Props) {
  const { c } = useTheme();
  if (compact) {
    return (
      <Pressy onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={item.title}
        style={{ width: NEWS_COMPACT_W, height: NEWS_COMPACT_H, borderRadius: 18, overflow: 'hidden', backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
        <Image source={item.image} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" contentPosition="center" transition={250} />
        <LinearGradient colors={['transparent', 'rgba(6,26,58,0.6)', 'rgba(6,26,58,0.95)']} locations={[0.35, 0.6, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(6,26,58,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Txt w={700} size={10.5} color="#fff">{item.category}</Txt>
        </View>
        <View style={{ position: 'absolute', left: 10, right: 10, bottom: 10, gap: 2 }}>
          <Txt size={11} color="rgba(255,255,255,0.75)">{newsDate(item.date)}</Txt>
          <Txt w={700} size={13.5} color="#fff" numberOfLines={3} style={{ letterSpacing: -0.2 }}>{item.title}</Txt>
        </View>
      </Pressy>
    );
  }
  return (
    <Pressy onPress={onPress} scaleTo={0.97} style={{ width, borderRadius: 22, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ aspectRatio: 16 / 9, backgroundColor: c.fill }}>
        {/* immagine intera e centrata (le copertine sono verticali) */}
        <CoverImage source={item.image} style={{ flex: 1 }} />
        <LinearGradient colors={['transparent', 'rgba(6,26,58,0.55)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(6,26,58,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Txt w={700} size={11} color="#fff">{item.category}</Txt>
        </View>
      </View>
      <View style={{ padding: 16, gap: 4 }}>
        <Txt size={11.5} color="muted">{newsDate(item.date)}</Txt>
        <Txt w={700} size={17} numberOfLines={2} style={{ letterSpacing: -0.2 }}>
          {item.title}
        </Txt>
        <Txt size={14} color="muted" numberOfLines={3} style={{ marginTop: 4 }}>
          {item.excerpt}
        </Txt>
      </View>
    </Pressy>
  );
}
