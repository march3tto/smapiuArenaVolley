import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { palette, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Frasi proposte per la cronaca (prima quelle dell'AI, in fondo la standard): se ne sceglie una */
export function PhraseList({ options, aiCount, chosen, onChoose, loading, error }: {
  options: string[];
  /** Quante delle prime frasi vengono dall'AI */
  aiCount: number;
  chosen: number;
  onChoose: (i: number) => void;
  loading: boolean;
  error: string | null;
}) {
  const { c } = useTheme();
  return (
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
          const isAi = i < aiCount;
          return (
            <Pressy key={`${i}-${f}`} scaleTo={0.98} onPress={() => onChoose(i)}
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
        {error ? <Txt size={12} color="live">{error}</Txt> : null}
      </View>
    </Field>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt w={600} size={12} color="muted">{label}</Txt>
      {children}
    </View>
  );
}
