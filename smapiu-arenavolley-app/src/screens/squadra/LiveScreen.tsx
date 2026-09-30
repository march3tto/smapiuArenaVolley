import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import type { SquadraStackParamList } from '../../navigation/types';
import type { Match, LiveEvent } from '../../types/database';

type LiveRoute = RouteProp<SquadraStackParamList, 'Live'>;

export default function LiveScreen() {
  const { params } = useRoute<LiveRoute>();
  const { matchId } = params;

  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const [{ data: matchData }, { data: eventData }] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
        supabase
          .from('live_events')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);
      if (!active) return;
      setMatch(matchData as Match | null);
      setEvents((eventData as LiveEvent[]) ?? []);
      setLoading(false);
    }
    loadInitial();

    // Ricorda: la tabella live_events deve essere aggiunta alla
    // pubblicazione "supabase_realtime" (Database > Publications),
    // altrimenti questo canale non riceve nulla.
    const channel = supabase
      .channel(`live_events_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new as LiveEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.scoreboard}>
        <Text style={styles.teamName}>SmapiuArenaVolley</Text>
        <Text style={styles.score}>
          {match?.our_sets_won ?? 0}–{match?.opponent_sets_won ?? 0}
        </Text>
        <Text style={styles.teamName}>{match?.opponent_name ?? '—'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Cronaca punto per punto</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
        renderItem={({ item }) => (
          <View style={styles.eventRow}>
            <Text style={styles.eventScore}>
              {item.our_score}–{item.opponent_score}
            </Text>
            <Text style={styles.eventDesc}>{item.description}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.muted}>Nessun evento registrato finora.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: 13 },
  scoreboard: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: { color: '#fff', fontWeight: '700', fontSize: 13, maxWidth: 100 },
  score: { color: colors.yellow, fontWeight: '700', fontSize: 30 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  eventRow: { flexDirection: 'row', gap: 10 },
  eventScore: { fontWeight: '700', color: colors.navy, width: 46 },
  eventDesc: { color: colors.ink, fontSize: 13, flexShrink: 1 },
});
