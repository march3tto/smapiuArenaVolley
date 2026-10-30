import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { Check, Crown, Flame, Info, Lock, Search, Star, Trophy, Undo2, Users, X } from 'lucide-react-native';
import { Button } from './Button';
import { NumberTag, ROLE_LABEL } from './LineupPanel';
import { Pressy } from './Pressy';
import { SegmentedControl } from './SegmentedControl';
import { matchPlayerStats, type PlayerStats } from './StatsPanel';
import { TeamBadge } from './TeamBadge';
import { useToast } from './Toast';
import { Txt } from './Txt';
import { fetchMvpVotes, unvoteMvp, voteMvp } from '@/lib/api';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { FONT, palette, radius, space } from '@/theme/colors';
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
 * Voto MVP tra le giocatrici di entrambe le squadre, con i punti della partita: in alto la propria MVP (o l'invito ad accedere), poi il podio delle tre migliori
 * e l'elenco filtrabile per squadra e ricerca. Senza accesso tutto resta visibile ma bloccato: il tocco spiega come votare.
 * Un voto per utente registrato, modificabile; nella partita demo resta solo sul dispositivo.
 * awayMatch: in trasferta il pannello si vede (giocatrici e punti) ma il voto è disattivato.
 * onLeave: chiude il contenitore (es. il pannello dal basso della diretta) prima di andare all'accesso.
 * showTitle: false dove il contenitore ha già il suo titolo (pannello dal basso).
 */
export function MvpPanel({ match, awayMatch, teams, events, finished, onLeave, showTitle = true }: { match: Match; awayMatch?: boolean; teams: MvpTeam[]; events: LiveEvent[]; finished: boolean; onLeave?: () => void; showTitle?: boolean }) {
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
    return { votes: counts[id] ?? 0, selected: mine === id, busy: saving === id, locked: !canVote, onPress: canVote ? () => vote(id) : warnLocked };
  };
  // podio: 2° a sinistra, 1° al centro, 3° a destra
  const podium = [top[1], top[0], top[2]].map((r, i) => (r ? { r, rank: [2, 1, 3][i] } : null)).filter((x) => !!x);

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.sm }}>
        {showTitle ? <Txt w={900} size={24}>Vota la tua MVP</Txt> : null}
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, height: 30, borderRadius: radius.pill, backgroundColor: c.fill2 }}>
          <Users size={14} color={c.accent} />
          <Txt w={600} size={12.5} tnum>
            {total ? `${total} ${total === 1 ? 'voto dei tifosi finora' : 'voti dei tifosi finora'}` : 'Ancora nessun voto'}
          </Txt>
        </View>
        {canVote ? (
          <Txt size={12.5} color="muted">
            {finished ? 'Chi è stata la migliore in campo? ' : 'Chi è la migliore in campo? '}
            Un voto per partita: tocca un&apos;altra giocatrice per cambiarlo, la stessa per toglierlo.
          </Txt>
        ) : null}
      </View>

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
      ) : voted ? (
        <HeroCard r={voted} votes={counts[mine!] ?? 0} busy={saving === mine} onRemove={() => vote(mine!)} />
      ) : (
        <View style={{ alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,213,3,0.55)', backgroundColor: c.fill }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,213,3,0.14)' }}>
            <Crown size={22} color={palette.gold} />
          </View>
          <Txt w={700} size={14} center>Nessun voto ancora</Txt>
          <Txt size={12.5} color="muted" center>Scegli qui sotto la migliore in campo: sarà la tua MVP.</Txt>
        </View>
      )}

      {podium.length ? (
        <View style={{ gap: space.sm }}>
          <SectionLabel icon={<Flame size={14} color={c.accent} />} label="Top performer" />
          {/* il 1° è più alto e più largo, 2° e 3° partono più in basso */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
            {podium.map(({ r, rank }) => <PodiumCard key={r.p.id} r={r} rank={rank} {...rowProps(r)} />)}
          </View>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionLabel icon={<Users size={14} color={c.accent} />} label="Tutte le giocatrici" />
        {/* senza accesso filtri e ricerca sono in sola lettura: il tocco spiega perché */}
        <Pressable onPress={guest ? warnLocked : undefined} disabled={!guest} accessibilityState={{ disabled: guest }}>
          <View pointerEvents={guest ? 'none' : 'auto'} style={{ gap: space.sm, opacity: guest ? 0.6 : 1 }}>
            <SegmentedControl value={filter} onChange={setFilter}
              options={[{ value: 'all' as Filter, label: 'Tutte' }, ...columns.map((t) => ({ value: t.side as Filter, label: t.name, icon: <TeamBadge name={t.name} logo={t.logo} size={20} /> }))]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line }}>
              <Search size={16} color={c.muted} strokeWidth={2.25} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Cerca per nome o numero" placeholderTextColor={c.muted} editable={!guest}
                autoCorrect={false} returnKeyType="search" accessibilityLabel="Cerca una giocatrice per nome o numero di maglia"
                style={{ flex: 1, fontFamily: FONT[500], fontSize: 14, color: c.text, paddingVertical: 0 }} />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancella la ricerca">
                  <X size={16} color={c.muted} />
                </Pressable>
              ) : null}
            </View>
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

/** La giocatrice votata: card con bordo oro, squadra, statistiche della partita, tifosi che la sostengono e voto da togliere */
function HeroCard({ r, votes, busy, onRemove }: { r: Ranked; votes: number; busy: boolean; onRemove: () => void }) {
  const { c } = useTheme();
  const { p, st, team } = r;
  const stats = [{ label: 'Punti', value: st?.points ?? 0 }, { label: 'Muri', value: st?.blocks ?? 0 }, { label: 'Ace', value: st?.aces ?? 0 }];
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1.5, borderColor: palette.gold, backgroundColor: c.card, padding: space.md, gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View>
          <NumberTag value={p.number} variant="starter" size={56} />
          <View style={{ position: 'absolute', right: -8, bottom: -8 }}>
            <TeamBadge name={team.name} logo={team.logo} size={26} />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, height: 22, borderRadius: radius.pill, backgroundColor: palette.gold }}>
            <Crown size={12} color={palette.onGold} strokeWidth={2.5} />
            <Txt w={800} size={11} color={palette.onGold}>LA TUA MVP</Txt>
          </View>
          <Txt w={800} size={20} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>{p.name}</Txt>
          <Txt size={12} color="muted" numberOfLines={1}>{team.name}{p.role ? ` · ${ROLE_LABEL[p.role]}` : ''}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {stats.map((s) => (
          <View key={s.label} style={{ flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.sm, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
            <Txt w={800} size={22} tnum>{s.value}</Txt>
            <Txt size={11} color="muted">{s.label}</Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Users size={14} color={c.muted} />
        <Txt size={12.5} color="muted" tnum style={{ flex: 1 }}>
          {votes} {votes === 1 ? 'tifoso la sostiene' : 'tifosi la sostengono'}
        </Txt>
        <Pressy onPress={onRemove} disabled={busy} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={`Togli il voto a ${p.name}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, height: 30, borderRadius: radius.pill, borderWidth: 1, borderColor: c.lineStrong }}>
          <Undo2 size={13} color={c.text} />
          <Txt w={600} size={12}>Togli voto</Txt>
        </Pressy>
      </View>
    </View>
  );
}

type VoteProps = { votes: number; selected: boolean; locked: boolean; busy: boolean; onPress: () => void };

/** Pulsante di voto: oro per votare, contorno oro se è il proprio voto, attenuato con il lucchetto se non si può votare */
function VoteButton({ selected, locked, busy, onPress, label, name, votes, stretch }: Omit<VoteProps, 'votes'> & { votes: number; label: string; name: string; stretch?: boolean }) {
  const { c } = useTheme();
  const fg = selected ? c.accent : palette.onGold;
  return (
    <Pressy onPress={onPress} disabled={busy} scaleTo={locked ? 1 : 0.94}
      accessibilityRole="button" accessibilityState={{ selected, disabled: locked, busy }}
      accessibilityLabel={locked ? `Voto bloccato per ${name}` : `${selected ? 'Togli il voto a' : 'Vota MVP'} ${name}, ${votes} ${votes === 1 ? 'voto' : 'voti'}`}
      style={{ alignSelf: stretch ? 'stretch' : 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, height: 32, paddingHorizontal: space.md,
        borderRadius: radius.pill, borderWidth: 1.5, borderColor: palette.gold, backgroundColor: selected ? 'transparent' : palette.gold, opacity: locked ? 0.5 : 1 }}>
      {locked ? <Lock size={13} color={fg} strokeWidth={2.5} />
        : selected ? <Check size={14} color={fg} strokeWidth={3} />
        : <Star size={13} color={fg} fill={fg} />}
      <Txt w={800} display size={15} color={fg} style={{ letterSpacing: 0.6 }}>{selected && !locked ? 'Votata' : label}</Txt>
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

/** Posto sul podio: il 1° è più grande, con bordo oro, corona e badge in evidenza; 2° e 3° partono più in basso */
function PodiumCard({ r, rank, votes, selected, locked, busy, onPress }: VoteProps & { r: Ranked; rank: number }) {
  const { c } = useTheme();
  const { p, st, team } = r;
  const first = rank === 1;
  const pts = st?.points ?? 0;
  return (
    <Pressy onPress={onPress} disabled={busy} scaleTo={0.97} accessible={false}
      style={{ flex: first ? 1.2 : 1, minWidth: 0, marginTop: first ? 0 : space.lg, borderRadius: radius.md, borderWidth: first || selected ? 1.5 : 1,
        borderColor: first || selected ? palette.gold : c.line, backgroundColor: c.card, padding: space.sm, paddingTop: space.md, gap: space.sm, alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, height: 22,
        borderRadius: radius.pill, backgroundColor: first ? palette.gold : c.fill2 }}>
        {first ? <Crown size={12} color={palette.onGold} strokeWidth={2.5} /> : null}
        <Txt w={900} display size={15} color={first ? palette.onGold : 'muted'}>{rank}°</Txt>
      </View>
      <View style={{ marginTop: space.lg }}>
        <Jersey p={p} team={team} size={first ? 56 : 44} gold={first} />
      </View>
      <Txt w={700} size={first ? 13.5 : 12.5} center numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={{ minHeight: 32 }}>{p.name}</Txt>
      <View style={{ flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', gap: space.md }}>
        <Stat value={pts} label={pts === 1 ? 'punto' : 'punti'} big={first} />
        <Stat value={st?.attacks ?? 0} label="att." big={first} />
      </View>
      <VoteButton selected={selected} locked={locked} busy={busy} onPress={onPress} votes={votes} name={p.name} label={first ? 'Vota MVP' : 'Vota'} stretch />
    </Pressy>
  );
}

function Stat({ value, label, big }: { value: number; label: string; big?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt w={900} display size={big ? 24 : 20} color="accent" tnum>{value}</Txt>
      <Txt size={10.5} color="muted">{label}</Txt>
    </View>
  );
}

/** Card orizzontale di una giocatrice: numero in evidenza, nome, squadra, punti e voti, pulsante di voto a destra */
function VoteRow({ p, st, team, best, votes, selected, locked, busy, onPress }: VoteProps & { p: LineupPlayer; st?: PlayerStats; team: MvpTeam; best: number }) {
  const { c } = useTheme();
  const leader = votes > 0 && votes === best;
  const pts = st?.points ?? 0;
  return (
    <Pressy onPress={onPress} disabled={busy} scaleTo={0.98} accessible={false}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingLeft: space.md, borderRadius: radius.md, borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? palette.gold : c.line, backgroundColor: selected ? 'rgba(255,213,3,0.08)' : c.card, overflow: 'hidden' }}>
      {/* filo del colore della squadra */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: teamColor(team.side) }} />
      <Jersey p={p} team={team} size={40} gold={selected} />
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
          <Txt w={700} size={11.5} color="accent" tnum>{pts}</Txt> {pts === 1 ? 'punto' : 'punti'} · {votes} {votes === 1 ? 'voto' : 'voti'}
        </Txt>
      </View>
      <VoteButton selected={selected} locked={locked} busy={busy} onPress={onPress} votes={votes} name={p.name} label="Vota" />
    </Pressy>
  );
}
