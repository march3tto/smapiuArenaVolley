import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getGiocatrici, getStagioniCorrenti } from '../../lib/api';
import { ETICHETTE_RUOLO, NOSTRA_SQUADRA, eta } from '../../lib/format';
import { Card, ChipRow, Loading, Message, ScreenTitle } from '../../components/ui';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Giocatrice, RuoloGiocatrice } from '../../lib/types';

type Filtro = 'tutte' | RuoloGiocatrice;

const FILTRI: { value: Filtro; label: string }[] = [
  { value: 'tutte', label: 'Tutte' },
  { value: 'palleggiatrice', label: 'Palleggiatrici' },
  { value: 'schiacciatrice', label: 'Schiacciatrici' },
  { value: 'centrale', label: 'Centrali' },
  { value: 'opposto', label: 'Opposti' },
  { value: 'libero', label: 'Liberi' },
];

export default function RosaScreen() {
  const [players, setPlayers] = useState<Giocatrice[]>([]);
  const [stagione, setStagione] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('tutte');
  const [selected, setSelected] = useState<Giocatrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stagioni = await getStagioniCorrenti();
        const rosa = stagioni.length ? await getGiocatrici(stagioni.map((s) => s.id), 'prima_squadra') : [];
        setPlayers(rosa);
        // etichetta della stagione a cui appartiene la rosa, non di una stagione qualsiasi
        setStagione(stagioni.find((s) => s.id === rosa[0]?.stagione_id)?.etichetta ?? null);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;

  const visibili = filtro === 'tutte' ? players : players.filter((p) => p.ruolo === filtro);

  return (
    <>
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.content}
        data={visibili}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenTitle
              title="ROSA B1 FEMMINILE"
              subtitle={`Smapiù Arena Volley Team${stagione ? ` ${stagione}` : ''}`}
            />
            <ChipRow options={FILTRI} value={filtro} onChange={setFiltro} />
          </View>
        }
        ListEmptyComponent={<Message error={error} empty="Nessuna giocatrice per questo ruolo." />}
        renderItem={({ item }) => <PlayerCard player={item} onPress={() => setSelected(item)} />}
      />
      <PlayerModal player={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function PlayerPhoto({ player, numberSize }: { player: Giocatrice; numberSize: number }) {
  return player.foto_url ? (
    <Image source={{ uri: player.foto_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
  ) : (
    <Text style={[styles.photoNumber, { fontSize: numberSize }]}>{player.numero_maglia ?? '–'}</Text>
  );
}

function PlayerCard({ player, onPress }: { player: Giocatrice; onPress: () => void }) {
  return (
    <Pressable style={styles.cardWrap} onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.photo}>
          <PlayerPhoto player={player} numberSize={48} />
          {player.numero_maglia != null ? <Text style={styles.number}>#{player.numero_maglia}</Text> : null}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>
            {player.nome} {player.cognome}
          </Text>
          {player.ruolo ? <Text style={styles.role}>{ETICHETTE_RUOLO[player.ruolo]}</Text> : null}
        </View>
      </Card>
    </Pressable>
  );
}

function PlayerModal({ player, onClose }: { player: Giocatrice | null; onClose: () => void }) {
  return (
    <Modal visible={player != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {player ? (
          // Pressable interno: il tap sul pannello non chiude la modale
          <Pressable style={styles.modal} onPress={() => {}}>
            <Pressable onPress={onClose} style={styles.close} hitSlop={10} accessibilityLabel="Chiudi">
              <Ionicons name="close" size={16} color={colors.textSoft} />
            </Pressable>

            <View style={styles.modalHead}>
              <View style={styles.modalPhoto}>
                <PlayerPhoto player={player} numberSize={24} />
              </View>
              <View style={{ flexShrink: 1 }}>
                {player.ruolo ? <Text style={styles.modalRole}>{ETICHETTE_RUOLO[player.ruolo]}</Text> : null}
                <Text style={styles.modalName}>
                  {player.nome} {player.cognome}
                </Text>
                <Text style={styles.modalSub}>
                  {[
                    player.numero_maglia != null ? `Maglia #${player.numero_maglia}` : null,
                    player.data_nascita ? `Età: ${eta(player.data_nascita)} anni` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
            </View>

            {player.bio ? <Text style={styles.bio}>{player.bio}</Text> : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Squadra</Text>
              <Text style={styles.infoValue}>{NOSTRA_SQUADRA} Volley</Text>
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 16, paddingBottom: 32 },
  header: { gap: 12, marginBottom: 16 },

  cardWrap: { flex: 1 },
  card: { padding: 0, overflow: 'hidden', borderColor: 'rgba(242,184,0,0.3)' },
  photo: {
    height: 160,
    backgroundColor: colors.darkblue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoNumber: { color: 'rgba(242,184,0,0.35)', fontFamily: fonts.display },
  number: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.yellow,
    color: colors.navy,
    fontFamily: fonts.display,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardBody: { padding: 10, gap: 2 },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 12 },
  role: { color: colors.amber, fontFamily: fonts.bodySemi, fontSize: 10 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(242,184,0,0.5)',
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalPhoto: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.yellow,
    backgroundColor: colors.darkblue,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRole: { color: colors.yellow, fontFamily: fonts.display, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  modalName: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  modalSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  bio: { color: colors.textSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  infoLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  infoValue: { color: colors.yellow, fontFamily: fonts.display, fontSize: 12 },
});
