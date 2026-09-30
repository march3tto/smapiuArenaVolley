import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import type { NewsItem } from '../../types/database';

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setNews((data as NewsItem[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
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
      ListEmptyComponent={<Text style={styles.muted}>Nessuna news pubblicata.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.badge}>{item.category.toUpperCase()}</Text>
          <Text style={styles.headline}>{item.title}</Text>
          <Text style={styles.muted}>
            {new Date(item.published_at).toLocaleDateString('it-IT')}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 11 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  badge: { fontSize: 9.5, fontWeight: '700', color: colors.navy, letterSpacing: 0.5 },
  headline: { fontSize: 14, fontWeight: '700', color: colors.ink },
});
