import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Crown, Plus, X } from 'lucide-react-native';
import { Button } from './Button';
import { Pressy } from './Pressy';
import { TeamBadge } from './TeamBadge';
import { Txt } from './Txt';
import { STARTERS, type Lineup } from '@/store/useLineup';
import { FONT, palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer, PlayerRole } from '@/types';

/** Sigle dei ruoli usate sul referto */
const ROLE_SHORT: Record<PlayerRole, string> = { palleggiatrice: 'P', schiacciatrice: 'S', centrale: 'C', opposto: 'O', libero: 'L' };
const ROLE_LABEL: Record<PlayerRole, string> = { palleggiatrice: 'Palleggiatrice', schiacciatrice: 'Schiacciatrice', centrale: 'Centrale', opposto: 'Opposto', libero: 'Libero' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/** Metà campo vista da dietro: rete in alto, prima linea 4-3-2, seconda linea 5-6-1 */
const ROWS = [[4, 3, 2], [5, 6, 1]];

const surname = (name: string) => name.split(' ').slice(-1)[0] ?? name;

interface TeamProps {
  name: string;
  logo?: string | number | null;
  players: LineupPlayer[];
  team: 'us' | 'opp';
}

/** Formazioni delle due squadre: Starting Six sul campo e giocatrici a referto */
export function LineupPanel({ lineup, teams }: { lineup: Lineup; teams: TeamProps[] }) {
  return (
    <View style={{ gap: 22 }}>
      {lineup.error ? <Txt size={12.5} color="danger">{lineup.error}</Txt> : null}
      {lineup.canEdit ? (
        <Txt size={12} color="muted">Tocca una giocatrice per metterla nello Starting Six: l'ordine dei tocchi dà le posizioni I-VI (I al servizio).</Txt>
      ) : null}
      {teams.map((t) => (
        <TeamLineup key={t.team} {...t} lineup={lineup} />
      ))}
    </View>
  );
}

function TeamLineup({ name, logo, players, team, lineup }: TeamProps & { lineup: Lineup }) {
  const { c } = useTheme();
  const starters = players.filter((p) => p.zone != null).length;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TeamBadge name={name} logo={logo} size={32} />
        <Txt w={700} size={15} numberOfLines={1} style={{ flex: 1 }}>{name}</Txt>
        <Txt w={600} size={12} color={starters === STARTERS ? 'accent' : 'muted'} tnum>Starting Six {starters}/{STARTERS}</Txt>
      </View>

      <Court players={players} />

      {players.length ? (
        <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
          {players.map((p, i) => (
            <PlayerRow key={p.id} p={p} first={i === 0} editable={lineup.canEdit} onToggle={() => lineup.toggleStarter(p)}
              onRemove={team === 'opp' && lineup.canEdit ? () => lineup.remove(p) : undefined} />
          ))}
        </View>
      ) : (
        <Txt size={13} color="muted">
          {lineup.loading ? 'Caricamento formazione…' : team === 'opp' ? 'Formazione avversaria non ancora inserita.' : 'Rosa non disponibile.'}
        </Txt>
      )}

      {team === 'opp' && lineup.canEdit ? <AddOpponent onAdd={lineup.addOpponent} /> : null}
    </View>
  );
}

function Court({ players }: { players: LineupPlayer[] }) {
  const line = 'rgba(255,255,255,0.9)';
  const at = (z: number) => players.find((p) => p.zone === z);
  return (
    <View accessibilityLabel="Starting Six in campo">
      <View style={{ height: 6, marginHorizontal: -6, borderRadius: 3, backgroundColor: palette.white, opacity: 0.85 }} />
      <View style={{ backgroundColor: palette.blueDeep, borderWidth: 2, borderTopWidth: 0, borderColor: line }}>
        {ROWS.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', height: r === 0 ? 74 : 96, borderTopWidth: r ? 2 : 0, borderTopColor: line }}>
            {row.map((z) => {
              const p = at(z);
              return (
                <View key={z} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 }}>
                  <Txt w={700} size={10} color="rgba(255,255,255,0.6)" style={{ position: 'absolute', top: 5, left: 7 }}>{ROMAN[z]}</Txt>
                  {p ? (
                    <>
                      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
                        <Txt w={800} size={15} color={palette.onGold} tnum display={false}>{p.number ?? '–'}</Txt>
                      </View>
                      <Txt w={600} size={11} color={palette.white} numberOfLines={1}>{surname(p.name)}</Txt>
                    </>
                  ) : (
                    <Txt size={18} color="rgba(255,255,255,0.35)">—</Txt>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function PlayerRow({ p, first, editable, onToggle, onRemove }: { p: LineupPlayer; first: boolean; editable: boolean; onToggle: () => void; onRemove?: () => void }) {
  const { c } = useTheme();
  const starter = p.zone != null;
  return (
    <Pressable onPress={editable ? onToggle : undefined} disabled={!editable} accessibilityRole={editable ? 'button' : undefined}
      accessibilityLabel={`${p.name}${starter ? `, titolare in posizione ${ROMAN[p.zone ?? 0]}` : ''}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: first ? 0 : 1, borderTopColor: c.line, backgroundColor: pressed ? c.fill2 : starter ? c.fill : undefined })}>
      <Txt w={800} size={14} tnum center display={false} color={starter ? 'accent' : 'text'} style={{ width: 26 }}>{p.number ?? '–'}</Txt>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Txt w={600} size={14} numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Txt>
          {p.isCaptain ? <Crown size={13} color={c.accent} accessibilityLabel="Capitana" /> : null}
        </View>
        {p.role ? <Txt size={12} color="muted">{ROLE_LABEL[p.role]}</Txt> : null}
      </View>
      {starter ? (
        <View style={{ minWidth: 30, height: 24, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
          <Txt w={800} size={11} color={palette.onGold} display={false}>{ROMAN[p.zone ?? 0]}</Txt>
        </View>
      ) : p.role === 'libero' ? (
        <Txt w={600} size={11} color="muted">Libero</Txt>
      ) : null}
      {onRemove ? (
        <Pressy onPress={onRemove} scaleTo={0.85} accessibilityRole="button" accessibilityLabel={`Togli ${p.name}`} style={{ padding: 4 }}>
          <X size={16} color={c.muted} />
        </Pressy>
      ) : null}
    </Pressable>
  );
}

function AddOpponent({ onAdd }: { onAdd: Lineup['addOpponent'] }) {
  const { c } = useTheme();
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole | null>(null);
  const input = { height: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.fill, paddingHorizontal: 12, fontFamily: FONT[500], fontSize: 15, color: c.text } as const;
  const submit = () => {
    if (!name.trim()) return;
    const n = parseInt(number, 10);
    onAdd({ number: Number.isFinite(n) ? n : null, name, role });
    setNumber('');
    setName('');
    setRole(null);
  };
  return (
    <View style={{ gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.fill }}>
      <Txt w={700} size={13}>Aggiungi giocatrice avversaria</Txt>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))} placeholder="N°" placeholderTextColor={c.muted}
          keyboardType="number-pad" accessibilityLabel="Numero di maglia" style={[input, { width: 60, textAlign: 'center' }]} />
        <TextInput value={name} onChangeText={setName} placeholder="Nome e cognome" placeholderTextColor={c.muted} autoCapitalize="words"
          returnKeyType="done" onSubmitEditing={submit} accessibilityLabel="Nome e cognome" style={[input, { flex: 1 }]} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(Object.keys(ROLE_SHORT) as PlayerRole[]).map((r) => {
          const on = role === r;
          return (
            <Pressy key={r} onPress={() => setRole(on ? null : r)} scaleTo={0.92} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ paddingHorizontal: 10, height: 30, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: on ? palette.gold : c.fill2 }}>
              <Txt w={600} size={12} color={on ? palette.onGold : 'muted'}>{ROLE_LABEL[r]}</Txt>
            </Pressy>
          );
        })}
      </View>
      <Button size="sm" variant="gold" label="Aggiungi" disabled={!name.trim()} onPress={submit} icon={<Plus size={16} color={palette.onGold} />} />
    </View>
  );
}
