import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle2, Image as ImageIcon, RotateCcw, TriangleAlert, X } from 'lucide-react-native';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { SegmentedControl } from './SegmentedControl';
import { Txt } from './Txt';
import { caricaTabellino, confermaTabellino, leggiTabellino, type TabellinoResult } from '@/lib/api';
import { CAMPI, controllaSquadra, type SquadraTabellino, type Tabellino } from '../../supabase/functions/_shared/tabellino.ts';
import { FONT, palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

type Step =
  | { kind: 'scegli' }
  | { kind: 'lettura' }
  | { kind: 'revisione'; id: string; data: Tabellino }
  | { kind: 'errore'; message: string; id: string | null; data: Tabellino | null }
  | { kind: 'fatto'; rows: number; notes: string[] };

const SETS = ['1', '2', '3', '4', '5', 'finale'] as const;
type SetKey = (typeof SETS)[number];

/** Tabellino senza l'esito dei controlli salvato dalla function: in revisione si ricalcola dal vivo */
function clean(t: Tabellino): Tabellino {
  const { tipo_foglio, numero_set, squadre } = t;
  return { tipo_foglio, numero_set, squadre: [...squadre].sort((a, b) => Number(b.lato === 'nostra') - Number(a.lato === 'nostra')) };
}

/**
 * Staff: foto del tabellino DataVolley (fotocamera o galleria), lettura AI, revisione con i controlli
 * ricalcolati a ogni modifica, conferma. Tutto dal telefono, durante la partita.
 */
export function TabellinoSheet({ matchId, suggestedSet, onClose, onSaved }: { matchId: string; suggestedSet: number | null; onClose: () => void; onSaved: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [set, setSet] = useState<SetKey>(suggestedSet ? (String(suggestedSet) as SetKey) : 'finale');
  const [step, setStep] = useState<Step>({ kind: 'scegli' });
  const [team, setTeam] = useState(0);
  const [saving, setSaving] = useState(false);

  const show = (r: TabellinoResult) => {
    setTeam(0);
    if (r.status === 'letto' && r.data) setStep({ kind: 'revisione', id: r.id, data: clean(r.data) });
    else setStep({ kind: 'errore', message: r.error ?? 'Lettura non riuscita', id: r.id, data: r.data ? clean(r.data) : null });
  };
  const fail = (e: unknown, id: string | null = null) =>
    setStep({ kind: 'errore', message: e instanceof Error ? e.message : 'Operazione non riuscita', id, data: null });

  const pick = async (from: 'camera' | 'galleria') => {
    try {
      if (from === 'camera' && Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return fail(new Error('Serve il permesso della fotocamera (Impostazioni del telefono).'));
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
      const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets[0]) return;
      setStep({ kind: 'lettura' });
      show(await caricaTabellino(matchId, res.assets[0].uri, set === 'finale' ? null : Number(set)));
    } catch (e) {
      fail(e);
    }
  };

  const retry = async (id: string) => {
    setStep({ kind: 'lettura' });
    try {
      show(await leggiTabellino(id));
    } catch (e) {
      fail(e, id);
    }
  };

  const confirm = async (id: string, data: Tabellino) => {
    setSaving(true);
    try {
      // l'avversaria si salva solo se i suoi numeri tornano; la nostra deve tornare (il pulsante è disattivato altrimenti)
      const squadre = data.squadre.filter((s) => !controllaSquadra(s, data.tipo_foglio, data.numero_set).length);
      const out = await confermaTabellino(id, { ...data, squadre });
      onSaved();
      setStep({ kind: 'fatto', rows: out.rows, notes: out.notes });
    } catch (e) {
      setStep({ kind: 'errore', message: e instanceof Error ? e.message : 'Conferma non riuscita', id, data });
    } finally {
      setSaving(false);
    }
  };

  const restart = () => setStep({ kind: 'scegli' });
  const label = set === 'finale' ? 'foglio finale' : `set ${set}`;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: space.md, paddingTop: Platform.OS === 'android' ? insets.top + space.md : space.md, gap: space.sm }}>
          <Txt w={800} size={18} style={{ flex: 1 }}>Tabellino</Txt>
          <IconButton label="Chiudi" onPress={onClose}><X size={18} color={c.text} /></IconButton>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.md, paddingBottom: insets.bottom + space.xl, gap: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
          {step.kind === 'scegli' ? (
            <>
              <Txt size={14} color="muted">Scegli il foglio e fotografalo dritto, con tutta la sezione Attacco e il riquadro “Punti vinti” a fuoco.</Txt>
              <SegmentedControl value={set} onChange={setSet}
                options={SETS.map((s) => ({ value: s, label: s === 'finale' ? 'Finale' : `Set ${s}` }))} />
              <Button variant="gold" size="lg" label="Scatta foto" icon={<Camera size={18} color={palette.onGold} />} onPress={() => pick('camera')} />
              <Button label="Dalla galleria" icon={<ImageIcon size={18} color={c.text} />} onPress={() => pick('galleria')} />
            </>
          ) : step.kind === 'lettura' ? (
            <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
              <ActivityIndicator color={palette.gold} size="large" />
              <Txt w={700}>Lettura del {label}…</Txt>
              <Txt size={13} color="muted" center>Caricamento della foto e lettura con l’AI: di solito bastano pochi secondi.</Txt>
            </View>
          ) : step.kind === 'revisione' ? (
            <Review data={step.data} team={team} onTeam={setTeam}
              onChange={(data) => setStep({ ...step, data })} saving={saving}
              onConfirm={() => confirm(step.id, step.data)} onRetake={restart} />
          ) : step.kind === 'errore' ? (
            <View style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: 16, backgroundColor: 'rgba(229,72,77,0.1)', borderWidth: 1, borderColor: c.danger }}>
                <TriangleAlert size={18} color={c.danger} />
                <Txt size={14} style={{ flex: 1 }}>{step.message}</Txt>
              </View>
              <Button variant="gold" label="Rifai foto" icon={<Camera size={16} color={palette.onGold} />} onPress={restart} />
              {step.id ? <Button label="Rileggi la stessa foto" icon={<RotateCcw size={16} color={c.text} />} onPress={() => retry(step.id!)} /> : null}
              {step.id && step.data?.squadre.length ? (
                <Button label="Correggi a mano" onPress={() => setStep({ kind: 'revisione', id: step.id!, data: step.data! })} />
              ) : null}
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
              <CheckCircle2 size={40} color={c.ok} />
              <Txt w={800} size={17}>Tabellino confermato</Txt>
              <Txt size={13} color="muted" center>{step.rows} righe salvate: la sezione Attacco della diretta è già aggiornata per tutti.</Txt>
              {step.notes.map((n) => <Txt key={n} size={13} color="muted" center>• {n}</Txt>)}
              <Button variant="gold" label="Fatto" onPress={onClose} style={{ alignSelf: 'stretch' }} />
              <Button label="Un altro foglio" onPress={restart} style={{ alignSelf: 'stretch' }} />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Anteprima modificabile: Tot/Err/Mur/Pt per giocatrice, totali e Punti vinti, con i controlli ricalcolati dal vivo */
function Review({ data, team, onTeam, onChange, onConfirm, onRetake, saving }: {
  data: Tabellino; team: number; onTeam: (i: number) => void;
  onChange: (t: Tabellino) => void; onConfirm: () => void; onRetake: () => void; saving: boolean;
}) {
  const { c } = useTheme();
  const s = data.squadre[Math.min(team, data.squadre.length - 1)];
  const errors = (x: SquadraTabellino) => controllaSquadra(x, data.tipo_foglio, data.numero_set);
  const ours = data.squadre.find((x) => x.lato === 'nostra');
  const ourOk = !!ours && !errors(ours).length;
  const update = (fn: (x: SquadraTabellino) => SquadraTabellino) =>
    onChange({ ...data, squadre: data.squadre.map((x) => (x === s ? fn(x) : x)) });
  const setKeys = data.tipo_foglio === 'set' && data.numero_set ? [String(data.numero_set)]
    : Object.keys(s?.punti_vinti_att_per_set ?? {}).sort();

  if (!s) return <Txt color="muted">Nessuna squadra letta: rifai la foto.</Txt>;
  const err = errors(s);
  return (
    <View style={{ gap: space.md }}>
      {data.squadre.length > 1 ? (
        <SegmentedControl stretch value={String(team)} onChange={(v) => onTeam(Number(v))}
          options={data.squadre.map((x, i) => ({ value: String(i), label: x.lato === 'nostra' ? 'Smapiù Arena' : x.nome || 'Avversaria', dot: errors(x).length ? c.danger : c.ok }))} />
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: 16,
        backgroundColor: err.length ? 'rgba(229,72,77,0.1)' : 'rgba(48,164,108,0.1)', borderWidth: 1, borderColor: err.length ? c.danger : c.ok }}>
        {err.length ? <TriangleAlert size={18} color={c.danger} /> : <CheckCircle2 size={18} color={c.ok} />}
        <View style={{ flex: 1, gap: 2 }}>
          {err.length ? err.map((e) => <Txt key={e} size={13.5}>{e}</Txt>) : <Txt w={600} size={13.5}>I numeri tornano</Txt>}
          {s.lato === 'avversaria' && err.length ? <Txt size={12} color="muted">L’avversaria non verrà salvata finché i numeri non tornano; la nostra sì.</Txt> : null}
        </View>
      </View>

      <View>
        <View style={{ flexDirection: 'row', paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Txt w={600} size={11} color="muted" style={{ flex: 1 }}>Giocatrice</Txt>
          {['Tot', 'Err', 'Mur', 'Pt'].map((h) => <Txt key={h} w={600} size={11} color="muted" center style={{ width: 48 }}>{h}</Txt>)}
        </View>
        {s.giocatrici.map((g, i) => (
          <View key={`${g.numero}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Txt size={13} numberOfLines={1} style={{ flex: 1 }}><Txt w={700} size={13} color="muted">{g.numero} </Txt>{g.nome}</Txt>
            {CAMPI.map((k) => (
              <NumCell key={k} value={g[k]} label={`${k} ${g.nome}`}
                onChange={(v) => update((x) => ({ ...x, giocatrici: x.giocatrici.map((y, j) => (j === i ? { ...y, [k]: v } : y)) }))} />
            ))}
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}>
          <Txt w={700} size={13} style={{ flex: 1 }}>Totali giocatori</Txt>
          {CAMPI.map((k) => (
            <NumCell key={k} value={s.totali[k]} label={`totale ${k}`} strong onChange={(v) => update((x) => ({ ...x, totali: { ...x.totali, [k]: v } }))} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
        <Txt w={600} size={12.5} color="muted">Punti vinti · Att</Txt>
        {setKeys.map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Txt size={12.5} color="muted">Set {k}</Txt>
            <NumCell value={s.punti_vinti_att_per_set[k] ?? 0} label={`punti vinti attacco set ${k}`}
              onChange={(v) => update((x) => ({ ...x, punti_vinti_att_per_set: { ...x.punti_vinti_att_per_set, [k]: v } }))} />
          </View>
        ))}
      </View>

      <Button variant="gold" size="lg" label="Conferma" loading={saving} disabled={!ourOk}
        sublabel={ourOk ? undefined : 'prima correggi i numeri della nostra squadra'} onPress={onConfirm} />
      <Button label="Rifai foto" icon={<Camera size={16} color={c.text} />} onPress={onRetake} disabled={saving} />
    </View>
  );
}

function NumCell({ value, onChange, label, strong }: { value: number; onChange: (v: number) => void; label: string; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <TextInput value={String(value)} keyboardType="number-pad" inputMode="numeric" selectTextOnFocus maxLength={3} accessibilityLabel={label}
      onChangeText={(t) => onChange(Math.max(0, parseInt(t.replace(/\D/g, ''), 10) || 0))}
      style={{ width: 44, marginHorizontal: 2, height: 34, borderRadius: 8, backgroundColor: c.fill, color: c.text, textAlign: 'center',
        fontFamily: FONT[strong ? 800 : 600], fontSize: 14, fontVariant: ['tabular-nums'] }} />
  );
}
