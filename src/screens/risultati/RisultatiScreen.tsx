import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getClassifica, getPartite, getStagioniCorrenti } from '../../lib/api';
import { dataPartita, NOSTRA_SQUADRA, parzialiSet, risultato, squadre } from '../../lib/format';
import { Card, ChipRow, Loading, Message, PanelLabel, ScreenTitle } from '../../components/ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Partita, RigaClassifica, StatoPartita } from '../../lib/types';

type Filtro = 'tutte' | 'giocate' | 'prossime';

const FILTRI: { value: Filtro; label: string }[] = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'giocate', label: 'Giocate' },
  { value: 'prossime', label: 'Prossime' },
];

const STATI_PER_FILTRO: Record<Filtro, StatoPartita[] | null> = {
  tutte: null,
  giocate: ['conclusa'],
  prossime: ['programmata', 'rinviata'],
};

export default function RisultatiScreen() {
  const [partite, setPartite] = useState<Partita[]>([]);
  const [classifica, setClassifica] = useState<RigaClassifica[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('tutte');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const ids = (await getStagioniCorrenti()).map((s) => s.id);
      if (ids.length === 0) {
        setPartite([]);
        setClassifica([]);
      } else {
        const [p, c] = await Promise.all([getPartite(ids), getClassifica(ids)]);
        setPartite(p);
        setClassifica(c);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <Loading />;

  const stati = STATI_PER_FILTRO[filtro];
  const visibili = stati ? partite.filter((p) => stati.includes(p.stato)) : partite;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.yellow} />}
    >
      <ScreenTitle title="Risultati & Classifica" icon="trophy" />
      <ChipRow options={FILTRI} value={filtro} onChange={setFiltro} />

      {visibili.length === 0 ? (
        <Message error={error} empty="Nessuna partita in calendario." />
      ) : (
        visibili.map((p) => <MatchCard key={p.id} partita={p} />)
      )}

      <Card style={styles.table}>
        <PanelLabel icon="list">Classifica{classifica[0]?.girone ? ` ${classifica[0].girone}` : ''}</PanelLabel>
        {classifica.length === 0 ? (
          <Message empty="Classifica non ancora disponibile." />
        ) : (
          <View>
            <View style={[styles.tr, styles.thead]}>
              <Text style={[styles.th, styles.posCol]}>Pos</Text>
              <Text style={[styles.th, styles.nameCol]}>Squadra</Text>
              <Text style={[styles.th, styles.numCol]}>PT</Text>
              <Text style={[styles.th, styles.numCol]}>G</Text>
              <Text style={[styles.th, styles.numCol]}>V</Text>
              <Text style={[styles.th, styles.numCol]}>P</Text>
            </View>
            {classifica.map((r) => (
              <View key={r.id} style={[styles.tr, r.nostra_squadra && styles.trOurs]}>
                <Text style={[styles.td, styles.posCol, r.nostra_squadra ? styles.yellow : styles.pos]}>
                  {r.posizione}
                </Text>
                <View style={[styles.nameCol, styles.nameCell]}>
                  {r.nostra_squadra ? <View style={styles.dot} /> : null}
                  <Text style={[styles.td, r.nostra_squadra && styles.oursName]} numberOfLines={1}>
                    {r.nome_squadra}
                  </Text>
                </View>
                <Text style={[styles.td, styles.numCol, r.nostra_squadra && styles.yellow]}>{r.punti}</Text>
                <Text style={[styles.td, styles.numCol]}>{r.giocate}</Text>
                <Text style={[styles.td, styles.numCol]}>{r.vinte}</Text>
                <Text style={[styles.td, styles.numCol]}>{r.perse}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const BADGE_STATO: Record<StatoPartita, { label: string; bg: string; fg: string }> = {
  live: { label: 'IN CORSO', bg: colors.yellow, fg: colors.navy },
  conclusa: { label: 'FINALE', bg: '#334155', fg: colors.textSoft },
  programmata: { label: 'PROSSIMA', bg: colors.blue, fg: colors.text },
  rinviata: { label: 'RINVIATA', bg: '#7F1D1D', fg: colors.text },
};

function MatchCard({ partita }: { partita: Partita }) {
  const { casa, ospite } = squadre(partita);
  const badge = BADGE_STATO[partita.stato];
  const parziali = parzialiSet(partita);

  return (
    <Card style={[styles.match, partita.stato === 'live' && styles.matchLive]}>
      <View style={styles.matchHead}>
        <Text style={styles.matchDate}>
          <Ionicons name="time-outline" /> {dataPartita(partita.data_partita)}
        </Text>
        <Text style={[styles.status, { backgroundColor: badge.bg, color: badge.fg }]}>{badge.label}</Text>
      </View>

      <View style={styles.matchRow}>
        <Text style={[styles.team, casa === NOSTRA_SQUADRA && styles.yellow]} numberOfLines={2}>
          {casa}
        </Text>
        <Text style={styles.score}>{risultato(partita)}</Text>
        <Text style={[styles.team, styles.teamRight, ospite === NOSTRA_SQUADRA && styles.yellow]} numberOfLines={2}>
          {ospite}
        </Text>
      </View>

      {partita.sede || parziali ? (
        <View style={styles.matchFoot}>
          <Text style={styles.footText} numberOfLines={1}>
            {partita.sede ? (
              <>
                <Ionicons name="location" /> {partita.sede}
              </>
            ) : null}
          </Text>
          {parziali ? <Text style={styles.sets}>{parziali}</Text> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  yellow: { color: colors.yellow },

  match: { padding: 14, gap: 8, borderColor: colors.lineSoft },
  matchLive: { borderColor: colors.yellow },
  matchHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  matchDate: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, flexShrink: 1 },
  status: {
    fontFamily: fonts.display,
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  team: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 12 },
  teamRight: { textAlign: 'right' },
  score: {
    color: colors.yellow,
    fontFamily: fonts.display,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  matchFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  footText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, flexShrink: 1 },
  sets: { color: colors.textSoft, fontFamily: fonts.bodyMedium, fontSize: 10, fontVariant: ['tabular-nums'] },

  table: { gap: 10 },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  thead: { borderBottomColor: colors.line, paddingVertical: 6 },
  trOurs: { backgroundColor: colors.yellowSoft, borderRadius: 6 },
  th: { color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 11 },
  td: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 12 },
  pos: { color: colors.muted },
  posCol: { width: 34 },
  nameCol: { flex: 1 },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numCol: { width: 30, textAlign: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.yellow },
  oursName: { fontFamily: fonts.display },
});
