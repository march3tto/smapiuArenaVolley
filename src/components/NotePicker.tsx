import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ChevronLeft, RefreshCw, Sparkles, X } from 'lucide-react-native';
import { Button } from './Button';
import { Court } from './LineupPanel';
import { Field, PhraseList } from './PhraseList';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { suggestNoteCommentary } from '@/lib/api';
import { palette, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { LineupPlayer } from '@/types';

export type NoteKind = 'timeout' | 'cambio';

const label = (p: LineupPlayer) => `${p.number != null ? `#${p.number} ` : ''}${p.name}`;

/**
 * Timeout e cambio di una squadra, dentro il riquadro del punto (un secondo Modal non si apre mentre il primo si chiude):
 * righe di cronaca senza punto.
 * 1. Solo per il cambio: chi esce dal campo e chi entra dalla panchina.
 * 2. Cronaca: frasi dell'AI (se disponibile) o standard; si sceglie e si pubblica.
 */
export function NoteFlow({ kind, side, team, names, players, score, ai, onPublish, onBack, onClose }: {
  kind: NoteKind;
  /** Squadra che chiede il timeout o fa il cambio */
  side: 'us' | 'opp';
  team: string;
  /** Nomi delle due squadre per l'AI */
  names: { us: string; opp: string };
  /** In campo adesso (zone già ruotate) e in panchina */
  players: { court: LineupPlayer[]; bench: LineupPlayer[] };
  /** Set e punteggio attuali: non cambiano */
  score: { set: number; our: number; opp: number };
  /** Frasi dall'AI (solo staff/admin con Supabase) */
  ai: boolean;
  onPublish: (text: string, sub?: { in: LineupPlayer; out: LineupPlayer }) => void;
  /** Torna alla scelta dell'azione del punto */
  onBack: () => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  // il timeout non ha niente da scegliere: si parte dalla cronaca
  const [step, setStep] = useState<'scelta' | 'cronaca'>(kind === 'timeout' ? 'cronaca' : 'scelta');
  const [out, setOut] = useState<LineupPlayer | null>(null);
  const [inn, setInn] = useState<LineupPlayer | null>(null);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [chosen, setChosen] = useState(0);
  const [loading, setLoading] = useState(kind === 'timeout' && ai);
  const [aiError, setAiError] = useState<string | null>(null);
  const request = useRef(0);

  const ready = kind === 'timeout' || (!!out && !!inn);
  const standard = kind === 'timeout'
    ? `Timeout chiesto da ${team}.`
    : out && inn ? `Cambio ${team}: entra ${inn.name}, esce ${out.name}.` : '';
  const options = [...phrases, standard];

  const generate = async (avoid: string[]) => {
    const id = ++request.current;
    setLoading(true);
    setAiError(null);
    try {
      const frasi = await suggestNoteCommentary({
        tipo: kind, squadra: names.us, avversaria: names.opp, puntoA: side, entra: inn?.name ?? null, esce: out?.name ?? null,
        set: score.set, nostri: score.our, loro: score.opp, evita: avoid,
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

  // il timeout parte già dalla cronaca: le frasi si chiedono all'apertura
  useEffect(() => {
    if (kind !== 'timeout' || !ai) return;
    const t = setTimeout(() => generate([]), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toCronaca = () => {
    setStep('cronaca');
    setPhrases([]);
    setSeen([]);
    setChosen(0);
    if (ai) generate([]);
  };

  const back = () => {
    request.current++;
    setLoading(false);
    if (step === 'cronaca' && kind === 'cambio') setStep('scelta');
    else onBack();
  };

  const publish = () => {
    const pick = Math.min(chosen, options.length - 1);
    onPublish(options[pick], kind === 'cambio' && out && inn ? { in: inn, out } : undefined);
  };

  const chip = (on: boolean) => ({
    borderRadius: radius.sm, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: on ? palette.gold : c.fill, borderWidth: 1, borderColor: on ? palette.gold : c.line,
  });

  const title = `${kind === 'timeout' ? 'Timeout' : 'Cambio'} ${team}`;
  const subtitle = step === 'cronaca'
    ? `${score.set === 5 ? 'Tie-break' : `${score.set}° set`}, ${score.our}–${score.opp}`
    : out && inn ? `Entra ${label(inn)}, esce ${label(out)}` : !out ? 'Chi esce dal campo?' : 'Chi entra dalla panchina?';

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressy onPress={back} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Indietro"
          style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
          <ChevronLeft size={18} color={c.text} />
        </Pressy>
        <View style={{ flex: 1 }}>
          <Txt w={700} size={15} numberOfLines={1}>{title}</Txt>
          <Txt size={12} color="muted" numberOfLines={1}>{subtitle}</Txt>
        </View>
        <Pressy onPress={onClose} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Chiudi"
          style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
          <X size={16} color={c.text} />
        </Pressy>
      </View>

      {step === 'scelta' ? (
        <>
          <Field label="Esce dal campo">
            {players.court.length ? (
              <Court big players={players.court} selectedId={out?.id} onPick={(p) => setOut((cur) => (cur?.id === p.id ? null : p))} />
            ) : <Txt size={13} color="muted">Starting Six non inserito.</Txt>}
          </Field>
          <Field label="Entra dalla panchina">
            {players.bench.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {players.bench.map((p) => (
                  <Pressy key={p.id} scaleTo={0.94} onPress={() => setInn((cur) => (cur?.id === p.id ? null : p))}
                    accessibilityRole="button" accessibilityState={{ selected: inn?.id === p.id }} accessibilityLabel={p.name}
                    style={[chip(inn?.id === p.id), { flexGrow: 1, flexBasis: '45%', height: 40, paddingHorizontal: space.sm }]}>
                    <Txt w={700} size={12.5} numberOfLines={1} color={inn?.id === p.id ? palette.onGold : 'text'}>{label(p)}</Txt>
                  </Pressy>
                ))}
              </View>
            ) : <Txt size={13} color="muted">Nessuna giocatrice in panchina.</Txt>}
          </Field>
          <Button variant="gold" label={ai ? 'Avanti: cronaca AI' : 'Avanti: cronaca'} disabled={!ready} onPress={toCronaca}
            icon={ai ? <Sparkles size={16} color={palette.onGold} /> : undefined} />
        </>
      ) : (
        <>
          <PhraseList options={options} aiCount={phrases.length} chosen={chosen} onChoose={setChosen} loading={loading} error={aiError} />
          {ai ? (
            <Button size="sm" label="Altre frasi" disabled={loading} onPress={() => generate(seen)} icon={<RefreshCw size={14} color={c.text} />} />
          ) : null}
          <Button variant="gold" label={kind === 'timeout' ? 'Pubblica il timeout' : 'Pubblica il cambio'} onPress={publish} />
        </>
      )}
    </>
  );
}
