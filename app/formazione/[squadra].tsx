import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Plus, Save, UserPlus } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NumberTag, PlayerRow, ROLE_LABEL } from '@/components/LineupPanel';
import { Pressy } from '@/components/Pressy';
import { TeamBadge } from '@/components/TeamBadge';
import { Txt } from '@/components/Txt';
import { US } from '@/constants';
import { fetchTeamRoster } from '@/lib/api';
import { useData } from '@/store/DataProvider';
import { useLiveLineup } from '@/store/LineupProvider';
import { useLive } from '@/store/LiveProvider';
import { STARTERS, type Lineup } from '@/store/useLineup';
import { FONT, palette, radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer, Player, PlayerRole } from '@/types';

/**
 * Formazione di una squadra della partita in diretta (admin, o chiunque nella demo): /formazione/nostra o /formazione/avversaria.
 * Giocatrici a referto (capitana, libero, togli; tocco = selezione per correggere numero, nome e ruolo),
 * rosa della squadra da cui aggiungerle e inserimento a mano. Lo Starting Six si sceglie nel pannello Formazioni del live.
 */
export default function Formazione() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const m = useLive().match;
  const lineup = useLiveLineup();
  const { players: ourRoster } = useData();
  const team = useLocalSearchParams<{ squadra?: string }>().squadra === 'nostra' ? 'us' : 'opp';
  const players = team === 'us' ? lineup.us : lineup.opp;
  const starters = players.filter((p) => p.zone != null).length;
  // giocatrice selezionata: i suoi dati vanno nel form, che salva invece di aggiungere
  const [editId, setEditId] = useState<string | null>(null);
  const editing = players.find((p) => p.id === editId) ?? null;
  // con la tastiera aperta il contenuto si allunga della sua altezza: si scorre fino in fondo e la schermata resta dove la lasci
  const kb = useKeyboardHeight();
  const scroll = useRef<ScrollView>(null);
  const formY = useRef(0);
  // porta il form in alto, sopra la tastiera (dopo che la tastiera ha allungato il contenuto)
  const showForm = () => setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, formY.current - 12), animated: true }), 120);
  const select = (id: string | null) => {
    setEditId(id);
    if (id) showForm();
  };

  if (!m || !lineup.canEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Txt color="muted" center>{m ? 'Solo gli admin possono modificare le formazioni.' : 'Nessuna partita in diretta.'}</Txt>
      </View>
    );
  }
  const name = team === 'us' ? US : m.opponent;

  return (
    <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: c.bg }} keyboardShouldPersistTaps="handled" keyboardDismissMode="none"
      contentContainerStyle={{ padding: 14, gap: 16, paddingBottom: (kb || insets.bottom) + 30, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TeamBadge name={name} logo={team === 'us' ? null : m.opponentLogo} size={36} />
          <View style={{ flex: 1 }}>
            <Txt w={700} size={15} numberOfLines={2}>{name}</Txt>
            <Txt w={600} size={12} color={starters === STARTERS ? 'accent' : 'muted'} tnum>
              {players.length} a referto · Starting Six {starters}/{STARTERS} · {players.some((p) => p.isLibero) ? 'libero scelto' : 'libero da scegliere'} · {players.some((p) => p.isCaptain) ? 'capitana scelta' : 'capitana da scegliere'}
            </Txt>
          </View>
        </View>
        {lineup.error ? <Txt size={12.5} color="danger">{lineup.error}</Txt> : null}
        {players.length ? (
          <>
            <Txt size={12} color="muted">Tocca una giocatrice per correggerne numero, nome e ruolo nel form qui sotto. C sceglie la capitana, L il libero (solo con ruolo Libero), X la toglie dal referto.</Txt>
            <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
              {players.map((p, i) => (
                <PlayerRow key={p.id} p={p} first={i === 0} selected={p.id === editId} onPress={() => select(p.id === editId ? null : p.id)}
                  onLibero={() => lineup.toggleLibero(p)} onCaptain={() => lineup.toggleCaptain(p)} captainSet={players.some((x) => x.isCaptain)}
                  onRemove={() => {
                    if (p.id === editId) setEditId(null);
                    lineup.remove(p);
                  }} />
              ))}
            </View>
          </>
        ) : (
          <Txt size={13} color="muted">{lineup.loading ? 'Caricamento formazione…' : 'Nessuna giocatrice inserita: aggiungile qui sotto.'}</Txt>
        )}
      </Card>

      {/* key: selezionando un'altra giocatrice il form riparte dai suoi dati */}
      <View onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }}>
      <PlayerForm key={editing?.id ?? 'nuova'} editing={editing} onCancel={() => setEditId(null)} onFocus={showForm}
        onSubmit={(f) => {
          if (!editing) {
            lineup.addPlayers(team, f);
            return true;
          }
          const ok = lineup.update(editing, f);
          if (ok) setEditId(null);
          return ok;
        }} />
      </View>

      {team === 'us' ? (
        <TeamRoster name={name} roster={ourRoster} team={team} lineup={lineup} />
      ) : m.opponentTeamId ? (
        <OpponentRoster teamId={m.opponentTeamId} name={name} lineup={lineup} />
      ) : null}
    </ScrollView>
  );
}

/** Rosa avversaria dalla tabella giocatrici (squadra della partita) */
function OpponentRoster({ teamId, name, lineup }: { teamId: string; name: string; lineup: Lineup }) {
  const [roster, setRoster] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchTeamRoster(teamId)
      .then((r) => active && setRoster(r))
      .catch((err: unknown) => {
        console.warn('Rosa avversaria non caricata', err);
        if (active) setError('Rosa non disponibile: inserisci le giocatrici a mano.');
      });
    return () => {
      active = false;
    };
  }, [teamId]);
  return <TeamRoster name={name} roster={roster} error={error} team="opp" lineup={lineup} />;
}

/** Giocatrici della rosa non ancora a referto: le aggiunte restano collegate alla loro scheda */
function TeamRoster({ name, roster, error, team, lineup }: { name: string; roster: Player[] | null; error?: string | null; team: 'us' | 'opp'; lineup: Lineup }) {
  const { c } = useTheme();
  const added = new Set((team === 'us' ? lineup.us : lineup.opp).map((p) => p.playerId).filter(Boolean));
  const free = (roster ?? []).filter((p) => !added.has(p.id)).sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  const add = (list: Player[]) => lineup.addPlayers(team, list.map((p) => ({
    number: p.number ?? null, name: `${p.firstName} ${p.lastName}`.trim(), role: p.role, playerId: p.id, isCaptain: !!p.isCaptain,
  })));

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt w={700} size={14} style={{ flex: 1 }}>Rosa {name}</Txt>
        {free.length > 1 ? <Button size="sm" label="Aggiungi tutte" onPress={() => add(free)} icon={<UserPlus size={15} color={c.text} />} /> : null}
      </View>
      {error ? <Txt size={12.5} color="danger">{error}</Txt> : null}
      {!roster && !error ? <Txt size={13} color="muted">Caricamento rosa…</Txt> : null}
      {roster && !free.length ? (
        <Txt size={13} color="muted">{roster.length ? 'Tutte le giocatrici della rosa sono a referto.' : 'Rosa non ancora inserita: aggiungi le giocatrici a mano.'}</Txt>
      ) : null}
      {free.length ? (
        <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
          {free.map((p, i) => (
            <Pressy key={p.id} onPress={() => add([p])} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Metti a referto ${p.firstName} ${p.lastName}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <NumberTag value={p.number ?? null} variant="bench" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt w={600} size={13} numberOfLines={1}>{p.firstName} {p.lastName}</Txt>
                <Txt size={11} color="muted" numberOfLines={1}>{ROLE_LABEL[p.role]}{p.isCaptain ? ' · capitana' : ''}</Txt>
              </View>
              <Plus size={18} color={c.accent} />
            </Pressy>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** Form della giocatrice: vuoto aggiunge una giocatrice non in rosa, con una giocatrice selezionata ne salva le correzioni */
function PlayerForm({ editing, onSubmit, onCancel, onFocus }: {
  editing: LineupPlayer | null;
  onSubmit: (f: { number: number | null; name: string; role: PlayerRole | null }) => boolean;
  onCancel: () => void;
  /** Un campo prende il fuoco: la schermata porta il form sopra la tastiera */
  onFocus: () => void;
}) {
  const { c } = useTheme();
  const [number, setNumber] = useState(editing?.number != null ? String(editing.number) : '');
  const [name, setName] = useState(editing?.name ?? '');
  const [role, setRole] = useState<PlayerRole | null>(editing?.role ?? null);
  const input = { height: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.fill, paddingHorizontal: 12, fontFamily: FONT[500], fontSize: 15, color: c.text } as const;
  const submit = () => {
    if (!name.trim()) return;
    const n = parseInt(number, 10);
    if (!onSubmit({ number: Number.isFinite(n) ? n : null, name, role }) || editing) return;
    setNumber('');
    setName('');
    setRole(null);
  };
  return (
    <Card style={{ gap: 10, borderColor: editing ? 'rgba(255,213,3,0.5)' : undefined, borderWidth: editing ? 1.5 : undefined }}>
      <Txt w={700} size={14}>{editing ? `Modifica ${editing.name}` : 'Aggiungi giocatrice non in rosa'}</Txt>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={number} onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))} placeholder="N°" placeholderTextColor={c.muted}
          keyboardType="number-pad" accessibilityLabel="Numero di maglia" onFocus={onFocus} style={[input, { width: 60, textAlign: 'center' }]} />
        <TextInput value={name} onChangeText={setName} placeholder="Nome e cognome" placeholderTextColor={c.muted} autoCapitalize="words"
          returnKeyType="done" onSubmitEditing={submit} accessibilityLabel="Nome e cognome" onFocus={onFocus} style={[input, { flex: 1 }]} />
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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {editing ? <View style={{ flex: 1 }}><Button size="sm" label="Annulla" onPress={onCancel} /></View> : null}
        <View style={{ flex: 1 }}>
          <Button size="sm" variant="gold" label={editing ? 'Salva' : 'Aggiungi'} disabled={!name.trim()} onPress={submit}
            icon={editing ? <Save size={16} color={palette.onGold} /> : <Plus size={16} color={palette.onGold} />} />
        </View>
      </View>
    </Card>
  );
}

/** Altezza della tastiera aperta (0 se chiusa); su iOS dagli eventi "will", che arrivano insieme all'animazione */
function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setH(e.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return h;
}
