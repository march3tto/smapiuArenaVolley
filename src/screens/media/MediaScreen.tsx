import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getMedia } from '../../lib/api';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Media } from '../../lib/types';

export default function MediaScreen() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMedia()
      .then((all) => setItems(all.filter((m) => m.pubblicato)))
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
      contentContainerStyle={{ padding: 20, gap: 10 }}
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Text style={styles.title}>Podcast & Video</Text>}
      ListEmptyComponent={
        <Text style={error ? styles.error : styles.muted}>
          {error ? `Errore nel caricamento: ${error}` : 'Nessun contenuto pubblicato.'}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.thumb}>
            <Ionicons
              name={item.tipo === 'video' ? 'play-circle-outline' : 'mic-outline'}
              size={22}
              color={colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.badge}>
              {item.tipo === 'video' ? 'VIDEO' : 'PODCAST'}
              {item.etichetta_durata ? ` · ${item.etichetta_durata}` : ''}
            </Text>
            <Text style={styles.headline}>{item.titolo}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: 19, fontFamily: fonts.display, color: colors.ink, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body },
  error: { color: colors.loss, fontSize: 13, fontFamily: fonts.body },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { fontSize: 9.5, fontFamily: fonts.display, color: colors.brand, letterSpacing: 0.8, textTransform: 'uppercase' },
  headline: { fontSize: 13, fontFamily: fonts.bodySemi, color: colors.ink, marginTop: 4 },
});
