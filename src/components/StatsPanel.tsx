import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ScoreChart } from './ScoreChart';
import { SegmentedControl } from './SegmentedControl';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { setTarget } from '@/lib/volley';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImgSrc, LineupPlayer, LiveEvent, PointAction, SetScore } from '@/types';

const ATTACKS: PointAction[] = ['schiacciata', 'pipe', 'primo_tempo', 'pallonetto'];

export interface PlayerStats {
  key: string;
  name: string;
  number: number | null;
  points: number;
  attacks: number;
  aces: number;
  blocks: number;
}

/** Statistiche della sola partita di una squadra (mostrate nel voto MVP), contate dalle azioni registrate nella cronaca (non i totali di stagione) */
export function matchPlayerStats(events: LiveEvent[], lineup: LineupPlayer[], side: 'us' | 'opp' = 'us'): PlayerStats[] {
  const by = new Map<string, PlayerStats>();
  for (const e of events) {
    const p = e.detail?.player;
    if (e.side !== side || !e.detail || !p) continue;
    const row = lineup.find((l) => l.id === p.lineupId || (!!p.playerId && l.playerId === p.playerId));
    const key = p.playerId || p.lineupId || p.name;
    const s = by.get(key) ?? { key, name: row?.name ?? p.name, number: row?.number ?? p.number, points: 0, attacks: 0, aces: 0, blocks: 0 };
    s.points += 1;
    if (ATTACKS.includes(e.detail.action)) s.attacks += 1;
    if (e.detail.action === 'ace') s.aces += 1;
    if (e.detail.action === 'muro') s.blocks += 1;
    by.set(key, s);
  }
  return [...by.values()].sort((a, b) => b.points - a.points || (a.number ?? 99) - (b.number ?? 99));
}

/** Punteggio di un set dopo ogni punto giocato (indice 0 = 0–0), dalla cronaca */
export function setProgress(events: LiveEvent[], set: number): SetScore[] {
  const out: SetScore[] = [{ our: 0, opp: 0 }];
  // dal più vecchio; cambio campo e fine set ripetono il punteggio e si saltano
  for (const e of [...events].reverse()) {
    if (e.set !== set) continue;
    const total = e.our + e.opp;
    if (total < out.length) continue;
    // punti mancanti nella cronaca: si ripete l'ultimo punteggio noto fino al successivo
    while (out.length < total) out.push(out[out.length - 1]);
    out.push({ our: e.our, opp: e.opp });
  }
  return out;
}

/** Punti per fondamentale di una squadra (solo i punti registrati con l'azione) */
function teamBreakdown(events: LiveEvent[], side: 'us' | 'opp') {
  const d = events.filter((e) => e.side === side && e.detail).map((e) => e.detail!.action);
  return {
    attacks: d.filter((a) => ATTACKS.includes(a)).length,
    aces: d.filter((a) => a === 'ace').length,
    blocks: d.filter((a) => a === 'muro').length,
    errors: d.filter((a) => a === 'errore_avversario').length,
  };
}

interface Props {
  events: LiveEvent[];
  names: { us: string; opp: string };
  logos?: { us?: ImgSrc | null; opp?: ImgSrc | null };
  /** Set giocati o in corso */
  sets: number;
  current: number;
  totals: { us: number; opp: number };
  /** Squadra di casa: a sinistra nelle statistiche, come nel tabellone */
  home: 'us' | 'opp';
}

/** Andamento del set in alto, sotto i punti per fondamentale: casa a sinistra, voce al centro, ospite a destra */
export function StatsPanel({ events, names, logos, sets, current, totals, home }: Props) {
  const { c } = useTheme();
  // set scelto a mano; a ogni nuovo set il grafico torna al set in corso
  const [pick, setPick] = useState<{ set: number; at: number } | null>(null);
  const set = pick && pick.at === current ? pick.set : current;
  const progress = useMemo(() => setProgress(events, set), [events, set]);
  const team = { us: teamBreakdown(events, 'us'), opp: teamBreakdown(events, 'opp') };
  const left = home;
  const right = home === 'us' ? 'opp' : 'us';
  const rows: [string, Record<'us' | 'opp', number>][] = [
    ['Punti totali', totals],
    ['Attacco', { us: team.us.attacks, opp: team.opp.attacks }],
    ['Ace', { us: team.us.aces, opp: team.opp.aces }],
    ['Muro', { us: team.us.blocks, opp: team.opp.blocks }],
    ['Errori avversari', { us: team.us.errors, opp: team.opp.errors }],
  ];

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.fill }}>
        <Txt w={800} size={15}>Andamento della partita</Txt>
        {sets > 1 ? (
          // dal 4° set le etichette non stanno in larghezza: il filtro diventa scorrevole
          <SegmentedControl stretch={sets <= 3} value={String(set)} onChange={(v) => setPick({ set: Number(v), at: current })}
            options={Array.from({ length: sets }, (_, i) => ({ value: String(i + 1), label: i === 4 ? 'Tie-break' : `${i + 1}° set` }))} />
        ) : null}
        <ScoreChart points={progress} names={names} target={setTarget(set)} />
      </View>
      <View style={{ gap: 4 }}>
        <Txt w={800} size={15}>Punti</Txt>
        {/* ogni squadra sopra la sua colonna di dati, come nelle formazioni */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 8 }}>
          <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
            <TeamBadge name={names[left]} logo={logos?.[left]} size={28} />
            <Txt w={700} size={12} numberOfLines={2}>{names[left]}</Txt>
          </View>
          <View style={{ flex: 1.2 }} />
          <View style={{ flex: 1, gap: 4, alignItems: 'flex-end' }}>
            <TeamBadge name={names[right]} logo={logos?.[right]} size={28} />
            <Txt w={700} size={12} numberOfLines={2} style={{ textAlign: 'right' }}>{names[right]}</Txt>
          </View>
        </View>
        {rows.map(([label, v], i) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 }}>
            <Txt w={i === 0 ? 800 : 600} size={i === 0 ? 17 : 15} tnum display={false} style={{ flex: 1 }}>{v[left]}</Txt>
            <Txt w={i === 0 ? 700 : 500} size={13} color={i === 0 ? 'text' : 'muted'} center style={{ flex: 1.2 }}>{label}</Txt>
            <Txt w={i === 0 ? 800 : 600} size={i === 0 ? 17 : 15} tnum display={false} style={{ flex: 1, textAlign: 'right' }}>{v[right]}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
