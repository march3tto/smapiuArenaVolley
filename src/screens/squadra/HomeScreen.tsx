import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { getNotizie, getProssimePartite } from '../../lib/api';
import { useLivePartita } from '../../lib/useLivePartita';
import { dataPartita, NOSTRA_SIGLA, NOSTRA_SQUADRA, sigla, squadre } from '../../lib/format';
import { Card, LiveDot, Loading, Message, PanelLabel, TeamBadge } from '../../components/ui';
import Scoreboard from '../../components/Scoreboard';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { RootTabParamList } from '../../navigation/types';
import type { Notizia, Partita } from '../../lib/types';

type Nav = BottomTabNavigationProp<RootTabParamList, 'HomeTab'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const live = useLivePartita();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextMatch, setNextMatch] = useState<Partita | null>(null);
  const [news, setNews] = useState<Notizia[]>([]);

  const load = useCallback(async () => {
    try {
      const [prossime, notizie] = await Promise.all([getProssimePartite(1), getNotizie(10)]);
      setNextMatch(prossime[0] ?? null);
      setNews(notizie.filter((n) => n.pubblicata).slice(0, 2));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), live.ricarica()]);
    setRefreshing(false);
  }, [load, live.ricarica]);

  if (loading || live.loading) return <Loading />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.yellow} />}
    >
      {error || live.error ? <Message error={error ?? live.error} empty="" /> : null}

      <Hero />

      {live.partita ? (
        <Card style={styles.liveCard}>
          <View style={styles.liveTop}>
            <View style={styles.livePill}>
              <LiveDot />
              <Text style={styles.livePillText}>
                LIVE MATCH{live.punteggio.set ? ` - SET ${live.punteggio.set}` : ''}
              </Text>
            </View>
            {live.partita.sede ? (
              <Text style={styles.place} numberOfLines={1}>
                <Ionicons name="location" color={colors.yellow} /> {live.partita.sede}
              </Text>
            ) : null}
          </View>

          <Scoreboard partita={live.partita} punteggio={live.punteggio} />

          <Pressable onPress={() => navigation.navigate('LiveTab')} style={styles.ctaWrap}>
            <LinearGradient
              colors={[colors.blue, colors.darkblue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <MaterialCommunityIcons name="volleyball" size={14} color={colors.yellow} />
              <Text style={styles.ctaText}>SEGUI IL CENTRO MATCH LIVE E CRONACA</Text>
            </LinearGradient>
          </Pressable>
        </Card>
      ) : null}

      {nextMatch ? <NextMatch partita={nextMatch} /> : null}

      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="newspaper" size={16} color={colors.yellow} />
          <Text style={styles.sectionTitle}>Ultime Notizie Arena</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('NewsTab')} hitSlop={8}>
          <Text style={styles.seeAll}>
            Vedi tutte <Ionicons name="chevron-forward" size={11} />
          </Text>
        </Pressable>
      </View>
      {news.length === 0 ? (
        <Message empty="Nessuna news pubblicata." />
      ) : (
        news.map((n) => (
          <Pressable key={n.id} onPress={() => navigation.navigate('NewsTab')}>
            <Card style={styles.newsCard}>
              <View style={styles.newsImage}>
                {n.url_immagine_copertina ? (
                  <Image source={{ uri: n.url_immagine_copertina }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Ionicons name="image-outline" size={28} color={colors.faint} />
                )}
              </View>
              <View style={styles.newsBody}>
                <Text style={styles.newsTitle} numberOfLines={2}>
                  {n.titolo}
                </Text>
                {n.corpo ? (
                  <Text style={styles.newsExcerpt} numberOfLines={2}>
                    {n.corpo}
                  </Text>
                ) : null}
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

// banner "WE ARE ARENA VOLLEY"
function Hero() {
  return (
    <LinearGradient
      colors={[colors.darkblue, colors.blue, colors.navy]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroGlow} />
      <Text style={styles.heroKicker}>CAMPIONATO NAZIONALE B1 FEMMINILE</Text>
      <Text style={styles.heroTitle}>WE ARE</Text>
      <Text style={[styles.heroTitle, styles.heroTitleAccent]}>ARENA VOLLEY</Text>
      <View style={styles.heroFooter}>
        <View style={styles.heroRule} />
        <Text style={styles.heroTeam}>SMAPIÙ ARENA VOLLEY TEAM</Text>
        <View style={styles.heroRule} />
      </View>
    </LinearGradient>
  );
}

function NextMatch({ partita }: { partita: Partita }) {
  const { casa, ospite, inCasa } = squadre(partita);
  const siglaCasa = inCasa ? NOSTRA_SIGLA : sigla(casa);
  const siglaOspite = inCasa ? sigla(ospite) : NOSTRA_SIGLA;

  return (
    <Card style={styles.nextCard}>
      <View style={styles.nextHead}>
        <PanelLabel icon="calendar-outline">Prossima Partita B1</PanelLabel>
        <Text style={styles.nextDate}>{dataPartita(partita.data_partita)}</Text>
      </View>
      <View style={styles.nextTeams}>
        <View style={styles.nextTeam}>
          <TeamBadge label={siglaCasa} ours={casa === NOSTRA_SQUADRA} size={34} />
          <Text style={styles.nextTeamName} numberOfLines={2}>
            {casa}
          </Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={[styles.nextTeam, styles.nextTeamRight]}>
          <Text style={[styles.nextTeamName, { textAlign: 'right' }]} numberOfLines={2}>
            {ospite}
          </Text>
          <TeamBadge label={siglaOspite} ours={ospite === NOSTRA_SQUADRA} size={34} />
        </View>
      </View>
      {partita.sede ? (
        <View style={styles.nextFoot}>
          <Text style={styles.place}>
            <Ionicons name="location" color={colors.yellow} /> {partita.sede}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: 16, gap: 16, paddingBottom: 32 },

  hero: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.yellow,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -50,
    bottom: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(242,184,0,0.1)',
  },
  heroKicker: { color: colors.yellow, fontFamily: fonts.display, fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  heroTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 38,
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  heroTitleAccent: { color: colors.yellow },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  heroRule: { height: 2, width: 36, backgroundColor: 'rgba(242,184,0,0.5)' },
  heroTeam: { color: colors.textSoft, fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1 },

  liveCard: { borderColor: 'rgba(242,184,0,0.4)', borderRadius: 24, gap: 12 },
  liveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  livePillText: { color: colors.amber, fontFamily: fonts.display, fontSize: 11 },
  place: { color: colors.textSoft, fontFamily: fonts.bodySemi, fontSize: 11, flexShrink: 1 },
  ctaWrap: { borderRadius: 12, overflow: 'hidden' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(242,184,0,0.5)',
    borderRadius: 12,
  },
  ctaText: { color: colors.text, fontFamily: fonts.display, fontSize: 11 },

  nextCard: { gap: 12 },
  nextHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 8,
  },
  nextDate: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 10,
    backgroundColor: colors.chip,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    flexShrink: 1,
  },
  nextTeams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextTeamRight: { justifyContent: 'flex-end' },
  nextTeamName: { color: colors.text, fontFamily: fonts.display, fontSize: 12, flexShrink: 1 },
  vs: { color: colors.yellow, fontFamily: fonts.display, fontSize: 12 },
  nextFoot: { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.lineSoft },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16 },
  seeAll: { color: colors.amber, fontFamily: fonts.display, fontSize: 12 },
  newsCard: { padding: 0, overflow: 'hidden' },
  newsImage: {
    height: 130,
    backgroundColor: colors.opponent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsBody: { padding: 12, gap: 4 },
  newsTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 13 },
  newsExcerpt: { color: colors.textSoft, fontFamily: fonts.body, fontSize: 11 },
});
