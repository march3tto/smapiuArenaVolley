import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

import { getGiocatrici, getStagioneCorrente } from '../../lib/api';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Giocatrice } from '../../lib/types';

export default function RosaScreen() {
  const [players, setPlayers] = useState<Giocatrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stagione = await getStagioneCorrente();
        setPlayers(stagione ? await getGiocatrici(stagione.id, 'prima_squadra') : []);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
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
      contentContainerStyle={{ padding: 20 }}
      data={players}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        <Text style={error ? styles.error : styles.muted}>
          {error ? `Errore nel caricamento: ${error}` : 'Nessuna giocatrice inserita.'}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.numero_maglia ?? '–'}</Text>
          </View>
          <Text style={styles.name}>
            {item.nome} {item.cognome}
          </Text>
          {item.ruolo ? <Text style={styles.muted}>{item.ruolo}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  muted: { color: colors.muted, fontSize: 11, marginTop: 2, fontFamily: fonts.body },
  error: { color: colors.loss, fontSize: 13, fontFamily: fonts.body },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: colors.accent, fontFamily: fonts.display, fontSize: 16 },
  name: { fontSize: 13, fontFamily: fonts.bodySemi, color: colors.ink },
});
