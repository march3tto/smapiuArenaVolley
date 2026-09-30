import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import type { SquadraStackParamList } from '../../navigation/types';
import type { Match, NewsItem } from '../../types/database';

type Nav = NativeStackNavigationProp<SquadraStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredMatch, setFeaturedMatch] = useState<Match | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  const load = useCallback(async () => {
    // partita live, se c'e'; altrimenti la prossima in calendario
    const { data: live } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'live')
      .order('match_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    let match = live as Match | null;
    if (!match) {
      const { data: next } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      match = next as Match | null;
    }
    setFeaturedMatch(match);

    const { data: latestNews } = await supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(3);
    setNews((latestNews as NewsItem[]) ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>In evidenza</Text>
      {news.length === 0 ? (
        <Text style={styles.muted}>Nessuna news pubblicata.</Text>
      ) : (
        news.map((item) => (
          <View key={item.id} style={styles.newsCard}>
            <Text style={styles.newsBadge}>NEWS</Text>
            <Text style={styles.newsTitle}>{item.title}</Text>
          </View>
        ))
      )}

      {featuredMatch ? (
        <Pressable
          onPress={() =>
            featuredMatch.status === 'live' &&
            navigation.navigate('Live', { matchId: featuredMatch.id })
          }
          style={[
            styles.matchCard,
            featuredMatch.status !== 'live' && { opacity: 0.95 },
          ]}
        >
          {featuredMatch.status === 'live' ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>LIVE</Text>
            </View>
          ) : (
            <Text style={styles.nextLabel}>PROSSIMO IMPEGNO</Text>
          )}
          <View style={styles.matchRow}>
            <Text style={styles.teamName}>SmapiuArenaVolley</Text>
            <Text style={styles.score}>
              {featuredMatch.status === 'live'
                ? `${featuredMatch.our_sets_won ?? 0}–${featuredMatch.opponent_sets_won ?? 0}`
                : new Date(featuredMatch.match_date).toLocaleDateString('it-IT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
            </Text>
            <Text style={styles.teamName}>{featuredMatch.opponent_name}</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.matchCard}>
          <Text style={styles.muted}>Nessuna partita in calendario al momento.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  newsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  newsBadge: { fontSize: 10, fontWeight: '700', color: colors.navy },
  newsTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 4 },
  matchCard: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    padding: 18,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  liveLabel: { color: '#FF8A93', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  nextLabel: { color: '#AFC0D4', fontWeight: '700', fontSize: 11, marginBottom: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { color: '#fff', fontWeight: '600', fontSize: 13, maxWidth: 100 },
  score: { color: colors.yellow, fontWeight: '700', fontSize: 22 },
});
