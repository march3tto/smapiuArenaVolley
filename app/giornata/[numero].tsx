import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { LiveDot } from '@/components/LiveDot';
import { Pressy } from '@/components/Pressy';
import { TeamBadge } from '@/components/TeamBadge';
import { Txt } from '@/components/Txt';
import { GIRONE, LEAGUE } from '@/constants';
import { fetchGiornata } from '@/lib/api';
import { longDate, timeOf } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import type { LeagueGame } from '@/types';

/** Tutte le gare di una giornata del girone caricate su Supabase (tabella partite, anche tra avversarie) */
export default function Giornata() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ numero: string; girone?: string }>();
  const numero = Number(params.numero);
  const girone = params.girone || GIRONE;
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
    <>
      <Stack.Screen options={{ title: Number.isFinite(numero) ? `${numero}ª giornata` : 'Giornata' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 30, width: '100%', maxWidth: 600, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.accent} colors={[c.accent]} />}
      >
        <Txt size={13} color="muted" center>
          {LEAGUE} · {girone}{phase ? ` · ${phase === 'ritorno' ? 'ritorno' : 'andata'}` : ''}
        </Txt>
        {error ? <Txt size={12.5} color="danger" center>{error}</Txt> : null}
        {games == null ? (
          error ? null : <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} />
        ) : games.length ? (
          games.map((g) => (
            <GameRow key={g.id} game={g} onPress={g.matchId && g.status === 'live' ? () => router.push('/live') : undefined} />
          ))
        ) : (
          <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 30 }}>
            <CalendarDays size={26} color={c.accent} />
            <Txt color="muted" center>Nessuna partita caricata per questa giornata.</Txt>
          </Card>
        )}
      </ScrollView>
    </>
  );
}

function GameRow({ game: g, onPress }: { game: LeagueGame; onPress?: () => void }) {
  const { c } = useTheme();
  const live = g.status === 'live';
  const played = g.status === 'finished';
  const hasScore = (played || live) && g.homeSets != null && g.awaySets != null;
  const ours = g.matchId != null;
  const border = live ? 'rgba(255,77,94,0.45)' : ours ? 'rgba(255,213,3,0.45)' : c.line;

  return (
    <Pressy onPress={onPress} disabled={!onPress} scaleTo={0.98} style={{ borderRadius: 22, backgroundColor: c.card, borderWidth: 1, borderColor: border, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
        {live ? <LiveDot size={7} /> : null}
        <Txt w={600} size={13} color="muted" center>
          {longDate(g.date)} · {timeOf(g.date)}
          {g.status === 'postponed' ? ' · rinviata' : ''}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Team name={g.home} logo={g.homeLogo} won={hasScore && (g.homeSets ?? 0) > (g.awaySets ?? 0) && played} />
        <View style={{ minWidth: 72, alignItems: 'center' }}>
          {hasScore ? (
            <Txt w={800} size={22} tnum style={{ letterSpacing: 0.5 }}>{g.homeSets} – {g.awaySets}</Txt>
          ) : (
            <View accessibilityLabel="contro" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
              <Txt w={800} size={12} color="accent" style={{ letterSpacing: -0.3 }}>VS</Txt>
            </View>
          )}
        </View>
        <Team name={g.away} logo={g.awayLogo} won={hasScore && (g.awaySets ?? 0) > (g.homeSets ?? 0) && played} />
      </View>

      {g.sets && g.sets.length && (played || live) ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 }}>
          {g.sets.map((s, i) => (
            <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.fill }}>
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
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <TeamBadge name={name} logo={logo} size={44} />
      <Txt w={won ? 800 : 700} size={11.5} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{name}</Txt>
    </View>
  );
}
