import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { HiddenScore } from '@/components/HiddenScore';
import { LiveDot } from '@/components/LiveDot';
import { Pressy } from '@/components/Pressy';
import { TeamBadge } from '@/components/TeamBadge';
import { Txt } from '@/components/Txt';
import { GIRONE, LEAGUE } from '@/constants';
import { fetchGiornata, fetchGiornateGirone } from '@/lib/api';
import { longDate, timeOf } from '@/lib/format';
import { useScoreHidden } from '@/store/PlayerProvider';
import { useTheme } from '@/theme/ThemeProvider';
import type { LeagueGame } from '@/types';
import { space } from '@/theme/colors';

/**
 * Tutte le gare di una giornata del girone caricate su Supabase (tabella partite, anche tra avversarie).
 * Scorrendo a destra e a sinistra (o con le frecce) si passa alle altre giornate senza uscire dalla schermata.
 */
export default function Giornata() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ numero: string; girone?: string }>();
  const start = Number(params.numero);
  const girone = params.girone || GIRONE;
  // giornate del girone: finché non arrivano si mostra solo quella aperta
  const [days, setDays] = useState<number[] | null>(null);
  const [current, setCurrent] = useState(start);
  const list = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (!Number.isFinite(start)) return;
    let active = true;
    fetchGiornateGirone(girone).then(
      (all) => active && setDays(all.includes(start) ? all : [...all, start].sort((a, b) => a - b)),
      () => active && setDays([start]),
    );
    return () => {
      active = false;
    };
  }, [start, girone]);

  const index = days ? Math.max(0, days.indexOf(current)) : 0;
  // initialScrollIndex sulle liste orizzontali a pagine non è affidabile nell'app nativa (nuova architettura): la lista
  // può partire dalla 1ª giornata e il primo evento di scroll (offset 0) cambierebbe la giornata scelta. Si posiziona
  // a mano appena il contenuto è misurato e fino ad allora gli eventi di scroll non cambiano la giornata corrente.
  const positioned = useRef(false);
  const position = () => {
    if (positioned.current || !days) return;
    const i = Math.max(0, days.indexOf(start));
    list.current?.scrollToOffset({ offset: i * width, animated: false });
    positioned.current = true;
  };
  const goTo = (i: number) => {
    if (!days || i < 0 || i >= days.length) return;
    list.current?.scrollToIndex({ index: i, animated: true });
    setCurrent(days[i]);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!positioned.current) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (days && days[i] != null && days[i] !== current) setCurrent(days[i]);
  };

  // cambiando la larghezza (rotazione, finestra del browser) la pagina resta sulla giornata scelta
  useEffect(() => {
    if (days) list.current?.scrollToOffset({ offset: index * width, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const arrow = (dir: -1 | 1) => {
    const enabled = !!days && index + dir >= 0 && index + dir < days.length;
    const Icon = dir < 0 ? ChevronLeft : ChevronRight;
    return (
      <Pressy onPress={() => goTo(index + dir)} disabled={!enabled} scaleTo={0.88} accessibilityRole="button"
        accessibilityLabel={dir < 0 ? 'Giornata precedente' : 'Giornata successiva'} accessibilityState={{ disabled: !enabled }}
        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill, opacity: enabled ? 1 : 0.35 }}>
        <Icon size={18} color={c.text} />
      </Pressy>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: Number.isFinite(current) ? `${current}ª giornata` : 'Giornata' }} />
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
          {arrow(-1)}
          <Txt size={13} color="muted" center style={{ flex: 1 }} numberOfLines={1}>{LEAGUE} · {girone}</Txt>
          {arrow(1)}
        </View>
        {days && days.length > 1 ? (
          <FlatList
            ref={list}
            horizontal
            pagingEnabled
            data={days}
            keyExtractor={String}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onContentSizeChange={position}
            onScroll={onScroll}
            scrollEventThrottle={32}
            showsHorizontalScrollIndicator={false}
            windowSize={3}
            initialNumToRender={1}
            renderItem={({ item }) => (
              <View style={{ width }}>
                <GiornataPage numero={item} girone={girone} />
              </View>
            )}
          />
        ) : (
          <GiornataPage numero={start} girone={girone} />
        )}
      </View>
    </>
  );
}

/** Gare di una giornata, con aggiornamento tirando verso il basso */
function GiornataPage({ numero, girone }: { numero: number; girone: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [games, setGames] = useState<LeagueGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGames = useCallback(
    () =>
      fetchGiornata(numero, girone).then(
        (list) => {
          setGames(list);
          setError(null);
        },
        (e: unknown) => setError(e instanceof Error ? e.message : 'Errore di caricamento'),
      ),
    [numero, girone],
  );

  useEffect(() => {
    if (Number.isFinite(numero)) fetchGames();
  }, [numero, fetchGames]);

  const load = () => {
    setLoading(true);
    fetchGames().finally(() => setLoading(false));
  };

  const phase = games?.[0]?.phase;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: insets.bottom + space.xl, width: '100%', maxWidth: 600, alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} colors={[c.accent]} />}
    >
      <Txt w={700} size={15} center>
        {numero}ª giornata{phase ? ` · ${phase === 'ritorno' ? 'ritorno' : 'andata'}` : ''}
      </Txt>
      {error ? <Txt size={12.5} color="danger" center>{error}</Txt> : null}
      {games == null ? (
        error ? null : <ActivityIndicator color={c.accent} style={{ marginTop: space.xl }} />
      ) : games.length ? (
        games.map((g) => (
          <GameRow key={g.id} game={g} onPress={g.matchId && g.status === 'live' ? () => router.push('/live') : undefined} />
        ))
      ) : (
        <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
          <CalendarDays size={26} color={c.accent} />
          <Txt color="muted" center>Nessuna partita caricata per questa giornata.</Txt>
        </Card>
      )}
    </ScrollView>
  );
}

function GameRow({ game: g, onPress }: { game: LeagueGame; onPress?: () => void }) {
  const { c } = useTheme();
  const ours = g.matchId != null;
  // diretta (bordo rosso e pallino) solo per le nostre partite: le altre in corso mostrano solo il parziale
  const live = g.status === 'live' && ours;
  const playing = g.status === 'live';
  // video della diretta aperto: la nostra partita in corso resta coperta (risultato e parziali)
  const hidden = useScoreHidden() && live;
  const played = g.status === 'finished';
  const hasScore = (played || playing) && g.homeSets != null && g.awaySets != null;
  const border = live ? 'rgba(255,77,94,0.45)' : ours ? 'rgba(255,213,3,0.45)' : c.line;

  return (
    <Pressy onPress={onPress} disabled={!onPress} scaleTo={0.98} style={{ borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: border, padding: space.md, gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm }}>
        {live ? <LiveDot size={7} /> : null}
        <Txt w={600} size={13} color="muted" center>
          {longDate(g.date)} · {timeOf(g.date)}
          {g.status === 'postponed' ? ' · rinviata' : playing && !ours ? ' · in corso' : ''}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Team name={g.home} logo={g.homeLogo} won={hasScore && (g.homeSets ?? 0) > (g.awaySets ?? 0) && played} />
        <View style={{ minWidth: 72, alignItems: 'center' }}>
          {hidden ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <HiddenScore width={22} height={26} radius={6} />
              <Txt w={800} size={22}>–</Txt>
              <HiddenScore width={22} height={26} radius={6} />
            </View>
          ) : hasScore ? (
            <Txt w={800} size={22} tnum style={{ letterSpacing: 0.5 }}>{g.homeSets} – {g.awaySets}</Txt>
          ) : (
            <View accessibilityLabel="contro" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
              <Txt w={800} size={12} color="accent" style={{ letterSpacing: -0.3 }}>VS</Txt>
            </View>
          )}
        </View>
        <Team name={g.away} logo={g.awayLogo} won={hasScore && (g.awaySets ?? 0) > (g.homeSets ?? 0) && played} />
      </View>

      {g.sets && g.sets.length && (played || playing) && !hidden ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs }}>
          {g.sets.map((s, i) => (
            <View key={i} style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 8, backgroundColor: c.fill }}>
              <Txt w={600} size={12} tnum>{s.home}–{s.away}</Txt>
            </View>
          ))}
        </View>
      ) : null}
    </Pressy>
  );
}

function Team({ name, logo, won }: { name: string; logo?: LeagueGame['homeLogo']; won: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.sm }}>
      <TeamBadge name={name} logo={logo} size={44} />
      <Txt w={won ? 800 : 700} size={11.5} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{name}</Txt>
    </View>
  );
}
