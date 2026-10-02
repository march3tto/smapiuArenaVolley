import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLivePartita } from '../../lib/useLivePartita';
import { NOSTRA_SQUADRA } from '../../lib/format';
import { Card, LiveDot, Loading, Message } from '../../components/ui';
import Scoreboard from '../../components/Scoreboard';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export default function LiveScreen() {
  const { partita, eventi, punteggio, battuta, loading, error, ricarica } = useLivePartita();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await ricarica();
    setRefreshing(false);
  };

  if (loading) return <Loading />;

  const sets = partita?.set_partita ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.yellow} />}
    >
      {error ? <Message error={error} empty="" /> : null}

      {!partita ? (
        <Card style={styles.empty}>
          <Ionicons name="flash-outline" size={32} color={colors.yellow} />
          <Text style={styles.emptyTitle}>Nessuna partita in diretta</Text>
          <Text style={styles.muted}>Quando inizia un match lo trovi qui, punto per punto.</Text>
        </Card>
      ) : (
        <>
          <Card style={styles.board}>
            <View style={styles.toolbar}>
              <LiveDot size={10} />
              <Text style={styles.toolbarText}>DIRETTA</Text>
              {partita.sede ? (
                <Text style={styles.toolbarPlace} numberOfLines={1}>
                  {partita.sede}
                </Text>
              ) : null}
            </View>

            <Scoreboard partita={partita} punteggio={punteggio} battuta={battuta} grande />

            {sets.length > 0 ? (
              <View>
                <View style={[styles.tr, styles.thead]}>
                  <Text style={[styles.th, styles.teamCol]}>Squadra</Text>
                  {sets.map((s) => (
                    <Text key={s.id} style={[styles.th, !s.completato && styles.current]}>
                      {s.numero_set}° Set
                    </Text>
                  ))}
                </View>
                <View style={styles.tr}>
                  <View style={[styles.teamCol, styles.teamCell]}>
                    <View style={[styles.dot, { backgroundColor: colors.yellow }]} />
                    <Text style={[styles.td, styles.oursName]} numberOfLines={1}>
                      {NOSTRA_SQUADRA}
                    </Text>
                  </View>
                  {sets.map((s) => (
                    <Text key={s.id} style={[styles.td, !s.completato && styles.currentOurs]}>
                      {!s.completato && s.numero_set === punteggio.set ? punteggio.nostri : s.punti_nostri}
                    </Text>
                  ))}
                </View>
                <View style={[styles.tr, styles.trLast]}>
                  <View style={[styles.teamCol, styles.teamCell]}>
                    <View style={[styles.dot, { backgroundColor: colors.faint }]} />
                    <Text style={[styles.td, styles.theirsName]} numberOfLines={1}>
                      {partita.avversario}
                    </Text>
                  </View>
                  {sets.map((s) => (
                    <Text key={s.id} style={[styles.td, !s.completato && styles.currentTheirs]}>
                      {!s.completato && s.numero_set === punteggio.set ? punteggio.avversario : s.punti_avversario}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>

          <Card style={styles.feed}>
            <View style={styles.feedHead}>
              <View style={styles.feedTitleRow}>
                <Ionicons name="chatbubbles" size={15} color={colors.yellow} />
                <Text style={styles.feedTitle}>Cronaca In Diretta</Text>
              </View>
              {partita.sede ? (
                <Text style={styles.feedPlace} numberOfLines={1}>
                  {partita.sede}
                </Text>
              ) : null}
            </View>
            {eventi.length === 0 ? (
              <Message empty="Nessun evento registrato finora." />
            ) : (
              eventi.map((e) => (
                <View key={e.id} style={styles.event}>
                  <Text style={styles.eventTag}>
                    SET {e.numero_set} ({e.punteggio_nostro}-{e.punteggio_avversario})
                  </Text>
                  <Text style={styles.eventText}>{e.descrizione}</Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16 },

  board: { borderWidth: 2, borderColor: 'rgba(242,184,0,0.5)', borderRadius: 24, gap: 16 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderRadius: 14,
    padding: 10,
  },
  toolbarText: { color: colors.amber, fontFamily: fonts.display, fontSize: 12 },
  toolbarPlace: { flex: 1, textAlign: 'right', color: colors.muted, fontFamily: fonts.body, fontSize: 11 },

  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  thead: { borderBottomColor: colors.line, paddingVertical: 6 },
  trLast: { borderBottomWidth: 0 },
  th: { flex: 1, textAlign: 'center', color: colors.muted, fontFamily: fonts.bodySemi, fontSize: 11 },
  td: { flex: 1, textAlign: 'center', color: colors.text, fontFamily: fonts.bodySemi, fontSize: 12 },
  teamCol: { flex: 2.4, textAlign: 'left' },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  oursName: { textAlign: 'left', color: colors.yellow, fontFamily: fonts.display },
  theirsName: { textAlign: 'left', color: colors.textSoft, fontFamily: fonts.display },
  current: { color: colors.yellow, fontFamily: fonts.display },
  currentOurs: { color: colors.yellow, fontFamily: fonts.display },
  currentTheirs: { color: colors.text, fontFamily: fonts.display },

  feed: { gap: 8 },
  feedHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  feedPlace: { flexShrink: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  feedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 14 },
  event: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  eventTag: {
    color: colors.yellow,
    backgroundColor: colors.yellowSoft,
    fontFamily: fonts.display,
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  eventText: { flex: 1, color: colors.textSoft, fontFamily: fonts.body, fontSize: 12 },
});
