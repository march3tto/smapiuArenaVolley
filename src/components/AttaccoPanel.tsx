import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Camera } from 'lucide-react-native';
import { Button } from './Button';
import { SegmentedControl } from './SegmentedControl';
import { TabellinoSheet } from './TabellinoSheet';
import { Txt } from './Txt';
import { fetchAttacco, resubscribable, subscribeAttacco, type AttackRow } from '@/lib/api';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  matchId: string;
  names: { us: string; opp: string };
  /** staff/admin: pulsante per fotografare il tabellino */
  canUpload: boolean;
  /** set proposto per la foto: l'ultimo chiuso, null = foglio finale */
  suggestedSet: number | null;
  /** cambia a ogni pull-to-refresh / ritorno dal background: si rileggono le statistiche */
  reloadKey: number;
}

interface Line {
  number: number;
  name: string;
  points: number;
  attempts: number;
  perc: number | null;
}

/** Somme per giocatrice delle righe scelte (partita intera o un set), ordinate per punti */
function lines(rows: AttackRow[]): Line[] {
  const by = new Map<number, Line>();
  for (const r of rows) {
    const l = by.get(r.number) ?? { number: r.number, name: r.name, points: 0, attempts: 0, perc: null };
    l.points += r.points;
    l.attempts += r.attempts;
    if (!l.name && r.name) l.name = r.name;
    by.set(r.number, l);
  }
  return [...by.values()]
    .map((l) => ({ ...l, perc: l.attempts ? Math.round((100 * l.points) / l.attempts) : null }))
    .filter((l) => l.attempts > 0 || l.points > 0)
    .sort((a, b) => b.points - a.points || (b.perc ?? 0) - (a.perc ?? 0) || a.number - b.number);
}

/**
 * Punti in attacco per giocatrice dal tabellino DataVolley (fonte ufficiale), separati dai punti inseriti a mano
 * durante la diretta. Per tutti; lo staff da qui fotografa i fogli.
 */
export function AttaccoPanel({ matchId, names, canUpload, suggestedSet, reloadKey }: Props) {
  const { c } = useTheme();
  const [rows, setRows] = useState<AttackRow[]>([]);
  const [team, setTeam] = useState<'us' | 'opp'>('us');
  const [set, setSet] = useState('all');
  const [sheet, setSheet] = useState(false);

  const load = useCallback(() => {
    fetchAttacco(matchId).then(setRows).catch((e: unknown) => console.warn('Attacco non letto', e));
  }, [matchId]);
  // al cambio di reloadKey (pull-to-refresh) si rilegge e si riapre il canale se è caduto
  useEffect(() => {
    load();
    const sub = resubscribable(() => subscribeAttacco(matchId, load));
    return () => sub.close();
  }, [matchId, load, reloadKey]);

  const sets = useMemo(() => [...new Set(rows.map((r) => r.set))].sort((a, b) => a - b), [rows]);
  const shownSet = set !== 'all' && sets.includes(Number(set)) ? Number(set) : null;
  const hasOpp = rows.some((r) => r.team === 'opp');
  const shownTeam = hasOpp ? team : 'us';
  const list = lines(rows.filter((r) => r.team === shownTeam && (shownSet == null || r.set === shownSet)));
  const derived = rows.some((r) => r.team === shownTeam && r.derived && (shownSet == null || r.set === shownSet));
  const totals = list.reduce((a, l) => ({ points: a.points + l.points, attempts: a.attempts + l.attempts }), { points: 0, attempts: 0 });

  if (!rows.length && !canUpload) return null;

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>Attacco</Txt>
          <Txt size={12} color="muted">Dal tabellino ufficiale DataVolley</Txt>
        </View>
        {canUpload ? (
          <Button size="sm" label="Tabellino" icon={<Camera size={15} color={c.text} />} onPress={() => setSheet(true)}
            accessibilityLabel="Fotografa il tabellino" />
        ) : null}
      </View>

      {rows.length ? (
        <>
          {hasOpp ? (
            <SegmentedControl stretch value={shownTeam} onChange={setTeam}
              options={[{ value: 'us', label: names.us, dot: palette.gold }, { value: 'opp', label: names.opp }]} />
          ) : null}
          {sets.length > 1 ? (
            <SegmentedControl stretch={sets.length <= 3} value={shownSet ? String(shownSet) : 'all'} onChange={setSet}
              options={[{ value: 'all', label: 'Partita' }, ...sets.map((s) => ({ value: String(s), label: `Set ${s}` }))]} />
          ) : null}

          <View accessibilityRole="list">
            <View style={{ flexDirection: 'row', paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Txt w={600} size={11} color="muted" style={{ flex: 1 }}>Giocatrice</Txt>
              {['Pt', 'Tot', 'Pt%'].map((h) => (
                <Txt key={h} w={600} size={11} color="muted" center style={{ width: 46 }}>{h}</Txt>
              ))}
            </View>
            {list.map((l, i) => {
              const top = shownTeam === 'us' && i === 0 && l.points > 0;
              return (
                <View key={l.number} accessible accessibilityLabel={`${l.number} ${l.name}: ${l.points} punti su ${l.attempts} attacchi${l.perc != null ? `, ${l.perc} per cento` : ''}`}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.line,
                    backgroundColor: shownTeam === 'us' && i < 3 ? 'rgba(255,213,3,0.06)' : undefined }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Txt w={700} size={12} color="muted" tnum style={{ width: 22, textAlign: 'right' }}>{l.number}</Txt>
                    <Txt w={top ? 800 : 600} size={13.5} numberOfLines={1} style={{ flexShrink: 1 }}>{l.name || '—'}</Txt>
                  </View>
                  <Txt w={800} size={14} center tnum color={shownTeam === 'us' ? 'accent' : 'text'} style={{ width: 46 }}>{l.points}</Txt>
                  <Txt size={13} center tnum style={{ width: 46 }}>{l.attempts}</Txt>
                  <Txt size={13} center tnum color="muted" style={{ width: 46 }}>{l.perc != null ? `${l.perc}%` : '—'}</Txt>
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm }}>
              <Txt w={700} size={12.5} style={{ flex: 1, paddingLeft: 30 }}>Totale</Txt>
              <Txt w={800} size={13} center tnum style={{ width: 46 }}>{totals.points}</Txt>
              <Txt w={700} size={13} center tnum style={{ width: 46 }}>{totals.attempts}</Txt>
              <Txt w={700} size={13} center tnum color="muted" style={{ width: 46 }}>
                {totals.attempts ? `${Math.round((100 * totals.points) / totals.attempts)}%` : '—'}
              </Txt>
            </View>
          </View>
          {derived ? <Txt size={11.5} color="muted">Alcuni set sono ricavati dal tabellino finale (finale meno i set fotografati).</Txt> : null}
        </>
      ) : (
        <Txt size={13} color="muted">Nessun tabellino ancora. Fotografa il foglio a fine set: i punti in attacco compaiono qui per tutti.</Txt>
      )}

      {sheet ? <TabellinoSheet matchId={matchId} suggestedSet={suggestedSet} onClose={() => setSheet(false)} onSaved={load} /> : null}
    </View>
  );
}
