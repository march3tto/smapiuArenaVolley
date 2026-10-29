import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Check, Crown, Flame, Info, Search, Star, Trophy, Undo2, Users, X } from 'lucide-react-native';
import { Button } from './Button';
import { NumberTag, ROLE_LABEL, tagVariant } from './LineupPanel';
import { Pressy } from './Pressy';
import { SegmentedControl } from './SegmentedControl';
import { matchPlayerStats, type PlayerStats } from './StatsPanel';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { fetchMvpVotes, unvoteMvp, voteMvp } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { brand, FONT, palette, radius } from '@/theme/colors';
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
 * Voto MVP tra le giocatrici di entrambe le squadre, con i punti della partita: in alto la propria MVP, poi le tre migliori e l'elenco filtrabile per squadra e ricerca.
 * Un voto per utente registrato, modificabile; nella partita demo resta solo sul dispositivo.
 * awayMatch: in trasferta il pannello si vede (giocatrici e punti) ma il voto è disattivato.
 * onLeave: chiude il contenitore (es. il pannello dal basso della diretta) prima di andare all'accesso.
 */
export function MvpPanel({ match, awayMatch, teams, events, finished, onLeave }: { match: Match; awayMatch?: boolean; teams: MvpTeam[]; events: LiveEvent[]; finished: boolean; onLeave?: () => void }) {
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

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // tutte le giocatrici votabili delle due squadre, con la squadra di appartenenza
  const everyone = useMemo(() => columns.flatMap((t) => t.list.map((r) => ({ ...r, team: t }))), [columns]);
  // le tre con più punti nella partita, da entrambe le squadre
  const top = useMemo(() => everyone.filter((r) => (r.st?.points ?? 0) > 0)
    .sort((a, b) => (b.st?.points ?? 0) - (a.st?.points ?? 0) || (b.st?.attacks ?? 0) - (a.st?.attacks ?? 0)).slice(0, 3), [everyone]);
  const voted = mine ? everyone.find((r) => voteId(r.p) === mine) : undefined;
  // ricerca per nome o numero di maglia, sulla squadra scelta
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return everyone.filter((r) => (filter === 'all' || r.team.side === filter)
      && (!q || r.p.name.toLowerCase().includes(q) || String(r.p.number ?? '') === q));
  }, [everyone, filter, query]);

  if (!columns.some((t) => t.list.length)) {
    return <Txt size={13} color="muted" center>Le formazioni non sono ancora disponibili: potrai votare appena saranno inserite.</Txt>;
  }

  const rowProps = (r: (typeof everyone)[number]) => {
    const id = voteId(r.p)!;
    return { votes: counts[id] ?? 0, selected: mine === id, busy: saving === id, onPress: () => vote(id) };
  };

  return (
    <View style={{ gap: 16 }}>
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
      ) : !canVote ? <Button size="sm" variant="gold" label="Accedi per votare" onPress={() => { onLeave?.(); router.push('/login'); }} /> : null}

      {canVote ? (voted
        ? <HeroCard r={voted} votes={counts[mine!] ?? 0} busy={saving === mine} onRemove={() => vote(mine!)} />
        : (
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: 18, paddingHorizontal: 16, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,213,3,0.55)', backgroundColor: c.fill }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,213,3,0.14)' }}>
              <Crown size={22} color={palette.gold} />
            </View>
            <Txt w={700} size={14} center>Nessun voto ancora</Txt>
            <Txt size={12.5} color="muted" center>Scegli qui sotto la migliore in campo: sarà la tua MVP.</Txt>
          </View>
        )) : null}

      {/* in trasferta le giocatrici restano visibili (punti della partita) ma attenuate: non si vota */}
      <View style={{ gap: 16, opacity: awayMatch ? 0.55 : 1 }}>
        {top.length ? (
          <View style={{ gap: 8 }}>
            <SectionLabel icon={<Flame size={14} color={c.accent} />} label="Top performer" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {top.map((r, i) => <TopCard key={r.p.id} r={r} rank={i + 1} canVote={canVote} {...rowProps(r)} />)}
            </View>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <SectionLabel icon={<Users size={14} color={c.accent} />} label="Tutte le giocatrici" />
          <SegmentedControl value={filter} onChange={setFilter}
            options={[{ value: 'all' as Filter, label: 'Tutte' }, ...columns.map((t) => ({ value: t.side as Filter, label: t.name, dot: t.side === 'us' ? palette.gold : palette.blue }))]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, backgroundColor: c.fill }}>
            <Search size={16} color={c.muted} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Cerca per nome o numero" placeholderTextColor={c.muted}
              autoCorrect={false} returnKeyType="search" accessibilityLabel="Cerca una giocatrice per nome o numero di maglia"
              style={{ flex: 1, fontFamily: FONT[500], fontSize: 14, color: c.text, paddingVertical: 0 }} />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancella la ricerca">
                <X size={16} color={c.muted} />
              </Pressable>
            ) : null}
          </View>
          {shown.length ? (
            <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: 'hidden' }}>
              {shown.map((r, i) => <VoteRow key={r.p.id} p={r.p} st={r.st} team={r.team} first={i === 0} best={best} canVote={canVote} {...rowProps(r)} />)}
            </View>
          ) : (
            <Txt size={12.5} color="muted" center>{query ? 'Nessuna giocatrice trovata.' : 'Formazione non ancora inserita.'}</Txt>
          )}
        </View>
      </View>
      <Txt size={11.5} color="muted">Punti di questa partita: contano quelli registrati in cronaca con la giocatrice.</Txt>
      {error ? <Txt size={12} color="danger">{error}</Txt> : null}
    </View>
  );
}

type Filter = 'all' | 'us' | 'opp';
type Ranked = { p: LineupPlayer; st?: PlayerStats; team: MvpTeam };

/** Colore della squadra: oro la nostra, blu l'avversaria */
const teamColor = (side: MvpTeam['side']) => (side === 'us' ? palette.gold : palette.blue);

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Txt w={700} size={12} color="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Txt>
    </View>
  );
}

/** La giocatrice votata: card dorata con squadra, statistiche della partita, tifosi che la sostengono e voto da togliere */
function HeroCard({ r, votes, busy, onRemove }: { r: Ranked; votes: number; busy: boolean; onRemove: () => void }) {
  const { p, st, team } = r;
  const stats = [{ label: 'Punti', value: st?.points ?? 0 }, { label: 'Muri', value: st?.blocks ?? 0 }, { label: 'Ace', value: st?.aces ?? 0 }];
  return (
    <View style={{ borderRadius: radius.lg, shadowColor: palette.gold, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
      <LinearGradient colors={[brand.bluScuro, brand.bluNotte]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.lg, borderWidth: 1.5, borderColor: palette.gold, padding: 14, gap: 12, overflow: 'hidden' }}>
        {/* riflesso dorato in alto */}
        <LinearGradient colors={['rgba(255,213,3,0.28)', 'rgba(255,213,3,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View>
            <NumberTag value={p.number} variant="starter" size={56} />
            <View style={{ position: 'absolute', right: -8, bottom: -8 }}>
              <TeamBadge name={team.name} logo={team.logo} size={26} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: radius.pill, backgroundColor: palette.gold }}>
              <Crown size={12} color={palette.onGold} strokeWidth={2.5} />
              <Txt w={800} size={11} color={palette.onGold}>LA TUA MVP</Txt>
            </View>
            <Txt w={800} size={20} color={palette.white} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>{p.name}</Txt>
            <Txt size={12} color={brand.testo2} numberOfLines={1}>{team.name}{p.role ? ` · ${ROLE_LABEL[p.role]}` : ''}</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {stats.map((s) => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,213,3,0.22)' }}>
              <Txt w={800} size={22} color={palette.gold} tnum>{s.value}</Txt>
              <Txt size={11} color={brand.testo2}>{s.label}</Txt>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Users size={14} color={brand.testo2} />
          <Txt size={12.5} color={brand.testo2} tnum style={{ flex: 1 }}>
            {votes} {votes === 1 ? 'tifoso la sostiene' : 'tifosi la sostengono'}
          </Txt>
          <Pressy onPress={onRemove} disabled={busy} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={`Togli il voto a ${p.name}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 30, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' }}>
            <Undo2 size={13} color={palette.white} />
            <Txt w={600} size={12} color={palette.white}>Togli voto</Txt>
          </Pressy>
        </View>
      </LinearGradient>
    </View>
  );
}

/** Una delle tre migliori della partita: barra del colore della squadra, numero, punti e attacchi, pulsante di voto */
function TopCard({ r, rank, votes, selected, canVote, busy, onPress }: { r: Ranked; rank: number; votes: number; selected: boolean; canVote: boolean; busy: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const { p, st, team } = r;
  const pts = st?.points ?? 0;
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: radius.md, borderWidth: selected ? 1.5 : 1, borderColor: selected ? palette.gold : c.line, backgroundColor: c.card, overflow: 'hidden' }}>
      <View style={{ height: 4, backgroundColor: teamColor(team.side) }} />
      <View style={{ padding: 10, gap: 8, alignItems: 'center' }}>
        <View style={{ position: 'absolute', top: 6, left: 8 }}>
          <Txt w={800} display size={15} color="muted">{rank}°</Txt>
        </View>
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <TeamBadge name={team.name} logo={team.logo} size={20} />
        </View>
        <View style={{ marginTop: 10 }}>
          <NumberTag value={p.number} variant={selected ? 'starter' : tagVariant(p)} size={40} />
        </View>
        <Txt w={700} size={12.5} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ minHeight: 32 }}>{p.name}</Txt>
        <View style={{ alignItems: 'center' }}>
          <Txt w={800} display size={22} color="accent" tnum>{pts}</Txt>
          <Txt size={10.5} color="muted" tnum numberOfLines={1}>{pts === 1 ? 'punto' : 'punti'} · {st?.attacks ?? 0} att.</Txt>
        </View>
        <Pressy onPress={canVote ? onPress : undefined} disabled={!canVote || busy} scaleTo={0.94}
          accessibilityRole="button" accessibilityState={{ selected, disabled: !canVote, busy }}
          accessibilityLabel={`${selected ? 'Togli il voto a' : 'Vota MVP'} ${p.name}, ${votes} ${votes === 1 ? 'voto' : 'voti'}`}
          style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 30, borderRadius: radius.pill,
            backgroundColor: selected ? 'transparent' : palette.gold, borderWidth: 1.5, borderColor: palette.gold }}>
          {selected ? <Check size={13} color={c.accent} strokeWidth={3} /> : <Star size={13} color={palette.onGold} fill={palette.onGold} />}
          <Txt w={700} size={12} color={selected ? 'accent' : palette.onGold}>{selected ? 'Votata' : 'Vota'}</Txt>
        </Pressy>
      </View>
    </View>
  );
}

/** Giocatrice votabile: numero, nome e squadra, sotto punti della partita e voti, a destra il pallino del proprio voto */
function VoteRow({ p, st, team, first, votes, best, selected, canVote, busy, onPress }: {
  p: LineupPlayer; st?: PlayerStats; team: MvpTeam; first: boolean; votes: number; best: number; selected: boolean; canVote: boolean; busy: boolean; onPress: () => void;
}) {
  const { c } = useTheme();
  const leader = votes > 0 && votes === best;
  const pts = st?.points ?? 0;
  return (
    <Pressy onPress={canVote ? onPress : undefined} disabled={!canVote} scaleTo={0.98}
      accessibilityRole="button" accessibilityState={{ selected, disabled: !canVote, busy }}
      accessibilityLabel={`${p.name}, ${team.name}, ${pts} punti, ${votes} ${votes === 1 ? 'voto' : 'voti'}${selected ? ', il tuo voto: tocca per toglierlo' : ''}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.line,
        backgroundColor: selected ? 'rgba(255,213,3,0.14)' : undefined }}>
      {/* filo del colore della squadra */}
      <View style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: teamColor(team.side) }} />
      <NumberTag value={p.number} variant={selected ? 'starter' : tagVariant(p)} size={28} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* nomi lunghi: vanno su due righe e, se non bastano, il carattere si riduce */}
          <Txt w={600} size={13.5} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1 }}>{p.name}</Txt>
          {leader ? <Trophy size={13} color={c.accent} accessibilityLabel="In testa" /> : null}
        </View>
        <Txt size={11.5} color="muted" tnum numberOfLines={1}>
          {team.name} · {pts} {pts === 1 ? 'punto' : 'punti'} · {votes} {votes === 1 ? 'voto' : 'voti'}
        </Txt>
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
        borderColor: selected ? palette.gold : c.lineStrong, backgroundColor: selected ? palette.gold : undefined }}>
        {selected ? <Check size={13} color={palette.onGold} strokeWidth={3} /> : null}
      </View>
    </Pressy>
  );
}
