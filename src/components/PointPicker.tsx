import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Sparkles, X } from 'lucide-react-native';
import { Button } from './Button';
import { Court } from './LineupPanel';
import { Pressy } from './Pressy';
import { SegmentedControl } from './SegmentedControl';
import { Txt } from './Txt';
import { US } from '@/constants';
import { suggestCommentary } from '@/lib/api';
import { setWinner } from '@/lib/volley';
import { PHASE_LABEL, POINT_ACTIONS, ZONE_LABEL, actionLabel, detailLine, type PointAction, type PointDetail, type PointPhase } from '@/store/LiveProvider';
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
 */
export function PointPicker({ anchor, side, team, names, players, rotation = 0, score, ai, onScore, onClose }: {
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
  onScore: (detail?: PointDetail) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [step, setStep] = useState<'azione' | 'cronaca'>('azione');
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

  const pickPlayer = (p: LineupPlayer) => setPicked((cur) => (cur?.id === p.id ? null : p));

  const pickAction = (a: (typeof POINT_ACTIONS)[number]) => {
    setAction(a.value);
    setPhase(a.phase);
  };

  const detail = (): PointDetail | null => action
    ? { action, phase, zone, player: picked ? { lineupId: picked.id, playerId: picked.playerId ?? null, name: picked.name, number: picked.number } : null }
    : null;

  // il punteggio dopo il punto lo calcola l'app, non l'AI
  const after = { our: score.our + (side === 'us' ? 1 : 0), opp: score.opp + (side === 'opp' ? 1 : 0) };
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
        chiudeSet: setWinner(score.set, after) !== null, evita: avoid,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              {step === 'cronaca' ? (
                <Pressy onPress={() => { request.current++; setLoading(false); setStep('azione'); }} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Torna all'azione"
                  style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                  <ChevronLeft size={18} color={c.text} />
                </Pressy>
              ) : null}
              <View style={{ flex: 1 }}>
                <Txt w={700} size={15} numberOfLines={1}>Punto {team}</Txt>
                <Txt size={12} color="muted" numberOfLines={1}>
                  {step === 'cronaca'
                    ? `${score.set === 5 ? 'Tie-break' : `${score.set}° set`}, ${after.our}–${after.opp}`
                    : picked ? `${picked.number != null ? `#${picked.number} ` : ''}${picked.name}${zone ? ` · Pos. ${ZONE_LABEL[zone]}` : ''}` : starters.length ? 'Chi ha fatto punto? (facoltativo)' : 'Starting Six non inserito'}
                </Txt>
              </View>
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
                      <Pressy key={a.value} scaleTo={0.94} onPress={() => pickAction(a)}
                        accessibilityRole="button" accessibilityState={{ selected: action === a.value }} accessibilityLabel={a.label}
                        style={[chip(action === a.value), { flexGrow: 1, flexBasis: '30%', height: 40, paddingHorizontal: space.sm }]}>
                        <Txt w={700} size={13} numberOfLines={1} color={action === a.value ? palette.onGold : 'text'}>{a.label}</Txt>
                      </Pressy>
                    ))}
                  </View>
                </Field>

                <Button variant="gold" label={ai ? 'Avanti: cronaca AI' : 'Avanti: cronaca'} disabled={!action} onPress={toCronaca}
                  icon={ai ? <Sparkles size={16} color={palette.onGold} /> : undefined} />
                <Pressy onPress={() => close(() => onScore())} scaleTo={0.96} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: space.xs, paddingHorizontal: space.sm }}>
                  <Txt w={600} size={12.5} color="muted">Solo punto, senza dettagli</Txt>
                </Pressy>
              </>
            ) : (
              <>
                <View style={{ padding: space.sm, borderRadius: radius.sm, backgroundColor: c.fill }}>
                  <Txt w={600} size={12.5}>{summary}</Txt>
                </View>

                <Field label="Scegli la frase per la cronaca">
                  <View style={{ gap: space.sm }}>
                    {loading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md }}>
                        <ActivityIndicator color={c.accent} />
                        <Txt size={13} color="muted">L&apos;AI sta scrivendo la cronaca…</Txt>
                      </View>
                    ) : null}
                    {options.map((f, i) => {
                      const on = i === Math.min(chosen, options.length - 1);
                      const isAi = i < phrases.length;
                      return (
                        <Pressy key={`${i}-${f}`} scaleTo={0.98} onPress={() => setChosen(i)}
                          accessibilityRole="radio" accessibilityState={{ selected: on }}
                          style={{ flexDirection: 'row', gap: space.sm, padding: space.sm, borderRadius: radius.sm, borderWidth: 1.5, borderColor: on ? palette.gold : c.line, backgroundColor: on ? 'rgba(255,213,3,0.12)' : undefined }}>
                          <View style={{ width: 18, height: 18, borderRadius: 9, marginTop: 0, borderWidth: 2, borderColor: on ? palette.gold : c.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                            {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.gold }} /> : null}
                          </View>
                          <View style={{ flex: 1, gap: space.xs }}>
                            <Txt size={13.5}>{f}</Txt>
                            <Txt w={600} size={11} color="muted">{isAi ? 'Proposta AI' : 'Frase standard'}</Txt>
                          </View>
                        </Pressy>
                      );
                    })}
                    {aiError ? <Txt size={12} color="live">{aiError}</Txt> : null}
                  </View>
                </Field>

                {ai ? (
                  <Button size="sm" label="Altre frasi" disabled={loading} onPress={() => generate(seen)} icon={<RefreshCw size={14} color={c.text} />} />
                ) : null}
                <Button variant="gold" label={`Assegna punto a ${team}`} onPress={assign} />
              </>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt w={600} size={12} color="muted">{label}</Txt>
      {children}
    </View>
  );
}
