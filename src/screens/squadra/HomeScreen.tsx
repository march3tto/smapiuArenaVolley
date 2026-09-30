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
import { getNotizie } from '../../lib/api';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { SquadraStackParamList } from '../../navigation/types';
import type { Notizia, Partita } from '../../lib/types';

type Nav = NativeStackNavigationProp<SquadraStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuredMatch, setFeaturedMatch] = useState<Partita | null>(null);
  const [news, setNews] = useState<Notizia[]>([]);

  const load = useCallback(async () => {
    try {
      // partita live della prima squadra, se c'e'; altrimenti la prossima in calendario
      const { data: live, error: liveErr } = await supabase
        .from('partite')
        .select('*')
        .eq('livello_squadra', 'prima_squadra')
        .eq('stato', 'live')
        .order('data_partita', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (liveErr) throw liveErr;

      let match = live as Partita | null;
      if (!match) {
        const { data: next, error: nextErr } = await supabase
          .from('partite')
          .select('*')
          .eq('livello_squadra', 'prima_squadra')
          .eq('stato', 'programmata')
          .gte('data_partita', new Date().toISOString())
          .order('data_partita', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (nextErr) throw nextErr;
        match = next as Partita | null;
      }
      setFeaturedMatch(match);
      setNews((await getNotizie(10)).filter((n) => n.pubblicata).slice(0, 3));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
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
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {error ? <Text style={styles.error}>Errore nel caricamento: {error}</Text> : null}

      <Text style={styles.sectionTitle}>In evidenza</Text>
      {news.length === 0 ? (
        <Text style={styles.muted}>Nessuna news pubblicata.</Text>
      ) : (
        news.map((item) => (
          <View key={item.id} style={styles.newsCard}>
            <Text style={styles.newsBadge}>NEWS</Text>
            <Text style={styles.newsTitle}>{item.titolo}</Text>
          </View>
        ))
      )}

      {featuredMatch ? (
        <Pressable
          onPress={() =>
            featuredMatch.stato === 'live' &&
            navigation.navigate('Live', { matchId: featuredMatch.id })
          }
          style={[
            styles.matchCard,
            featuredMatch.stato !== 'live' && { opacity: 0.95 },
          ]}
        >
          {featuredMatch.stato === 'live' ? (
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
              {featuredMatch.stato === 'live'
                ? `${featuredMatch.nostri_set_vinti ?? 0}–${featuredMatch.set_vinti_avversario ?? 0}`
                : new Date(featuredMatch.data_partita).toLocaleDateString('it-IT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
            </Text>
            <Text style={styles.teamName}>{featuredMatch.avversario}</Text>
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
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body },
  error: { color: colors.loss, fontSize: 13, fontFamily: fonts.body },
  sectionTitle: { fontSize: 17, fontFamily: fonts.display, color: colors.ink },
  newsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  newsBadge: { fontSize: 10, fontFamily: fonts.display, color: colors.brand, letterSpacing: 0.8, textTransform: 'uppercase' },
  newsTitle: { fontSize: 13, fontFamily: fonts.bodySemi, color: colors.ink, marginTop: 4 },
  matchCard: {
    backgroundColor: colors.brand,
    borderRadius: 6,
    padding: 18,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  liveLabel: { color: colors.liveSoft, fontFamily: fonts.display, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  nextLabel: { color: colors.onBrandMuted, fontFamily: fonts.display, fontSize: 11, marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { color: colors.onBrand, fontFamily: fonts.bodySemi, fontSize: 13, maxWidth: 100 },
  score: { color: colors.accent, fontFamily: fonts.display, fontSize: 22 },
});
