import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import type { YouthCategory } from '../../types/database';

export default function GiovaniliScreen() {
  const [categories, setCategories] = useState<YouthCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('youth_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setCategories((data as YouthCategory[]) ?? []);
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
      contentContainerStyle={{ padding: 20, gap: 10 }}
      data={categories}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Text style={styles.title}>Settore giovanile</Text>}
      ListEmptyComponent={<Text style={styles.muted}>Nessuna categoria inserita.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          {item.coach_name ? (
            <Text style={styles.muted}>Allenatore: {item.coach_name}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 14,
  },
  name: { fontSize: 14, fontWeight: '700', color: colors.ink },
});
