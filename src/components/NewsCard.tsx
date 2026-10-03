import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

export function NewsCard({ item, width, compact, onPress }: Props) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} scaleTo={0.97} style={{ width, borderRadius: compact ? 18 : 22, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ aspectRatio: compact ? 2 : 16 / 9, backgroundColor: c.fill }}>
        <Image source={item.image} style={{ flex: 1 }} contentFit="cover" transition={250} />
        <LinearGradient colors={['transparent', 'rgba(5,13,36,0.55)']} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(5,13,36,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Txt w={700} size={11} color="#fff">{item.category}</Txt>
        </View>
      </View>
      <View style={{ padding: compact ? 12 : 16, gap: 4 }}>
        <Txt size={11.5} color="muted">{newsDate(item.date)}</Txt>
        <Txt w={700} size={compact ? 14.5 : 17} numberOfLines={2} style={{ letterSpacing: -0.2 }}>
          {item.title}
        </Txt>
        {!compact ? (
          <Txt size={14} color="muted" numberOfLines={3} style={{ marginTop: 4 }}>
            {item.excerpt}
          </Txt>
        ) : null}
      </View>
    </Pressy>
  );
}
