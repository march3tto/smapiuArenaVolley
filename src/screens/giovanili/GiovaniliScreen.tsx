import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

import { getCategorieGiovanili, getStaff } from '../../lib/api';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { CategoriaGiovanile, Staff } from '../../lib/types';

type CategoriaConAllenatori = CategoriaGiovanile & { allenatori: Staff[] };

export default function GiovaniliScreen() {
  const [categories, setCategories] = useState<CategoriaConAllenatori[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // l'allenatore non e' piu' in categorie_giovanili: si prende dalla tabella staff
        const [cats, staff] = await Promise.all([getCategorieGiovanili(), getStaff()]);
        setCategories(
          cats.map((c) => ({
            ...c,
            allenatori: staff.filter((s) => s.categoria_giovanile_id === c.id),
          }))
        );
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
        <ActivityIndicator color={colors.yellow} />
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
      ListEmptyComponent={
        <Text style={error ? styles.error : styles.muted}>
          {error ? `Errore nel caricamento: ${error}` : 'Nessuna categoria inserita.'}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.nome}</Text>
          {item.allenatori.length > 0 ? (
            <Text style={styles.muted}>
              Allenatore: {item.allenatori.map((a) => `${a.nome} ${a.cognome}`).join(', ')}
            </Text>
          ) : null}
          {item.descrizione ? <Text style={styles.muted}>{item.descrizione}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  title: { fontSize: 19, fontFamily: fonts.display, color: colors.text, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 13, marginTop: 2, fontFamily: fonts.body },
  error: { color: colors.loss, fontSize: 13, fontFamily: fonts.body },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 14,
  },
  name: { fontSize: 14, fontFamily: fonts.bodySemi, color: colors.text },
});
