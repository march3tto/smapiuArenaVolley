import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LayoutAnimation, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, Flame, Heart, Info, Lock, Trophy, Users } from 'lucide-react-native';
import { Button } from './Button';
import { Mesh } from './HiddenScore';
import { ROLE_LABEL } from './LineupPanel';
import { Pressy } from './Pressy';
import { SearchField, matchesPlayer } from './SearchField';
import { SegmentedControl } from './SegmentedControl';
import { matchPlayerStats, type PlayerStats } from './StatsPanel';
import { TeamBadge } from './TeamBadge';
import { useToast } from './Toast';
import { Txt, type TxtProps } from './Txt';
import { fetchMvpVotes, unvoteMvp, voteMvp } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { palette, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImgSrc, LineupPlayer, LiveEvent, Match } from '@/types';

/** I voti degli altri utenti per la stessa partita si ricaricano mentre il pannello è aperto */
const REFRESH_MS = 10000;
/** Finestra del voto: si apre all'inizio di questo set */
const MVP_FROM_SET = 3;
const CLOSED_MSG = 'Il voto MVP si apre all\'inizio del 3° set.';

export interface MvpTeam {
  side: 'us' | 'opp';
  name: string;
  logo?: ImgSrc | null;
  players: LineupPlayer[];
}

/**
 * Voto MVP tra le giocatrici di entrambe le squadre, con i punti della partita: in alto il riepilogo (la più votata con i voti),
 * poi il carosello delle performer (titolari e chi ha fatto punti) e l'elenco filtrabile per squadra e ricerca; si vota con il cuore.
 * Senza accesso tutto resta visibile ma bloccato: il tocco spiega come votare.
 * Un voto per utente registrato, modificabile; nella partita demo resta solo sul dispositivo.
 * awayMatch: in trasferta il pannello si vede (giocatrici e punti) ma il voto è disattivato.
 * set: set in corso; il voto si apre dal 3° set (finestra controllata anche dal database, voto_mvp_valido) e resta aperto a partita finita.
 * onLeave: chiude il contenitore (es. la finestra del voto sopra la diretta) prima di andare all'accesso.
 */
export function MvpPanel({ match, awayMatch, teams, events, set, finished, onLeave }: { match: Match; awayMatch?: boolean; teams: MvpTeam[]; events: LiveEvent[]; set: number; finished: boolean; onLeave?: () => void }) {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- caricamento dati da Supabase all'apertura (lo stato si aggiorna a fetch finita)
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
  // nella demo si vota subito (resta comunque solo per chi ha un account)
  const windowOpen = !!match.demoLive || finished || set >= MVP_FROM_SET;
  // vota solo chi ha un account (anche nella demo, se c'è Supabase); senza accesso anche filtri e ricerca restano bloccati
  const guest = hasSupabase && !uid;
  const canVote = !awayMatch && windowOpen && !guest;
  const lockMsg = awayMatch ? 'Il voto MVP è attivo solo nelle partite in casa.'
    : !windowOpen ? CLOSED_MSG
    : 'Accedi prima al tuo account per poter esprimere il tuo voto';
  const warnLocked = () => toast.show(lockMsg, Lock);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  // pannello "Tutte le giocatrici" (filtri, ricerca ed elenco) chiuso di default; chiudendolo si torna a tutte le giocatrici
  const [listOpen, setListOpen] = useState(false);
  const toggleList = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (listOpen) { setFilter('all'); setQuery(''); }
    setListOpen(!listOpen);
  };
  // tutte le giocatrici votabili delle due squadre, con la squadra di appartenenza
  const everyone = useMemo(() => columns.flatMap((t) => t.list.map((r) => ({ ...r, team: t }))), [columns]);
  // carosello: titolari (e libero) e chi è entrata e ha fatto punti, da entrambe le squadre, per punti della partita
  const performers = useMemo(() => everyone.filter((r) => r.p.zone != null || r.p.isLibero || (r.st?.points ?? 0) > 0)
    .sort((a, b) => (b.st?.points ?? 0) - (a.st?.points ?? 0) || (b.st?.attacks ?? 0) - (a.st?.attacks ?? 0) || (a.p.number ?? 99) - (b.p.number ?? 99)), [everyone]);
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
      {awayMatch ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.sm, backgroundColor: c.fill }}>
          <Info size={16} color={c.muted} />
          <Txt size={12.5} color="muted" style={{ flex: 1 }}>Il voto MVP è attivo solo nelle partite in casa.</Txt>
        </View>
      ) : null}

      {!awayMatch && !windowOpen ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.sm, backgroundColor: c.fill }}>
          <Info size={16} color={c.muted} />
          <Txt size={12.5} color="muted" style={{ flex: 1 }}>{CLOSED_MSG}</Txt>
        </View>
      ) : null}

      {!awayMatch && guest ? (
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

      {/* riepilogo: la più votata, tutto al centro: nome, stemma con il numero, voti */}
      {/* card compatta al centro, non a tutta larghezza */}
      <View style={{ alignSelf: 'center', minWidth: 180, maxWidth: 240, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.card,
        paddingVertical: space.sm + 2, paddingHorizontal: space.md, gap: space.xs + 2, alignItems: 'center' }}>
        <SectionLabel label="Più votata" />
        {leader ? (
          <>
            <PlayerName name={leader.p.name} size={14} center upper style={{ alignSelf: 'stretch' }} />
            {/* spazio per il numero di maglia, che sporge dall'angolo dello stemma */}
            <View style={{ marginBottom: 6 }}>
              <Jersey p={leader.p} team={leader.team} size={LEADER_BADGE} gold />
            </View>
            {/* voti della giocatrice sul totale dei voti espressi */}
            {/* i voti che la fanno vincere in giallo e più grandi (+15%), il totale nel colore del testo della card */}
            <View accessible accessibilityLabel={`${best} voti su ${total}`} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
              <Txt w={900} display size={17} color={palette.gold} tnum>{best}</Txt>
              <Txt w={900} display size={15} tnum>/{total} {total === 1 ? 'voto' : 'voti'}</Txt>
            </View>
          </>
        ) : (
          <Empty icon={<Trophy size={20} color={c.muted} />} text="Ancora nessun voto per questa partita." />
        )}
      </View>

      {performers.length ? (
        <View style={{ gap: space.sm }}>
          <SectionLabel icon={<Flame size={14} color={c.accent} />} label="Top performer" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {performers.map((r, i) => <PerformerCard key={r.p.id} r={r} rank={i + 1} {...rowProps(r)} />)}
          </ScrollView>
        </View>
      ) : null}

      {/* pannello espandibile: intestazione sempre visibile, dentro filtri, ricerca ed elenco */}
      <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, overflow: 'hidden' }}>
        <Pressable onPress={toggleList} accessibilityRole="button" accessibilityState={{ expanded: listOpen }}
          accessibilityLabel={`Tutte le giocatrici. ${listOpen ? 'Chiudi' : 'Apri'} l'elenco`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md }}>
          <View style={{ flex: 1 }}>
            <SectionLabel icon={<Users size={14} color={c.accent} />} label="Tutte le giocatrici" />
          </View>
          <ChevronDown size={18} color={listOpen ? c.accent : c.muted} style={{ transform: [{ rotate: listOpen ? '180deg' : '0deg' }] }} />
        </Pressable>
        {listOpen ? (
          <View style={{ gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md }}>
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
        ) : null}
      </View>
      {error ? <Txt size={12} color="danger">{error}</Txt> : null}
    </View>
  );
}

/** Stemma della più votata nel riepilogo */
const LEADER_BADGE = 36;

type Filter = 'all' | 'us' | 'opp';
type Ranked = { p: LineupPlayer; st?: PlayerStats; team: MvpTeam };
type VoteProps = { votes: number; selected: boolean; locked: boolean; busy: boolean; onPress: () => void };

function SectionLabel({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {icon}
      <Txt w={700} size={12} color="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Txt>
    </View>
  );
}

/** Riquadro vuoto del riepilogo (nessun voto ancora) */
function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  // niente flex: 1: nella card compatta (larghezza dal contenuto) il testo veniva misurato strettissimo e la card si allungava
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.md }}>
      {icon}
      <Txt size={12} color="muted" center>{text}</Txt>
    </View>
  );
}

/** Nome sulla prima riga, cognome (il resto) sulla seconda; i nomi lunghi riducono il carattere */
function PlayerName({ name, size, center, upper, style }: { name: string; size: number; center?: boolean; upper?: boolean; style?: StyleProp<ViewStyle> }) {
  const [first, ...rest] = name.trim().split(/\s+/);
  // grassetto pieno, sempre nel carattere del testo (non in quello dei titoli); upper: tutto maiuscolo
  const text: TxtProps = { w: 800, display: false, size, center, numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7, style: upper ? { textTransform: 'uppercase' as const } : undefined };
  return (
    <View style={style} accessible accessibilityLabel={name}>
      <Txt {...text}>{first}</Txt>
      {rest.length ? <Txt {...text}>{rest.join(' ')}</Txt> : null}
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

/** Stemma della squadra grande, con il numero di maglia nell'angolo (se manca, niente numero); gold: numero su fondo oro */
function Jersey({ p, team, size, gold }: { p: LineupPlayer; team: MvpTeam; size: number; gold?: boolean }) {
  const { c } = useTheme();
  const n = Math.round(size * 0.46);
  return (
    <View>
      <TeamBadge name={team.name} logo={team.logo} size={size} />
      {p.number != null ? (
        <View style={{ position: 'absolute', right: -6, bottom: -6, minWidth: n, height: n, paddingHorizontal: 3, borderRadius: Math.round(n * 0.3), overflow: 'hidden',
          alignItems: 'center', justifyContent: 'center', backgroundColor: gold ? palette.gold : c.cardAlt, borderWidth: 1.5, borderColor: gold ? palette.gold : c.lineStrong }}>
          <Mesh width={n} color={gold ? 'rgba(6,26,58,0.16)' : c.line} />
          <Txt w={900} display size={Math.round(n * 0.56)} color={gold ? palette.onGold : c.text} tnum>{p.number}</Txt>
        </View>
      ) : null}
    </View>
  );
}

/** Card del carosello: posizione per punti e cuore in alto, nome e cognome al centro, sotto stemma con il numero e punti */
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
          <Txt w={900} display size={15} color={first ? palette.onGold : 'muted'}>{rank}°</Txt>
        </View>
        <HeartButton {...vote} name={p.name} />
      </View>
      {/* al centro nome e cognome; altezza fissa perché le card del carosello restino allineate */}
      <PlayerName name={p.name} size={14} center style={{ minHeight: 44, justifyContent: 'center' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs, marginBottom: 6 }}>
        <Jersey p={p} team={team} size={34} gold={first || vote.selected} />
        <Txt w={700} size={12.5} color="accent" tnum>{pts} pt</Txt>
      </View>
    </Pressy>
  );
}

/** Card orizzontale di una giocatrice: stemma con il numero a sinistra, poi nome, squadra, punti e voti, cuore del voto a destra */
function VoteRow({ p, st, team, best, ...vote }: VoteProps & { p: LineupPlayer; st?: PlayerStats; team: MvpTeam; best: number }) {
  const { c } = useTheme();
  const leader = vote.votes > 0 && vote.votes === best;
  const pts = st?.points ?? 0;
  return (
    <Pressy onPress={vote.onPress} disabled={vote.busy} scaleTo={0.98} accessible={false}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingLeft: space.md, borderRadius: radius.md, borderWidth: vote.selected ? 1.5 : 1,
        borderColor: vote.selected ? palette.gold : c.line, backgroundColor: vote.selected ? 'rgba(255,213,3,0.08)' : c.card, overflow: 'hidden' }}>
      <Jersey p={p} team={team} size={40} gold={vote.selected} />
      <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <PlayerName name={p.name} size={13.5} style={{ flexShrink: 1 }} />
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
