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
          {player.capitana ? <Text style={styles.captain}>CAPITANA</Text> : null}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>
            {player.nome} {player.cognome}
          </Text>
          {player.ruolo ? <Text style={styles.role}>{ETICHETTE_RUOLO[player.ruolo]}</Text> : null}
          {player.altezza_cm != null || player.punti != null ? (
            <View style={styles.cardFoot}>
              <Text style={styles.footText}>{player.altezza_cm != null ? `${player.altezza_cm} cm` : ''}</Text>
              {player.punti != null ? (
                <Text style={styles.footText}>
                  Punti: <Text style={styles.footValue}>{player.punti}</Text>
                </Text>
              ) : null}
            </View>
          ) : null}
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

            {player.punti != null || player.ace != null || player.muri != null ? (
              <View style={styles.stats}>
                <Stat label="Punti Totali" value={player.punti} color={colors.yellow} />
                <Stat label="Ace Battuta" value={player.ace} color={colors.win} />
                <Stat label="Muri Punto" value={player.muri} color={colors.amber} />
              </View>
            ) : null}

            {player.bio ? <Text style={styles.bio}>{player.bio}</Text> : null}

            <View>
              {player.altezza_cm != null ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Altezza</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{player.altezza_cm} cm</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Squadra</Text>
                <Text style={styles.infoValue}>{NOSTRA_SQUADRA} Volley</Text>
              </View>
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value ?? '–'}</Text>
    </View>
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
  captain: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.amber,
    color: colors.navy,
    fontFamily: fonts.display,
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardBody: { padding: 10, gap: 2 },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  footText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  footValue: { color: colors.text, fontFamily: fonts.display },
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
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.lineSoft,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: fonts.display,
    fontSize: 9,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statValue: { fontFamily: fonts.display, fontSize: 18, fontVariant: ['tabular-nums'] },
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
