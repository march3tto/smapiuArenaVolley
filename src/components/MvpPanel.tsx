import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Trophy } from 'lucide-react-native';
import { Button } from './Button';
import { NumberTag } from './LineupPanel';
import { Pressy } from './Pressy';
import { matchPlayerStats } from './StatsPanel';
import { Txt } from './Txt';
import { fetchMvpVotes, unvoteMvp, voteMvp } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer, LiveEvent, Match } from '@/types';

/** I voti degli altri utenti per la stessa partita si ricaricano mentre il pannello è aperto */
const REFRESH_MS = 10000;

/** Voto MVP con le statistiche della partita di ogni giocatrice: un voto per utente registrato, modificabile; nella partita demo resta solo sul dispositivo */
export function MvpPanel({ match, players, events, totalPoints, finished }: { match: Match; players: LineupPlayer[]; events: LiveEvent[]; totalPoints: number; finished: boolean }) {
  const { c } = useTheme();
  const router = useRouter();
  const { user } = useApp();
  const local = !!match.demoLive || !hasSupabase;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uid = user?.id ?? null;
  // statistiche della sola partita, dalle azioni registrate nella cronaca
  const stats = useMemo(() => matchPlayerStats(events, players), [events, players]);
  const statOf = (p: LineupPlayer) => stats.find((s) => s.key === p.playerId || s.key === p.id);
  const recorded = stats.reduce((n, s) => n + s.points, 0);
  // si votano solo le giocatrici della rosa: prima chi ha fatto più punti, poi titolari e libero
  const list = players.filter((p) => !!p.playerId)
    .sort((a, b) => (statOf(b)?.points ?? 0) - (statOf(a)?.points ?? 0)
      || Number(b.zone != null || b.isLibero) - Number(a.zone != null || a.isLibero) || (a.number ?? 99) - (b.number ?? 99));

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
  const canVote = local || !!uid;

  if (!list.length) {
    return <Txt size={13} color="muted" center>La formazione non è ancora disponibile: potrai votare appena sarà inserita.</Txt>;
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Txt w={800} size={15}>{finished ? 'Chi è stata la migliore in campo?' : 'Chi è la migliore in campo?'}</Txt>
        <Txt size={12.5} color="muted">
          {canVote ? 'Un voto per partita: tocca un\'altra giocatrice per cambiarlo, la stessa per toglierlo.' : 'Accedi per votare la tua MVP della partita.'}
          {total ? ` ${total} ${total === 1 ? 'voto' : 'voti'} dei tifosi finora.` : ' Ancora nessun voto per questa partita.'}
        </Txt>
      </View>

      {!canVote ? <Button size="sm" variant="gold" label="Accedi per votare" onPress={() => router.push('/login')} /> : null}

      <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
        {list.map((p, i) => {
          const id = p.playerId!;
          const n = counts[id] ?? 0;
          const share = total ? n / total : 0;
          const selected = mine === id;
          const leader = n > 0 && n === best;
          const st = statOf(p);
          return (
            <Pressy key={p.id} onPress={canVote ? () => vote(id) : undefined} disabled={!canVote} scaleTo={0.98}
              accessibilityRole="button" accessibilityState={{ selected, disabled: !canVote, busy: saving === id }}
              accessibilityLabel={`${p.name}, ${n} ${n === 1 ? 'voto' : 'voti'}${selected ? ', il tuo voto: tocca per toglierlo' : ''}`}
              style={{ paddingHorizontal: 10, paddingVertical: 9, gap: 6, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, backgroundColor: selected ? 'rgba(255,213,3,0.14)' : undefined }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <NumberTag value={p.number} variant={selected ? 'starter' : 'bench'} size={24} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt w={600} size={13} numberOfLines={1}>{p.name}</Txt>
                  <Txt size={11.5} color="muted" tnum numberOfLines={1}>
                    {st ? `${st.points} ${st.points === 1 ? 'punto' : 'punti'} · ${st.attacks} att. · ${st.aces} ace · ${st.blocks} muri` : 'Nessun punto in questa partita'}
                  </Txt>
                </View>
                {leader ? <Trophy size={14} color={c.accent} accessibilityLabel="In testa" /> : null}
                {/* totale dei voti ricevuti dagli utenti per questa partita (anche zero), con il tuo se l'hai scelta */}
                <View style={{ alignItems: 'flex-end', minWidth: 48 }}>
                  <Txt w={800} size={14} tnum display={false} color={n ? 'text' : 'muted'}>{n} {n === 1 ? 'voto' : 'voti'}</Txt>
                  <Txt size={11} tnum color="muted">{selected ? 'incluso il tuo' : total ? `${Math.round(share * 100)}%` : 'nessun voto'}</Txt>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
                  borderColor: selected ? palette.gold : c.lineStrong, backgroundColor: selected ? palette.gold : undefined }}>
                  {selected ? <Check size={13} color={palette.onGold} strokeWidth={3} /> : null}
                </View>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: c.fill2, overflow: 'hidden' }}>
                {n ? <View style={{ width: `${share * 100}%`, height: 4, borderRadius: 2, backgroundColor: palette.gold }} /> : null}
              </View>
            </Pressy>
          );
        })}
      </View>
      <Txt size={11.5} color="muted">
        Statistiche di questa partita: {recorded} punti su {totalPoints} hanno la giocatrice registrata.
      </Txt>
      {error ? <Txt size={12} color="danger">{error}</Txt> : null}
    </View>
  );
}
