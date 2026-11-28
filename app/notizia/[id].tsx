import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
import { SOURCE_LABEL } from '@/components/NewsCard';
import { SponsorCasuale } from '@/components/SponsorCasuale';
import { Txt } from '@/components/Txt';
import { newsDate } from '@/lib/format';
import { useData } from '@/store/DataProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, space } from '@/theme/colors';
import type { NewsItem } from '@/types';

/** Notizia completa; destra/sinistra per passare alla notizia successiva o precedente (come la scheda delle giocatrici) */
export default function NewsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const win = useWindowDimensions();
  // dimensioni reali del contenitore: nella lista orizzontale le pagine non si allungano da sole (su web restavano alte quanto il contenuto)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  };
  const width = size?.width ?? win.width;
  const { id, cat } = useLocalSearchParams<{ id: string; cat?: string }>();
  const { news } = useData();
  // stesse notizie (e stesso ordine) della lista da cui si è aperta: se era attivo un filtro per categoria si scorre solo quello
  const list = useMemo(() => {
    const filtered = cat && cat !== 'all' ? news.filter((x) => x.category === cat) : news;
    return filtered.some((x) => x.id === id) ? filtered : news;
  }, [news, cat, id]);
  // indice della notizia aperta: FlatList lo usa solo al primo montaggio, poi lo scorrimento aggiorna `scrolled` senza toccare l'URL
  const startIndex = Math.max(0, list.findIndex((x) => x.id === id));
  const [scrolled, setIndex] = useState<number | null>(null);
  const index = scrolled ?? startIndex;
  // pagina corrente dalla posizione di scorrimento (funziona anche su web, dove onMomentumScrollEnd non è affidabile)
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex((prev) => (prev === i ? prev : i));
  }, [width]);
  const getItemLayout = useCallback((_: unknown, i: number) => ({ length: width, offset: width * i, index: i }), [width]);

  if (!list.some((x) => x.id === id)) {
    return (
      <View style={{ flex: 1, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color="muted">Notizia non trovata.</Txt>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={{ flex: 1, backgroundColor: c.card }}>
      {size ? <FlatList
        key={`${size.width}x${size.height}`}
        data={list}
        keyExtractor={(x) => x.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={getItemLayout}
        onScroll={onScroll}
        scrollEventThrottle={32}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        renderItem={({ item }) => <NewsPage n={item} width={size.width} height={size.height} />}
      /> : null}
      <IconButton label="Chiudi" onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 12, right: 14, backgroundColor: 'rgba(6,26,58,0.55)' }}>
        <X size={18} color="#fff" />
      </IconButton>
    </View>
  );
}

/** Una notizia: copertina, titolo, testo diviso in paragrafi e, in fondo, categoria, fonte e data */
function NewsPage({ n, width, height }: { n: NewsItem; width: number; height: number }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  // i paragrafi nel database sono separati da una riga vuota
  const paragraphs = (n.body || n.excerpt).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <View style={{ width, height, backgroundColor: c.card }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
        {/* la copertina parte sotto la barra di stato (ora, batteria, notch): niente finisce sotto l'ora */}
        <View style={{ height: 420 + insets.top, paddingTop: insets.top, backgroundColor: c.fill }}>
          {n.image ? <CoverImage source={n.image} style={{ flex: 1 }} /> : null}
        </View>
        <View style={{ paddingHorizontal: space.lg, marginTop: space.md, gap: space.sm, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
          <Txt w={900} size={26} style={{ letterSpacing: -0.6, marginTop: space.xs }}>{n.title}</Txt>
          <View style={{ gap: space.md, marginTop: space.md }}>
            {paragraphs.map((p, i) => (
              <Txt key={i} size={16} style={{ lineHeight: 25 }}>{p}</Txt>
            ))}
          </View>
          {/* categoria e data in fondo, dopo il testo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.line }}>
            <View style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 999, backgroundColor: palette.gold }}>
              <Txt w={700} size={12} color={palette.onGold}>{n.category}</Txt>
            </View>
            {n.source ? (
              <View style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 999, borderWidth: 1, borderColor: c.line }} accessibilityLabel={`Fonte: ${SOURCE_LABEL[n.source]}`}>
                <Txt w={700} size={12} color="muted">{SOURCE_LABEL[n.source]}</Txt>
              </View>
            ) : null}
            <Txt size={13} color="muted">{newsDate(n.date)}</Txt>
          </View>
          <SponsorCasuale />
        </View>
      </ScrollView>
    </View>
  );
}
