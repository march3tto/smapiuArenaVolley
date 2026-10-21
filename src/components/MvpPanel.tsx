import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Info, Trophy } from 'lucide-react-native';
import { Button } from './Button';
import { NumberTag } from './LineupPanel';
import { Pressy } from './Pressy';
import { matchPlayerStats, type PlayerStats } from './StatsPanel';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { fetchMvpVotes, unvoteMvp, voteMvp } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImgSrc, LineupPlayer, LiveEvent, Match } from '@/types';

/** I voti degli altri utenti per la stessa partita si ricaricano mentre il pannello è aperto */
const REFRESH_MS = 10000;

export interface MvpTeam {
  side: 'us' | 'opp';
  name: string;
  logo?: ImgSrc | null;
  players: LineupPlayer[];
}

/**
 * Voto MVP tra le giocatrici di entrambe le squadre, ognuna sotto la sua squadra (casa a sinistra), con i punti della partita.
 * Un voto per utente registrato, modificabile; nella partita demo resta solo sul dispositivo.
 * awayMatch: in trasferta il pannello si vede (giocatrici e punti) ma il voto è disattivato.
 */
export function MvpPanel({ match, awayMatch, teams, events, finished }: { match: Match; awayMatch?: boolean; teams: MvpTeam[]; events: LiveEvent[]; finished: boolean }) {
  const { c } = useTheme();
  const router = useRouter();
  const { user } = useApp();
  const local = !!match.demoLive || !hasSupabase;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.id ?? null;
  // si vota una giocatrice collegata alla sua scheda (giocatrici); nella demo, che resta in locale, anche le avversarie inserite a mano
  const voteId = useCallback((p: LineupPlayer) => p.playerId ?? (local ? p.id : null), [local]);
  // statistiche della sola partita, dalle azioni registrate nella cronaca: per squadra, prima chi ha fatto più punti, poi titolari e libero
  const columns = useMemo(() => teams.map((t) => {
    const stats = matchPlayerStats(events, t.players, t.side);
    const statOf = (p: LineupPlayer) => stats.find((s) => s.key === p.playerId || s.key === p.id);
    const list = t.players.filter((p) => !!voteId(p))
      .map((p) => ({ p, st: statOf(p) }))
      .sort((a, b) => (b.st?.points ?? 0) - (a.st?.points ?? 0)
        || Number(b.p.zone != null || b.p.isLibero) - Number(a.p.zone != null || a.p.isLibero) || (a.p.number ?? 99) - (b.p.number ?? 99));
    return { ...t, list };
  }), [teams, events, voteId]);

  const load = useCallback(async () => {
    if (local) return;
    try {
      const v = await fetchMvpVotes(match.id, uid);
      if (!v) return;
      setCounts(v.counts);
      setMine(v.mine);
      setError(null);
    } catch (err) {
      console.warn('Voti MVP non caricati', err);
      setError('Voto MVP non disponibile al momento.');
    }
  }, [local, match.id, uid]);

  useEffect(() => {
    load();
    if (local) return;
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load, local]);

  /** Tocco su una giocatrice: la vota (o sposta il voto su di lei); toccare di nuovo quella votata toglie il voto */
  const vote = async (playerId: string) => {
    if (saving) return;
    const prev = { counts, mine };
    const remove = playerId === mine;
    // subito a schermo, poi si salva
    setCounts((s) => ({ ...s, ...(mine ? { [mine]: Math.max(0, (s[mine] ?? 1) - 1) } : {}), ...(remove ? {} : { [playerId]: (s[playerId] ?? 0) + 1 }) }));
    setMine(remove ? null : playerId);
    if (local || !uid) return;
    setSaving(playerId);
    try {
      if (remove) await unvoteMvp(match.id, uid);
      else await voteMvp(match.id, uid, playerId);
      setError(null);
      load();
    } catch (err) {
      console.warn('Voto MVP non salvato', err);
      setCounts(prev.counts);
      setMine(prev.mine);
      setError('Voto non salvato: controlla la connessione e riprova.');
    } finally {
      setSaving(null);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const best = Math.max(0, ...Object.values(counts));
  const canVote = !awayMatch && (local || !!uid);

  if (!columns.some((t) => t.list.length)) {
    return <Txt size={13} color="muted" center>Le formazioni non sono ancora disponibili: potrai votare appena saranno inserite.</Txt>;
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Txt w={800} size={15}>{finished ? 'Chi è stata la migliore in campo?' : 'Chi è la migliore in campo?'}</Txt>
        {awayMatch ? null : (
          <Txt size={12.5} color="muted">
            {canVote ? 'Un voto per partita, tra le giocatrici delle due squadre: tocca un\'altra giocatrice per cambiarlo, la stessa per toglierlo.' : 'Accedi per votare la tua MVP della partita.'}
            {total ? ` ${total} ${total === 1 ? 'voto' : 'voti'} dei tifosi finora.` : ' Ancora nessun voto per questa partita.'}
          </Txt>
        )}
      </View>

      {awayMatch ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.sm, backgroundColor: c.fill }}>
          <Info size={16} color={c.muted} />
          <Txt size={12.5} color="muted" style={{ flex: 1 }}>Il voto MVP è attivo solo nelle partite in casa.</Txt>
        </View>
      ) : !canVote ? <Button size="sm" variant="gold" label="Accedi per votare" onPress={() => router.push('/login')} /> : null}

      {/* in trasferta gli elenchi restano visibili (punti della partita) ma attenuati: non si vota */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, opacity: awayMatch ? 0.55 : 1 }}>
        {columns.map((t) => (
          <View key={t.side} style={{ flex: 1, minWidth: 0, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TeamBadge name={t.name} logo={t.logo} size={28} />
              <Txt w={700} size={13} numberOfLines={2} style={{ flex: 1 }}>{t.name}</Txt>
            </View>
            {t.list.length ? (
              <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
                {t.list.map(({ p, st }, i) => (
                  <VoteRow key={p.id} p={p} st={st} first={i === 0} votes={counts[voteId(p)!] ?? 0} best={best} selected={mine === voteId(p)}
                    canVote={canVote} busy={saving === voteId(p)} onPress={() => vote(voteId(p)!)} />
                ))}
              </View>
            ) : (
              <Txt size={12.5} color="muted">Formazione non ancora inserita.</Txt>
            )}
          </View>
        ))}
      </View>
      <Txt size={11.5} color="muted">Punti di questa partita: contano quelli registrati in cronaca con la giocatrice.</Txt>
      {error ? <Txt size={12} color="danger">{error}</Txt> : null}
    </View>
  );
}

/** Giocatrice votabile: numero e nome, sotto punti della partita e voti, a destra la spunta del proprio voto */
function VoteRow({ p, st, first, votes, best, selected, canVote, busy, onPress }: {
  p: LineupPlayer; st?: PlayerStats; first: boolean; votes: number; best: number; selected: boolean; canVote: boolean; busy: boolean; onPress: () => void;
}) {
  const { c } = useTheme();
  const leader = votes > 0 && votes === best;
  const pts = st?.points ?? 0;
  return (
    <Pressy onPress={canVote ? onPress : undefined} disabled={!canVote} scaleTo={0.98}
      accessibilityRole="button" accessibilityState={{ selected, disabled: !canVote, busy }}
      accessibilityLabel={`${p.name}, ${pts} punti, ${votes} ${votes === 1 ? 'voto' : 'voti'}${selected ? ', il tuo voto: tocca per toglierlo' : ''}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.line,
        backgroundColor: selected ? 'rgba(255,213,3,0.14)' : undefined }}>
      <NumberTag value={p.number} variant={selected ? 'starter' : 'bench'} size={22} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Txt w={600} size={12.5} numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Txt>
          {leader ? <Trophy size={12} color={c.accent} accessibilityLabel="In testa" /> : null}
        </View>
        <Txt size={11} color="muted" tnum numberOfLines={1}>
          {pts} {pts === 1 ? 'punto' : 'punti'} · {votes} {votes === 1 ? 'voto' : 'voti'}
        </Txt>
      </View>
      <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
        borderColor: selected ? palette.gold : c.lineStrong, backgroundColor: selected ? palette.gold : undefined }}>
        {selected ? <Check size={12} color={palette.onGold} strokeWidth={3} /> : null}
      </View>
    </Pressy>
  );
}
