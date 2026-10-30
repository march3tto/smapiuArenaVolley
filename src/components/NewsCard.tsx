import { View } from 'react-native';
import { Image } from 'expo-image';
import { CoverImage } from './CoverImage';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { newsDate } from '@/lib/format';
import { blue, palette, space } from '@/theme/colors';
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
 * (larghezza 393 − 28 di margini). Sotto l'immagine titolo (spazio fisso di 3 righe), poi data e categoria.
 */
export const NEWS_CARD_W = 365;
const NEWS_CARD_IMG_H = 205;

/** Titolo: spazio sempre di 3 righe, anche se è più corto, così data e categoria stanno alla stessa altezza in tutte le card */
const TITLE_LINES = 3;
const TITLE = { compact: { size: 13.5, line: 18 }, big: { size: 17, line: 22 } } as const;
/** Riga di data e categoria (alta quanto l'etichetta) */
const META_H = 22;
const NEWS_CARD_TEXT_H = space.md * 2 + TITLE.big.line * TITLE_LINES + space.sm + META_H;
export const NEWS_CARD_H = NEWS_CARD_IMG_H + NEWS_CARD_TEXT_H + 2; // + bordo

/** Colore dell'etichetta per categoria (sfondo, testo); le altre restano scure semitrasparenti */
const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  'Serie A3': { bg: palette.gold, fg: blue[900] },
  Giovanili: { bg: palette.blue, fg: palette.white },
  'Società': { bg: palette.white, fg: blue[900] },
  Sponsor: { bg: blue[800], fg: palette.white },
};

/** Sfondo dell'etichetta di una categoria (anche per il puntino del filtro nella tab News) */
export const categoryColor = (category: string) => CATEGORY_COLORS[category]?.bg ?? 'rgba(6,26,58,0.6)';

/** Etichetta della categoria, in basso a destra accanto alla data; il bordo la stacca dal fondo (es. "Società" bianca sulla card chiara) */
function CategoryBadge({ category, big, onDark }: { category: string; big?: boolean; onDark?: boolean }) {
  const { c } = useTheme();
  const col = CATEGORY_COLORS[category];
  return (
    <View style={{ height: META_H, justifyContent: 'center', paddingHorizontal: space.sm, borderRadius: 999, flexShrink: 0,
      backgroundColor: col?.bg ?? 'rgba(6,26,58,0.6)', borderWidth: 1, borderColor: onDark ? 'rgba(255,255,255,0.2)' : c.line }}>
      <Txt w={700} size={big ? 11 : 10.5} color={col?.fg ?? '#fff'} numberOfLines={1}>{category}</Txt>
    </View>
  );
}

/** Riga in fondo alla card: data a sinistra, categoria a destra */
function Meta({ item, big, onDark }: { item: NewsItem; big?: boolean; onDark?: boolean }) {
  return (
    <View style={{ height: META_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
      <Txt size={big ? 11.5 : 11} color={onDark ? 'rgba(255,255,255,0.75)' : 'muted'} numberOfLines={1} style={{ flexShrink: 1 }}>{newsDate(item.date)}</Txt>
      <CategoryBadge category={item.category} big={big} onDark={onDark} />
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
        {/* fascia scura piena sotto il testo: resta leggibile su ogni foto */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.sm, gap: space.xs, backgroundColor: 'rgba(6,26,58,0.85)' }}>
          <Txt w={700} size={TITLE.compact.size} color="#fff" numberOfLines={TITLE_LINES}
            style={{ letterSpacing: -0.2, lineHeight: TITLE.compact.line, height: TITLE.compact.line * TITLE_LINES }}>{item.title}</Txt>
          <Meta item={item} onDark />
        </View>
      </Pressy>
    );
  }
  return (
    <Pressy onPress={onPress} scaleTo={0.97} style={{ width: Math.min(width ?? NEWS_CARD_W, NEWS_CARD_W), height: NEWS_CARD_H, borderRadius: 22, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ height: NEWS_CARD_IMG_H, backgroundColor: c.fill }}>
        {/* immagine intera e centrata (le copertine sono verticali) */}
        <CoverImage source={item.image} style={{ flex: 1 }} />
      </View>
      <View style={{ height: NEWS_CARD_TEXT_H, padding: space.md, gap: space.sm, overflow: 'hidden' }}>
        <Txt w={700} size={TITLE.big.size} numberOfLines={TITLE_LINES}
          style={{ letterSpacing: -0.2, lineHeight: TITLE.big.line, height: TITLE.big.line * TITLE_LINES }}>
          {item.title}
        </Txt>
        <Meta item={item} big />
      </View>
    </Pressy>
  );
}
