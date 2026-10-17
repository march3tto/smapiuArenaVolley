import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CoverImage } from './CoverImage';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { newsDate } from '@/lib/format';
import { brand } from '@/theme/colors';
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

/**
 * Card della tab News: dimensioni fisse, prese dalla card "Beatrice Giroldi è la nuova capitana" su iPhone 15
 * (larghezza 393 − 28 di margini). Sotto l'immagine solo titolo (max 2 righe) e data.
 */
export const NEWS_CARD_W = 365;
const NEWS_CARD_IMG_H = 205;
const NEWS_CARD_TEXT_H = 95;
export const NEWS_CARD_H = NEWS_CARD_IMG_H + NEWS_CARD_TEXT_H + 2; // + bordo

/** Colore dell'etichetta per categoria (sfondo, testo); le altre restano blu notte semitrasparente */
const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  'Serie A3': { bg: brand.giallo, fg: brand.bluNotte },
  Giovanili: { bg: brand.blu, fg: brand.bianco },
  'Società': { bg: brand.bianco, fg: brand.bluNotte },
  Sponsor: { bg: '#10935B', fg: brand.bianco },
};

function CategoryBadge({ category, big }: { category: string; big?: boolean }) {
  const col = CATEGORY_COLORS[category];
  return (
    <View style={{ position: 'absolute', top: 8, left: 8, paddingHorizontal: big ? 9 : 8, paddingVertical: big ? 3 : 2, borderRadius: 999,
      backgroundColor: col?.bg ?? 'rgba(6,26,58,0.6)', borderWidth: col ? 0 : 1, borderColor: 'rgba(255,255,255,0.2)' }}>
      <Txt w={700} size={big ? 11 : 10.5} color={col?.fg ?? '#fff'}>{category}</Txt>
    </View>
  );
}

export function NewsCard({ item, width, compact, onPress }: Props) {
  const { c } = useTheme();
  if (compact) {
    return (
      <Pressy onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={item.title}
        style={{ width: NEWS_COMPACT_W, height: NEWS_COMPACT_H, borderRadius: 18, overflow: 'hidden', backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
        <Image source={item.image} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" contentPosition="center" transition={250} />
        <LinearGradient colors={['transparent', 'rgba(6,26,58,0.6)', 'rgba(6,26,58,0.95)']} locations={[0.35, 0.6, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <CategoryBadge category={item.category} />
        <View style={{ position: 'absolute', left: 10, right: 10, bottom: 10, gap: 2 }}>
          <Txt size={11} color="rgba(255,255,255,0.75)">{newsDate(item.date)}</Txt>
          <Txt w={700} size={13.5} color="#fff" numberOfLines={3} style={{ letterSpacing: -0.2 }}>{item.title}</Txt>
        </View>
      </Pressy>
    );
  }
  return (
    <Pressy onPress={onPress} scaleTo={0.97} style={{ width: Math.min(width ?? NEWS_CARD_W, NEWS_CARD_W), height: NEWS_CARD_H, borderRadius: 22, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ height: NEWS_CARD_IMG_H, backgroundColor: c.fill }}>
        {/* immagine intera e centrata (le copertine sono verticali) */}
        <CoverImage source={item.image} style={{ flex: 1 }} />
        <LinearGradient colors={['transparent', 'rgba(6,26,58,0.55)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <CategoryBadge category={item.category} big />
      </View>
      <View style={{ height: NEWS_CARD_TEXT_H, padding: 16, gap: 4, overflow: 'hidden' }}>
        <Txt w={700} size={17} numberOfLines={2} style={{ letterSpacing: -0.2 }}>
          {item.title}
        </Txt>
        <Txt size={11.5} color="muted">{newsDate(item.date)}</Txt>
      </View>
    </Pressy>
  );
}
