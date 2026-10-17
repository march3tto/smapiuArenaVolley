import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ScoreChart } from './ScoreChart';
import { SegmentedControl } from './SegmentedControl';
import { Txt } from './Txt';
import { setTarget } from '@/lib/volley';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer, LiveEvent, PointAction, SetScore } from '@/types';

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

/** Statistiche della sola partita (mostrate nel voto MVP), contate dalle azioni registrate nella cronaca (non i totali di stagione) */
export function matchPlayerStats(events: LiveEvent[], lineup: LineupPlayer[]): PlayerStats[] {
  const by = new Map<string, PlayerStats>();
  for (const e of events) {
    const p = e.detail?.player;
    if (e.side !== 'us' || !e.detail || !p) continue;
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
  /** Set giocati o in corso */
  sets: number;
  current: number;
  totals: { us: number; opp: number };
}

export function StatsPanel({ events, names, sets, current, totals }: Props) {
  const { c } = useTheme();
  // set scelto a mano; a ogni nuovo set il grafico torna al set in corso
  const [pick, setPick] = useState<{ set: number; at: number } | null>(null);
  const set = pick && pick.at === current ? pick.set : current;
  const progress = useMemo(() => setProgress(events, set), [events, set]);
  const team = { us: teamBreakdown(events, 'us'), opp: teamBreakdown(events, 'opp') };

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Txt w={800} size={15}>Squadre</Txt>
        <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: c.fill }}>
            <Txt size={11} style={{ flex: 1 }}> </Txt>
            {(['us', 'opp'] as const).map((s) => <Txt key={s} w={600} size={11} color="muted" center numberOfLines={1} style={{ width: 96 }}>{names[s]}</Txt>)}
          </View>
          {([
            ['Punti totali', totals.us, totals.opp],
            ['Attacco', team.us.attacks, team.opp.attacks],
            ['Ace', team.us.aces, team.opp.aces],
            ['Muro', team.us.blocks, team.opp.blocks],
            ['Errori avversari', team.us.errors, team.opp.errors],
          ] as const).map(([label, a, b], i) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <Txt w={i === 0 ? 700 : 400} size={13} style={{ flex: 1 }}>{label}</Txt>
              <Txt w={i === 0 ? 800 : 600} size={13} center tnum display={false} style={{ width: 96 }}>{a}</Txt>
              <Txt w={i === 0 ? 800 : 600} size={13} center tnum display={false} style={{ width: 96 }}>{b}</Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.fill }}>
        <Txt w={800} size={15}>Andamento della partita</Txt>
        {sets > 1 ? (
          // dal 4° set le etichette non stanno in larghezza: il filtro diventa scorrevole
          <SegmentedControl stretch={sets <= 3} value={String(set)} onChange={(v) => setPick({ set: Number(v), at: current })}
            options={Array.from({ length: sets }, (_, i) => ({ value: String(i + 1), label: i === 4 ? 'Tie-break' : `${i + 1}° set` }))} />
        ) : null}
        <ScoreChart points={progress} names={names} target={setTarget(set)} />
      </View>
    </View>
  );
}
