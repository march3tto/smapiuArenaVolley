import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Txt } from './Txt';
import { FONT, palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Campo con etichetta interna delle schermate di accesso (login, nuova password) */
export function AuthField({ label, error, right, compact, ...input }: TextInputProps & { label: string; error?: string; right?: ReactNode; compact?: boolean }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height: compact ? 52 : 58, borderRadius: 16, borderWidth: 1, borderColor: error ? c.danger : focus ? palette.gold : c.lineStrong, backgroundColor: c.fill, paddingHorizontal: space.md, justifyContent: 'center' }}>
        <Txt w={600} size={compact ? 11 : 12} color={error ? 'danger' : focus || input.value ? 'accent' : 'muted'}>{label}</Txt>
        <TextInput
          {...input}
          onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
          placeholderTextColor={c.muted}
          style={{ fontFamily: FONT[500], fontSize: 16, color: c.text, paddingVertical: space.xs, paddingRight: space.xl }}
        />
        {right ? <View style={{ position: 'absolute', right: 14, top: compact ? 17 : 20 }}>{right}</View> : null}
      </View>
      {error ? <Txt size={12.5} color="danger">{error}</Txt> : null}
    </View>
  );
}
