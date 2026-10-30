import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { Crown, Flame, Heart, Info, Lock, Trophy, Users } from 'lucide-react-native';
import { Button } from './Button';
import { ROLE_LABEL } from './LineupPanel';
import { Pressy } from './Pressy';
import { SearchField, matchesPlayer } from './SearchField';
import { SegmentedControl } from './SegmentedControl';
import { matchPlayerStats, type PlayerStats } from './StatsPanel';
import { TeamBadge } from './TeamBadge';
import { useToast } from './Toast';
import { Txt } from './Txt';
import { fetchMvpVotes, unvoteMvp, voteMvp } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { palette, radius, space } from '@/theme/colors';
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
 * Voto MVP tra le giocatrici di entrambe le squadre, con i punti della partita: in alto il riepilogo (la più votata con i voti, la propria scelta),
 * poi il carosello delle performer (titolari e chi ha fatto punti) e l'elenco filtrabile per squadra e ricerca; si vota con il cuore.
 * Senza accesso tutto resta visibile ma bloccato: il tocco spiega come votare.
 * Un voto per utente registrato, modificabile; nella partita demo resta solo sul dispositivo.
 * awayMatch: in trasferta il pannello si vede (giocatrici e punti) ma il voto è disattivato.
 * onLeave: chiude il contenitore (es. il pannello dal basso della diretta) prima di andare all'accesso.
 */
export function MvpPanel({ match, awayMatch, teams, events, finished, onLeave }: { match: Match; awayMatch?: boolean; teams: MvpTeam[]; events: LiveEvent[]; finished: boolean; onLeave?: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  const toast = useToast();
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
  // senza accesso anche filtri e ricerca restano bloccati (in trasferta si consultano, ma non si vota)
  const guest = !local && !uid;
  const lockMsg = awayMatch ? 'Il voto MVP è attivo solo nelle partite in casa.' : 'Accedi prima al tuo account per poter esprimere il tuo voto';
  const warnLocked = () => toast.show(lockMsg, Lock);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // tutte le giocatrici votabili delle due squadre, con la squadra di appartenenza
  const everyone = useMemo(() => columns.flatMap((t) => t.list.map((r) => ({ ...r, team: t }))), [columns]);
  // carosello: titolari (e libero) e chi è entrata e ha fatto punti, da entrambe le squadre, per punti della partita
  const performers = useMemo(() => everyone.filter((r) => r.p.zone != null || r.p.isLibero || (r.st?.points ?? 0) > 0)
    .sort((a, b) => (b.st?.points ?? 0) - (a.st?.points ?? 0) || (b.st?.attacks ?? 0) - (a.st?.attacks ?? 0) || (a.p.number ?? 99) - (b.p.number ?? 99)), [everyone]);
  const voted = mine ? everyone.find((r) => voteId(r.p) === mine) : undefined;
  // la più votata: a parità di voti, quella con più punti
  const leader = best > 0
    ? everyone.filter((r) => counts[voteId(r.p)!] === best).sort((a, b) => (b.st?.points ?? 0) - (a.st?.points ?? 0))[0]
    : undefined;
  // ricerca per nome o numero di maglia, sulla squadra scelta
  const shown = useMemo(() => everyone.filter((r) => (filter === 'all' || r.team.side === filter) && matchesPlayer(r.p, query)), [everyone, filter, query]);

  if (!columns.some((t) => t.list.length)) {
    return <Txt size={13} color="muted" center>Le formazioni non sono ancora disponibili: potrai votare appena saranno inserite.</Txt>;
  }

  const rowProps = (r: (typeof everyone)[number]) => {
    const id = voteId(r.p)!;
    return { votes: counts[id] ?? 0, selected: mine === id, busy: saving === id, locked: !canVote, onPress: canVote ? () => vote(id) : warnLocked };
  };

  return (
    <View style={{ gap: space.md }}>
      {canVote ? (
        <Txt size={12.5} color="muted">
          {finished ? 'Chi è stata la migliore in campo? ' : 'Chi è la migliore in campo? '}
          Un voto per partita: tocca il cuore di un&apos;altra giocatrice per cambiarlo, lo stesso per toglierlo.
        </Txt>
      ) : null}

      {awayMatch ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.sm, backgroundColor: c.fill }}>
          <Info size={16} color={c.muted} />
          <Txt size={12.5} color="muted" style={{ flex: 1 }}>Il voto MVP è attivo solo nelle partite in casa.</Txt>
        </View>
      ) : guest ? (
        <View style={{ gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: palette.gold, backgroundColor: c.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,213,3,0.14)' }}>
              <Lock size={18} color={palette.gold} strokeWidth={2.5} />
            </View>
            <Txt w={700} size={14} style={{ flex: 1 }}>Accedi per votare la tua MVP della partita</Txt>
          </View>
          <Button size="sm" variant="gold" label="ACCEDI ORA" onPress={() => { onLeave?.(); router.push('/login'); }} />
        </View>
      ) : null}

      {/* riepilogo: a sinistra la più votata con i voti, a destra la propria scelta */}
      <View style={{ flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
        <View style={{ flex: 1, minWidth: 0, padding: space.md, gap: space.sm }}>
          <SectionLabel icon={<Trophy size={14} color={c.accent} />} label="Più votata" />
          {leader ? (
            <>
              <MiniCard r={leader} />
              <View>
                <Txt w={900} display size={24} color="accent" tnum>{best} {best === 1 ? 'voto' : 'voti'}</Txt>
                <Txt size={11.5} color="muted" tnum>su {total} {total === 1 ? 'voto totale' : 'voti totali'}</Txt>
              </View>
            </>
          ) : (
            <Empty icon={<Trophy size={20} color={c.muted} />} text="Ancora nessun voto per questa partita." />
          )}
        </View>
        <View style={{ width: 1, backgroundColor: c.line }} />
        <View style={{ flex: 1, minWidth: 0, padding: space.md, gap: space.sm }}>
          <SectionLabel icon={<Heart size={14} color={c.accent} fill={c.accent} />} label="La tua scelta" />
          {voted ? (
            <>
              <MiniCard r={voted} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <HeartButton {...rowProps(voted)} name={voted.p.name} />
                <Txt size={11.5} color="muted" style={{ flex: 1 }}>Tocca il cuore per togliere il voto</Txt>
              </View>
            </>
          ) : (
            <Empty icon={<Heart size={20} color={c.muted} />} text={canVote ? 'Non hai ancora votato: tocca il cuore di una giocatrice.' : guest ? 'Accedi per scegliere la tua MVP.' : 'Voto non disponibile.'} />
          )}
        </View>
      </View>

      {performers.length ? (
        <View style={{ gap: space.sm }}>
          <SectionLabel icon={<Flame size={14} color={c.accent} />} label="Top performer" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {performers.map((r, i) => <PerformerCard key={r.p.id} r={r} rank={i + 1} {...rowProps(r)} />)}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionLabel icon={<Users size={14} color={c.accent} />} label="Tutte le giocatrici" />
        {/* senza accesso filtri e ricerca sono in sola lettura: il tocco spiega perché */}
        <Pressable onPress={guest ? warnLocked : undefined} disabled={!guest} accessibilityState={{ disabled: guest }}>
          <View pointerEvents={guest ? 'none' : 'auto'} style={{ gap: space.sm, opacity: guest ? 0.6 : 1 }}>
            <SegmentedControl value={filter} onChange={setFilter}
              options={[{ value: 'all' as Filter, label: 'Tutte' }, ...columns.map((t) => ({ value: t.side as Filter, label: t.name, icon: <TeamBadge name={t.name} logo={t.logo} size={20} /> }))]} />
            <SearchField value={query} onChange={setQuery} editable={!guest} placeholder="Cerca per nome o numero" label="Cerca una giocatrice per nome o numero di maglia" />
          </View>
        </Pressable>
        {shown.length ? (
          <View style={{ gap: space.sm }}>
            {shown.map((r) => <VoteRow key={r.p.id} p={r.p} st={r.st} team={r.team} best={best} {...rowProps(r)} />)}
          </View>
        ) : (
          <Txt size={12.5} color="muted" center>{query ? 'Nessuna giocatrice trovata.' : 'Formazione non ancora inserita.'}</Txt>
        )}
      </View>
      <Txt size={11.5} color="muted">Punti di questa partita: contano quelli registrati in cronaca con la giocatrice.</Txt>
      {error ? <Txt size={12} color="danger">{error}</Txt> : null}
    </View>
  );
}

type Filter = 'all' | 'us' | 'opp';
type Ranked = { p: LineupPlayer; st?: PlayerStats; team: MvpTeam };
type VoteProps = { votes: number; selected: boolean; locked: boolean; busy: boolean; onPress: () => void };

/** Colore della squadra: oro la nostra, blu l'avversaria */
const teamColor = (side: MvpTeam['side']) => (side === 'us' ? palette.gold : palette.blue);

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {icon}
      <Txt w={700} size={12} color="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Txt>
    </View>
  );
}

/** Riquadro vuoto del riepilogo (nessun voto ancora) */
function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.md }}>
      {icon}
      <Txt size={12} color="muted" center>{text}</Txt>
    </View>
  );
}

/** Giocatrice nel riepilogo: maglia con stemma, nome e squadra */
function MiniCard({ r }: { r: Ranked }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Jersey p={r.p} team={r.team} size={44} gold />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt w={700} size={13.5} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>{r.p.name}</Txt>
        <Txt size={11.5} color="muted" numberOfLines={1}>{r.team.name}</Txt>
      </View>
    </View>
  );
}

/** Cuore del voto: vuoto da votare, pieno se è il proprio voto, attenuato se non si può votare (il tocco spiega perché) */
function HeartButton({ selected, locked, busy, onPress, name, votes }: VoteProps & { name: string }) {
  const { c } = useTheme();
  return (
    <Pressy onPress={onPress} disabled={busy} scaleTo={0.85} hitSlop={6}
      accessibilityRole="button" accessibilityState={{ selected, disabled: locked, busy }}
      accessibilityLabel={locked ? `Voto bloccato per ${name}` : `${selected ? 'Togli il voto a' : 'Vota MVP'} ${name}, ${votes} ${votes === 1 ? 'voto' : 'voti'}`}
      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', opacity: locked ? 0.5 : 1 }}>
      <Heart size={22} color={selected ? palette.gold : c.muted} fill={selected ? palette.gold : 'transparent'} strokeWidth={2.25} />
    </Pressy>
  );
}

/** Trama a rete dietro il numero di maglia (linee incrociate, tinta piena) */
function Mesh({ size, color }: { size: number; color: string }) {
  const id = useId();
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse">
          <Path d="M0 6L6 0M-1 1L1 -1M5 7L7 5M0 0L6 6" stroke={color} strokeWidth={0.8} />
        </Pattern>
      </Defs>
      <Rect width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Numero di maglia grande su trama a rete, con lo stemma della squadra nell'angolo */
function Jersey({ p, team, size, gold }: { p: LineupPlayer; team: MvpTeam; size: number; gold?: boolean }) {
  const { c } = useTheme();
  return (
    <View>
      <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        backgroundColor: gold ? palette.gold : c.cardAlt, borderWidth: 1.5, borderColor: gold ? palette.gold : c.lineStrong }}>
        <Mesh size={size} color={gold ? 'rgba(6,26,58,0.16)' : c.line} />
        <Txt w={900} display size={Math.round(size * 0.5)} color={gold ? palette.onGold : c.text} tnum style={{ lineHeight: Math.round(size * 0.56) }}>{p.number ?? '–'}</Txt>
      </View>
      <View style={{ position: 'absolute', right: -6, bottom: -6 }}>
        <TeamBadge name={team.name} logo={team.logo} size={Math.round(size * 0.36)} />
      </View>
    </View>
  );
}

/** Card del carosello: posizione per punti e cuore in alto, maglia con stemma, nome e punti su una riga */
function PerformerCard({ r, rank, ...vote }: VoteProps & { r: Ranked; rank: number }) {
  const { c } = useTheme();
  const { p, st, team } = r;
  const first = rank === 1;
  const pts = st?.points ?? 0;
  return (
    <Pressy onPress={vote.onPress} disabled={vote.busy} scaleTo={0.97} accessible={false}
      style={{ width: 136, borderRadius: radius.md, borderWidth: vote.selected ? 1.5 : 1, borderColor: vote.selected ? palette.gold : c.line,
        backgroundColor: c.card, padding: space.sm, gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, height: 22, borderRadius: radius.pill, backgroundColor: first ? palette.gold : c.fill2 }}>
          {first ? <Crown size={12} color={palette.onGold} strokeWidth={2.5} /> : null}
          <Txt w={900} display size={15} color={first ? palette.onGold : 'muted'}>{rank}°</Txt>
        </View>
        <HeartButton {...vote} name={p.name} />
      </View>
      <View style={{ alignSelf: 'center' }}>
        <Jersey p={p} team={team} size={52} gold={first || vote.selected} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xs }}>
        <Txt w={700} size={12.5} numberOfLines={1} style={{ flex: 1 }}>{p.name}</Txt>
        <Txt w={700} size={12.5} color="accent" tnum>{pts} pt</Txt>
      </View>
    </Pressy>
  );
}

/** Card orizzontale di una giocatrice: numero in evidenza, nome, squadra, punti e voti, cuore del voto a destra */
function VoteRow({ p, st, team, best, ...vote }: VoteProps & { p: LineupPlayer; st?: PlayerStats; team: MvpTeam; best: number }) {
  const { c } = useTheme();
  const leader = vote.votes > 0 && vote.votes === best;
  const pts = st?.points ?? 0;
  return (
    <Pressy onPress={vote.onPress} disabled={vote.busy} scaleTo={0.98} accessible={false}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingLeft: space.md, borderRadius: radius.md, borderWidth: vote.selected ? 1.5 : 1,
        borderColor: vote.selected ? palette.gold : c.line, backgroundColor: vote.selected ? 'rgba(255,213,3,0.08)' : c.card, overflow: 'hidden' }}>
      {/* filo del colore della squadra */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: teamColor(team.side) }} />
      <Jersey p={p} team={team} size={40} gold={vote.selected} />
      <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          {/* nomi lunghi: vanno su due righe e, se non bastano, il carattere si riduce */}
          <Txt w={700} size={13.5} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1 }}>{p.name}</Txt>
          {leader ? <Trophy size={13} color={c.accent} accessibilityLabel="In testa" /> : null}
        </View>
        <Txt size={11.5} color="muted" tnum numberOfLines={1}>
          {team.name}{p.role ? ` · ${ROLE_LABEL[p.role]}` : ''}
        </Txt>
        <Txt size={11.5} tnum numberOfLines={1}>
          <Txt w={700} size={11.5} color="accent" tnum>{pts}</Txt> {pts === 1 ? 'punto' : 'punti'} · {vote.votes} {vote.votes === 1 ? 'voto' : 'voti'}
        </Txt>
      </View>
      <HeartButton {...vote} name={p.name} />
    </Pressy>
  );
}
