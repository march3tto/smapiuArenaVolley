import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import type { MediaItem } from '../../types/database';

export default function MediaScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('media_items')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setItems((data as MediaItem[]) ?? []);
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
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<Text style={styles.title}>Podcast & Video</Text>}
      ListEmptyComponent={<Text style={styles.muted}>Nessun contenuto pubblicato.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.thumb}>
            <Ionicons
              name={item.type === 'video' ? 'play-circle-outline' : 'mic-outline'}
              size={22}
              color={colors.yellow}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.badge}>
              {item.type === 'video' ? 'VIDEO' : 'PODCAST'}
              {item.duration_label ? ` · ${item.duration_label}` : ''}
            </Text>
            <Text style={styles.headline}>{item.title}</Text>
          </View>
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
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 11,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { fontSize: 9.5, fontWeight: '700', color: colors.navy, letterSpacing: 0.5 },
  headline: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 4 },
});
