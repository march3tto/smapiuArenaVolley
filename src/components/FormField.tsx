import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Txt } from './Txt';
import { FONT, palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Campo con etichetta sopra, anche su più righe (moduli della gestione contenuti) */
export function FormField({ label, hint, error, multiline, ...input }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: space.xs }}>
      <Txt w={600} size={12} color={error ? 'danger' : focus ? 'accent' : 'muted'}>{label}</Txt>
      <TextInput
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
        placeholderTextColor={c.muted}
        style={{
          minHeight: multiline ? 140 : 48, borderRadius: 14, borderWidth: 1, borderColor: error ? c.danger : focus ? palette.gold : c.lineStrong,
          backgroundColor: c.fill, paddingHorizontal: space.md, paddingVertical: space.sm + 2, color: c.text, fontFamily: FONT[500], fontSize: 16,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {error ? <Txt size={12} color="danger">{error}</Txt> : hint ? <Txt size={12} color="muted">{hint}</Txt> : null}
    </View>
  );
}

/** Data locale del telefono in formato AAAA-MM-GG */
export function oggi(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const dataValida = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime());
