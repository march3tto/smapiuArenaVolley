import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftRight, ChevronLeft, RefreshCw, Sparkles, Timer, X } from 'lucide-react-native';
import { Button } from './Button';
import { Court } from './LineupPanel';
import { NoteFlow, type NoteKind } from './NotePicker';
import { Field, PhraseList } from './PhraseList';
import { Pressy } from './Pressy';
import { SegmentedControl } from './SegmentedControl';
import { Txt } from './Txt';
import { US } from '@/constants';
import { suggestCommentary } from '@/lib/api';
import { setWinner } from '@/lib/volley';
import { ACTION_ROLE, PHASE_LABEL, POINT_ACTIONS, ZONE_LABEL, actionLabel, detailLine, type PointAction, type PointDetail, type PointPhase } from '@/store/LiveProvider';
import { palette, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer } from '@/types';

/** Rettangolo del pulsante + in coordinate di finestra: il riquadro si apre da lì */
export interface Anchor {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GUTTER = space.md;

/**
 * Riquadro del punto in due passi.
 * 1. Azione: giocatrice (facoltativa, la posizione è quella che occupa in campo), attacco o difesa, tipo di azione.
 * 2. Cronaca: frasi proposte dall'AI (se disponibile) o predefinita; si sceglie e si assegna il punto.
 * Chi conquista il punto è deciso qui (side), l'AI scrive solo la frase.
 * commentOnly: punteggio automatico, l'azione va solo in cronaca (nessun punto, nemmeno alla giocatrice).
 */
export function PointPicker({ anchor, side, team, names, players, rotation = 0, score, ai, commentOnly = false, onScore, onClose, notes = [], onNote }: {
  anchor: Anchor;
  side: 'us' | 'opp';
  team: string;
  /** Nomi delle due squadre per la cronaca */
  names: { us: string; opp: string };
  /** Formazione con le posizioni attuali (Starting Six già ruotato) */
  players: LineupPlayer[];
  /** Rotazioni fatte nel set in corso */
  rotation?: number;
  /** Set e punteggio prima del punto */
  score: { set: number; our: number; opp: number };
  /** Frasi dall'AI (solo staff/admin con Supabase) */
  ai: boolean;
  commentOnly?: boolean;
  onScore: (detail?: PointDetail) => void;
  onClose: () => void;
  /** Timeout e cambio della squadra, senza punto: righe di cronaca col punteggio attuale (sub: chi entra e chi esce) */
  notes?: NoteKind[];
  onNote?: (kind: NoteKind, text: string, sub?: { in: LineupPlayer; out: LineupPlayer }) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [step, setStep] = useState<'azione' | 'cronaca'>('azione');
  // timeout o cambio aperti da qui: stesso riquadro, senza punto
  const [note, setNote] = useState<NoteKind | null>(null);
  const [picked, setPicked] = useState<LineupPlayer | null>(null);
  const [phase, setPhase] = useState<PointPhase>('attacco');
  const [action, setAction] = useState<PointAction | null>(null);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [chosen, setChosen] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const request = useRef(0);
  const t = useRef(new Animated.Value(0)).current;
  const starters = players.filter((p) => p.zone != null);
  // la posizione è quella della giocatrice scelta sul campo
  const zone = picked?.zone ?? null;

  const width = Math.min(360, win.width - GUTTER * 2);
  const maxH = win.height - insets.top - insets.bottom - GUTTER * 2;
  const ax = anchor.x + anchor.w / 2;
  const ay = anchor.y + anchor.h / 2;
  const left = Math.min(Math.max(ax - width / 2, GUTTER), win.width - width - GUTTER);
  const h = Math.min(size?.h ?? 0, maxH);
  // sotto il pulsante se c'è spazio, altrimenti spinto in su quanto basta
  const top = Math.max(insets.top + GUTTER, Math.min(anchor.y + anchor.h + 8, win.height - insets.bottom - GUTTER - h));
  // spostamento dal centro del riquadro al centro del pulsante: da lì parte l'animazione
  const dx = ax - (left + width / 2);
  const dy = ay - (top + h / 2);

  useEffect(() => {
    if (size) Animated.spring(t, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [size, t]);

  const close = (after?: () => void) => {
    after?.();
    Animated.timing(t, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => onClose());
  };

  // azione riservata a un ruolo (fast: solo la centrale) non disponibile per la giocatrice scelta
  const blocked = (a: PointAction, p = picked) => !!p && !!ACTION_ROLE[a] && p.role !== ACTION_ROLE[a];

  const pickPlayer = (p: LineupPlayer) => {
    const next = picked?.id === p.id ? null : p;
    setPicked(next);
    if (action && blocked(action, next)) setAction(null);
  };

  const pickAction = (a: (typeof POINT_ACTIONS)[number]) => {
    setAction(a.value);
    setPhase(a.phase);
  };

  const detail = (): PointDetail | null => action
    ? { action, phase, zone, player: picked ? { lineupId: picked.id, playerId: picked.playerId ?? null, name: picked.name, number: picked.number } : null }
    : null;

  // il punteggio dopo il punto lo calcola l'app, non l'AI; solo cronaca: quello attuale (dell'agente)
  const after = commentOnly ? { our: score.our, opp: score.opp } : { our: score.our + (side === 'us' ? 1 : 0), opp: score.opp + (side === 'opp' ? 1 : 0) };
  const standard = (() => {
    const d = detail();
    return d ? detailLine(side, d, names.us === US ? undefined : names) : '';
  })();
  const options = [...phrases, standard];

  const generate = async (avoid: string[]) => {
    if (!action) return;
    const id = ++request.current;
    setLoading(true);
    setAiError(null);
    try {
      const frasi = await suggestCommentary({
        squadra: names.us, avversaria: names.opp, puntoA: side, azione: action, fase: phase, zona: zone,
        giocatrice: picked?.name ?? null, set: score.set, nostri: after.our, loro: after.opp,
        chiudeSet: !commentOnly && setWinner(score.set, after) !== null, evita: avoid,
      });
      if (id !== request.current) return;
      setPhrases(frasi);
      setSeen((s) => [...s, ...frasi]);
      setChosen(0);
      if (!frasi.length) setAiError('Nessuna frase dall\'AI: usa quella standard o riprova.');
    } catch (err) {
      if (id !== request.current) return;
      console.warn('Cronaca AI non disponibile', err);
      setAiError('AI non disponibile: puoi usare la frase standard.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  const toCronaca = () => {
    setStep('cronaca');
    setPhrases([]);
    setSeen([]);
    setChosen(0);
    if (ai) generate([]);
  };

  const assign = () => {
    const d = detail();
    if (!d) return;
    const pick = Math.min(chosen, options.length - 1);
    close(() => onScore({ ...d, text: options[pick], aiText: pick < phrases.length }));
  };

  // senza dettagli: se è scelta una giocatrice il punto resta suo (cronaca e statistiche)
  const quick = () => close(() => onScore(picked
    ? { action: 'punto', phase, zone, player: { lineupId: picked.id, playerId: picked.playerId ?? null, name: picked.name, number: picked.number } }
    : undefined));

  const chip = (on: boolean) => ({
    borderRadius: radius.sm, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: on ? palette.gold : c.fill, borderWidth: 1, borderColor: on ? palette.gold : c.line,
  });

  const summary = [
    action ? actionLabel(action) : null,
    PHASE_LABEL[phase],
    zone ? `Zona ${ZONE_LABEL[zone]}` : null,
    picked ? `${picked.number != null ? `#${picked.number} ` : ''}${picked.name}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close()}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,26,56,0.45)', opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
        <Pressable onPress={() => close()} accessibilityRole="button" accessibilityLabel="Chiudi" style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute', left, top, width, maxHeight: maxH,
          backgroundColor: c.card, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, overflow: 'hidden',
          opacity: size ? t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }) : 0,
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) },
          ],
        }}>
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
          {/* l'altezza cambia tra i due passi: il riquadro si riposiziona */}
          <View onLayout={(e) => {
            const l = e.nativeEvent.layout;
            setSize((s) => (s && s.h === l.height ? s : { w: l.width, h: l.height }));
          }} style={{ gap: space.md, padding: space.md }}>
            {note && onNote ? (
              <NoteFlow kind={note} side={side} team={team} names={names} ai={ai}
                players={{
                  court: starters,
                  // il libero non entra con un cambio
                  bench: players.filter((p) => p.zone == null && !p.isLibero && p.role !== 'libero'),
                }}
                score={score} onBack={() => setNote(null)} onClose={() => close()}
                onPublish={(text, sub) => close(() => onNote(note, text, sub))} />
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  {step === 'cronaca' ? (
                    <Pressy onPress={() => { request.current++; setLoading(false); setStep('azione'); }} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Torna all'azione"
                      style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                      <ChevronLeft size={18} color={c.text} />
                    </Pressy>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Txt w={700} size={15} numberOfLines={1}>{commentOnly ? 'Cronaca' : 'Punto'} {team}</Txt>
                    <Txt size={12} color="muted" numberOfLines={1}>
                      {step === 'cronaca'
                        ? `${score.set === 5 ? 'Tie-break' : `${score.set}° set`}, ${after.our}–${after.opp}`
                        : picked ? `${picked.number != null ? `#${picked.number} ` : ''}${picked.name}${zone ? ` · Pos. ${ZONE_LABEL[zone]}` : ''}` : starters.length ? 'Chi ha fatto punto? (facoltativo)' : 'Starting Six non inserito'}
                    </Txt>
                  </View>
                  {step === 'azione' && !commentOnly ? (
                    <Pressy onPress={quick} scaleTo={0.94} accessibilityRole="button"
                      accessibilityLabel={picked ? `Solo punto di ${picked.name}, senza dettagli` : 'Solo punto, senza dettagli'}
                      style={{ height: 32, paddingHorizontal: space.sm + 2, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                      <Txt w={700} size={12} numberOfLines={1}>Solo punto</Txt>
                    </Pressy>
                  ) : null}
                  <Pressy onPress={() => close()} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Chiudi"
                    style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                    <X size={16} color={c.text} />
                  </Pressy>
                </View>

                {step === 'azione' ? (
                  <>
                    {starters.length ? (
                      <Field label={rotation ? `In campo adesso: ${rotation} ${rotation === 1 ? 'rotazione' : 'rotazioni'} nel set` : 'In campo adesso: formazione di inizio set'}>
                        <Court big players={starters} selectedId={picked?.id} onPick={pickPlayer} />
                      </Field>
                    ) : null}

                    <Field label="Fase">
                      <SegmentedControl stretch value={phase} onChange={setPhase}
                        options={[{ value: 'attacco', label: PHASE_LABEL.attacco }, { value: 'difesa', label: PHASE_LABEL.difesa }]} />
                    </Field>

                    <Field label="Azione">
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                        {POINT_ACTIONS.map((a) => (
                          <Pressy key={a.value} scaleTo={0.94} onPress={() => pickAction(a)} disabled={blocked(a.value)}
                            accessibilityRole="button" accessibilityState={{ selected: action === a.value, disabled: blocked(a.value) }} accessibilityLabel={a.label}
                            style={[chip(action === a.value), { flexGrow: 1, flexBasis: '30%', height: 40, paddingHorizontal: space.sm, opacity: blocked(a.value) ? 0.35 : 1 }]}>
                            <Txt w={700} size={13} numberOfLines={1} color={action === a.value ? palette.onGold : 'text'}>{a.label}</Txt>
                          </Pressy>
                        ))}
                      </View>
                    </Field>

                    <Button variant="gold" label={ai ? 'Avanti: cronaca AI' : 'Avanti: cronaca'} disabled={!action} onPress={toCronaca}
                      icon={ai ? <Sparkles size={16} color={palette.onGold} /> : undefined} />
                    {onNote && notes.length ? (
                      <View style={{ flexDirection: 'row', gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: c.line }}>
                        {notes.includes('timeout') ? (
                          <Button size="sm" label="Timeout" icon={<Timer size={16} color={c.text} />} style={{ flex: 1 }}
                            accessibilityLabel={`Timeout ${team}`} onPress={() => setNote('timeout')} />
                        ) : null}
                        {notes.includes('cambio') ? (
                          <Button size="sm" label="Cambio" icon={<ArrowLeftRight size={16} color={c.text} />} style={{ flex: 1 }}
                            accessibilityLabel={`Cambio ${team}`} onPress={() => setNote('cambio')} />
                        ) : null}
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <View style={{ padding: space.sm, borderRadius: radius.sm, backgroundColor: c.fill }}>
                      <Txt w={600} size={12.5}>{summary}</Txt>
                    </View>

                    <PhraseList options={options} aiCount={phrases.length} chosen={chosen} onChoose={setChosen} loading={loading} error={aiError} />

                    {ai ? (
                      <Button size="sm" label="Altre frasi" disabled={loading} onPress={() => generate(seen)} icon={<RefreshCw size={14} color={c.text} />} />
                    ) : null}
                    <Button variant="gold" label={commentOnly ? 'Pubblica in cronaca' : `Assegna punto a ${team}`} onPress={assign} />
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
