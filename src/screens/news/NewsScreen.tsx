import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getNotizie } from '../../lib/api';
import { dataBreve } from '../../lib/format';
import { Card, ChipRow, Loading, Message, ScreenTitle } from '../../components/ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { CategoriaNotizia, Notizia } from '../../lib/types';

const ETICHETTE_CATEGORIA: Record<CategoriaNotizia, string> = {
  prima_squadra: 'Serie B1',
  societa: 'Società',
  giovanili: 'Giovanili',
  sponsor: 'Sponsor',
};

type Filtro = 'tutte' | CategoriaNotizia;

const FILTRI: { value: Filtro; label: string }[] = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'prima_squadra', label: 'B1' },
  { value: 'societa', label: 'Società' },
  { value: 'giovanili', label: 'Giovanili' },
  { value: 'sponsor', label: 'Sponsor' },
];

export default function NewsScreen() {
  const [news, setNews] = useState<Notizia[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('tutte');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNotizie(50)
      .then((items) => setNews(items.filter((n) => n.pubblicata)))
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const visibili = filtro === 'tutte' ? news : news.filter((n) => n.categoria === filtro);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={visibili}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenTitle title="NEWS ARENA VOLLEY" />
          <ChipRow options={FILTRI} value={filtro} onChange={setFiltro} />
        </View>
      }
      ListEmptyComponent={<Message error={error} empty="Nessuna news pubblicata." />}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.image}>
            {item.url_immagine_copertina ? (
              <Image source={{ uri: item.url_immagine_copertina }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Ionicons name="image-outline" size={28} color={colors.faint} />
            )}
            <Text style={styles.badge}>{ETICHETTE_CATEGORIA[item.categoria]}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.date}>{dataBreve(item.pubblicato_il)}</Text>
            <Text style={styles.headline}>{item.titolo}</Text>
            {item.corpo ? (
              <Text style={styles.excerpt} numberOfLines={3}>
                {item.corpo}
              </Text>
            ) : null}
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  header: { gap: 12 },
  card: { padding: 12, gap: 10, borderColor: colors.lineSoft },
  image: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.opponent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.yellow,
    color: colors.navy,
    fontFamily: fonts.display,
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  body: { gap: 4 },
  date: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  headline: { color: colors.text, fontFamily: fonts.display, fontSize: 14 },
  excerpt: { color: colors.textSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
});
