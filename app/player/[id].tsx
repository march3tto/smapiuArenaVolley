import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { CourtPosition } from '@/components/CourtPosition';
import { CoverImage } from '@/components/CoverImage';
import { PlayerPlaceholder } from '@/components/PlayerPlaceholder';
import { IconButton } from '@/components/IconButton';
import { Txt } from '@/components/Txt';
import { ROLE_LABEL } from '@/constants';
import { fetchAttaccoGiocatrice } from '@/lib/api';
import { birthDate } from '@/lib/format';
import { useData } from '@/store/DataProvider';
import type { Player, PlayerRole } from '@/types';
import { blue, palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function PlayerScreen() {
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
  const { id, role } = useLocalSearchParams<{ id: string; role?: string }>();
  const { players } = useData();
  // stesse giocatrici (e stesso ordine) della griglia da cui si è aperta la scheda: se era attivo un filtro per ruolo si scorre solo quello
  const list = useMemo(() => {
    const filtered = role && role !== 'all' ? players.filter((x) => x.role === (role as PlayerRole)) : players;
    return filtered.some((x) => x.id === id) ? filtered : players;
  }, [players, role, id]);
  // indice della giocatrice aperta: FlatList lo usa solo al primo montaggio, poi lo scorrimento aggiorna `scrolled` senza toccare l'URL
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
        <Txt color="muted">Giocatrice non trovata.</Txt>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={{ flex: 1, backgroundColor: c.card }}>
      {/* scorrimento orizzontale a pagine: destra/sinistra per passare alla giocatrice successiva o precedente */}
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
        renderItem={({ item }) => <PlayerPage p={item} width={size.width} height={size.height} />}
      /> : null}
      <IconButton label="Chiudi" onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 12, right: 14, backgroundColor: 'rgba(6,26,58,0.55)' }}>
        <X size={18} color="#fff" />
      </IconButton>
    </View>
  );
}

function PlayerPage({ p, width, height }: { p: Player; width: number; height: number }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const name = `${p.firstName} ${p.lastName}`;
  // punti in attacco di stagione dai tabellini DataVolley confermati (nessun riquadro se non ci sono dati)
  const [attack, setAttack] = useState<Awaited<ReturnType<typeof fetchAttaccoGiocatrice>>>(null);
  useEffect(() => {
    let on = true;
    fetchAttaccoGiocatrice(p.id).then((a) => on && setAttack(a)).catch(() => {});
    return () => {
      on = false;
    };
  }, [p.id]);
  // ruolo e maglia sopra i dati personali ("—" se non ancora inseriti)
  const facts: [string, string][] = [
    ['Ruolo', ROLE_LABEL[p.role]],
    ['Maglia', p.number != null ? `#${p.number}` : '—'],
    ['Data di nascita', p.birthDate ? birthDate(p.birthDate) : p.born ? `Classe ${p.born}` : '—'],
    ['Altezza', p.heightCm ? `${p.heightCm} cm` : '—'],
    ...(attack ? [
      ['Punti in attacco', `${attack.points} in ${attack.matches} ${attack.matches === 1 ? 'partita' : 'partite'}`],
      ['Pt% medio', attack.perc != null ? `${attack.perc}%` : '—'],
    ] as [string, string][] : []),
    ...(p.status ? [['Stagione', p.status === 'nuova' ? 'Nuovo arrivo' : 'Confermata'] as [string, string]] : []),
  ];
  const photoW = Math.min(width, 560);

  return (
    <View style={{ width, height, backgroundColor: c.card }}>
      {/* schermo diviso a metà: sopra la foto, sotto i dati. La foto parte sotto la barra di stato, così la testa non finisce sotto l'ora */}
      {/* fascia della barra di stato come nelle news: colore del tema (chiaro o scuro) */}
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: c.fill }}>
        <View style={{ flex: 1, backgroundColor: blue[800] }}>
          {p.photo !== '' ? <CoverImage source={p.photo} style={{ flex: 1 }} /> : <PlayerPlaceholder number={p.number} size={Math.round(photoW * 0.3)} style={{ flex: 1 }} />}
        </View>
      </View>
      {/* metà inferiore: se i dati non ci stanno, si scorrono senza rimpicciolire la foto */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.md, gap: space.xs, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        {/* nome e fascia da capitana sotto la foto, non sovrapposti */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Txt w={900} size={26} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, letterSpacing: -0.8 }}>{name}</Txt>
          {p.isCaptain ? (
            <View style={{ backgroundColor: palette.gold, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 999 }}>
              <Txt w={700} size={11} color={palette.onGold}>Capitana</Txt>
            </View>
          ) : null}
        </View>
        {p.bio ? <Txt size={14} color="muted" numberOfLines={3} style={{ marginTop: space.xs }}>{p.bio}</Txt> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          {facts.map(([k, v], i) => (
            // ruolo e maglia sulla prima riga, dati personali sotto
            <View key={k} style={{ flexGrow: 1, flexBasis: i < 2 ? '40%' : 110, minWidth: 110, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 14, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
              <Txt size={11.5} color="muted">{k}</Txt>
              <Txt w={700} size={14} color={v === '—' ? 'muted' : 'text'}>{v}</Txt>
            </View>
          ))}
        </View>
        {/* pannello compatto: campo più piccolo, testi e margini ridotti */}
        <View style={{ gap: space.xs + 2, marginTop: space.sm, paddingHorizontal: space.sm + 4, paddingVertical: space.sm + 2, borderRadius: 14, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
          <Txt w={800} size={10.5} color="muted" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Posizione in campo</Txt>
          <CourtPosition role={p.role} size={Math.min(84, (photoW - 40) * 0.26)} />
        </View>
      </ScrollView>
    </View>
  );
}
