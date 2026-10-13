import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PlayerRow, ROLE_LABEL } from '@/components/LineupPanel';
import { Pressy } from '@/components/Pressy';
import { TeamBadge } from '@/components/TeamBadge';
import { Txt } from '@/components/Txt';
import { useLiveLineup } from '@/store/LineupProvider';
import { useLive } from '@/store/LiveProvider';
import { STARTERS, type Lineup } from '@/store/useLineup';
import { FONT, palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { PlayerRole } from '@/types';

/** Inserimento della formazione avversaria della partita in diretta (admin, o chiunque nella demo) */
export default function FormazioneAvversaria() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const m = useLive().match;
  const lineup = useLiveLineup();
  const players = lineup.opp;
  const starters = players.filter((p) => p.zone != null).length;

  if (!m || !lineup.canEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Txt color="muted" center>{m ? 'Solo gli admin possono inserire la formazione avversaria.' : 'Nessuna partita in diretta.'}</Txt>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 14, gap: 16, paddingBottom: insets.bottom + 30, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TeamBadge name={m.opponent} logo={m.opponentLogo} size={36} />
          <View style={{ flex: 1 }}>
            <Txt w={700} size={15} numberOfLines={2}>{m.opponent}</Txt>
            <Txt w={600} size={12} color={starters === STARTERS ? 'accent' : 'muted'} tnum>
              {players.length} a referto · Starting Six {starters}/{STARTERS} · {players.some((p) => p.isLibero) ? 'libero scelto' : 'libero da scegliere'}
            </Txt>
          </View>
        </View>
        {lineup.error ? <Txt size={12.5} color="danger">{lineup.error}</Txt> : null}
        {players.length ? (
          <>
            <Txt size={12} color="muted">Tocca una giocatrice per metterla nello Starting Six (l'ordine dei tocchi dà le posizioni I-VI), tocca L per sceglierla come libero.</Txt>
            <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
              {players.map((p, i) => (
                <PlayerRow key={p.id} p={p} first={i === 0} editable onToggle={() => lineup.toggleStarter(p)} onLibero={() => lineup.toggleLibero(p)} onRemove={() => lineup.remove(p)} />
              ))}
            </View>
          </>
        ) : (
          <Txt size={13} color="muted">{lineup.loading ? 'Caricamento formazione…' : 'Nessuna giocatrice inserita: aggiungile qui sotto.'}</Txt>
        )}
      </Card>

      <AddOpponent onAdd={lineup.addOpponent} />
    </ScrollView>
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
    <Card style={{ gap: 10 }}>
      <Txt w={700} size={14}>Aggiungi giocatrice</Txt>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))} placeholder="N°" placeholderTextColor={c.muted}
          keyboardType="number-pad" accessibilityLabel="Numero di maglia" style={[input, { width: 60, textAlign: 'center' }]} />
        <TextInput value={name} onChangeText={setName} placeholder="Nome e cognome" placeholderTextColor={c.muted} autoCapitalize="words"
          returnKeyType="done" onSubmitEditing={submit} accessibilityLabel="Nome e cognome" style={[input, { flex: 1 }]} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(Object.keys(ROLE_LABEL) as PlayerRole[]).map((r) => {
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
    </Card>
  );
}
