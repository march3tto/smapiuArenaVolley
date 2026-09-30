import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

import { getNotizie } from '../../lib/api';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Notizia } from '../../lib/types';

const ETICHETTE_CATEGORIA: Record<Notizia['categoria'], string> = {
  societa: 'SOCIETÀ',
  prima_squadra: 'PRIMA SQUADRA',
  giovanili: 'GIOVANILI',
  sponsor: 'SPONSOR',
};

export default function NewsScreen() {
  const [news, setNews] = useState<Notizia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNotizie(50)
      .then((items) => setNews(items.filter((n) => n.pubblicata)))
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 20, gap: 12 }}
      data={news}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Text style={styles.title}>News</Text>}
      ListEmptyComponent={
        <Text style={error ? styles.error : styles.muted}>
          {error ? `Errore nel caricamento: ${error}` : 'Nessuna news pubblicata.'}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.badge}>{ETICHETTE_CATEGORIA[item.categoria]}</Text>
          <Text style={styles.headline}>{item.titolo}</Text>
          <Text style={styles.muted}>
            {new Date(item.pubblicato_il).toLocaleDateString('it-IT')}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: 19, fontFamily: fonts.display, color: colors.ink, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 11, fontFamily: fonts.body },
  error: { color: colors.loss, fontSize: 13, fontFamily: fonts.body },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 14,
    gap: 4,
  },
  badge: { fontSize: 9.5, fontFamily: fonts.display, color: colors.brand, letterSpacing: 0.8, textTransform: 'uppercase' },
  headline: { fontSize: 14, fontFamily: fonts.bodySemi, color: colors.ink },
});
