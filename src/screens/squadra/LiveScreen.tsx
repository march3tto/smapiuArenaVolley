import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { SquadraStackParamList } from '../../navigation/types';
import type { EventoLive, Partita } from '../../lib/types';

type LiveRoute = RouteProp<SquadraStackParamList, 'Live'>;

export default function LiveScreen() {
  const { params } = useRoute<LiveRoute>();
  const { matchId } = params;

  const [match, setMatch] = useState<Partita | null>(null);
  const [events, setEvents] = useState<EventoLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // nomi squadra proporzionati alla larghezza dello schermo (15 su un telefono da 375pt)
  const { width } = useWindowDimensions();
  const teamFontSize = Math.min(22, Math.max(13, Math.round(width * 0.04)));
  const teamNameStyle = [styles.teamName, { fontSize: teamFontSize, lineHeight: teamFontSize * 1.2 }];

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const [matchRes, eventRes] = await Promise.all([
        supabase.from('partite').select('*').eq('id', matchId).maybeSingle(),
        supabase
          .from('eventi_live')
          .select('*')
          .eq('partita_id', matchId)
          .order('creato_il', { ascending: false })
          .limit(30),
      ]);
      if (!active) return;
      const err = matchRes.error ?? eventRes.error;
      setError(err ? err.message : null);
      setMatch(matchRes.data as Partita | null);
      setEvents((eventRes.data as EventoLive[]) ?? []);
      setLoading(false);
    }
    loadInitial();

    // Le tabelle eventi_live e partite devono essere nella pubblicazione
    // "supabase_realtime" (Database > Publications), altrimenti il canale non riceve nulla.
    const channel = supabase
      .channel(`eventi_live_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eventi_live',
          filter: `partita_id=eq.${matchId}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new as EventoLive, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'partite',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatch(payload.new as Partita);
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
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const last = events[0];

  return (
    <View style={styles.screen}>
      {error ? <Text style={styles.error}>Errore nel caricamento: {error}</Text> : null}

      <View style={styles.scoreboard}>
        <Text style={teamNameStyle} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.75}>
          SmapiuArenaVolley
        </Text>
        <View style={styles.scoreCol}>
          <Text style={styles.score}>
            {match?.nostri_set_vinti ?? 0}–{match?.set_vinti_avversario ?? 0}
          </Text>
          {last && match?.stato === 'live' ? (
            <Text style={styles.setScore}>
              {last.numero_set}° set · {last.punteggio_nostro}–{last.punteggio_avversario}
            </Text>
          ) : null}
        </View>
        <Text style={teamNameStyle} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.75}>
          {match?.avversario ?? '—'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Cronaca punto per punto</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
        renderItem={({ item }) => (
          <View style={styles.eventRow}>
            <Text style={styles.eventScore}>
              {item.punteggio_nostro}–{item.punteggio_avversario}
            </Text>
            <Text style={styles.eventDesc}>{item.descrizione}</Text>
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
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body },
  error: { color: colors.loss, fontSize: 13, fontFamily: fonts.body },
  scoreboard: {
    backgroundColor: colors.brand,
    borderRadius: 6,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    flex: 1,
    color: colors.onBrand,
    fontFamily: fonts.bodySemi,
    textAlign: 'center',
  },
  scoreCol: { alignItems: 'center', paddingHorizontal: 12 },
  score: { color: colors.accent, fontFamily: fonts.display, fontSize: 30 },
  setScore: { color: colors.onBrandMuted, fontFamily: fonts.displaySemi, fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontFamily: fonts.display, color: colors.ink },
  eventRow: { flexDirection: 'row', gap: 10 },
  eventScore: { fontFamily: fonts.display, color: colors.brand, width: 46 },
  eventDesc: { color: colors.ink, fontSize: 13, flexShrink: 1, fontFamily: fonts.body },
});
