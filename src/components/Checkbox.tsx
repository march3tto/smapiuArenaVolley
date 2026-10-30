import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Casella di spunta con testo (il testo può contenere link: Txt annidati con onPress) */
export function Checkbox({ checked, onChange, error, children, accessibilityLabel }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: boolean;
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={accessibilityLabel}
      hitSlop={4} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
      <View style={{ width: 22, height: 22, marginTop: 0, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
        borderColor: error ? c.danger : checked ? palette.gold : c.lineStrong, backgroundColor: checked ? palette.gold : 'transparent' }}>
        {checked ? <Check size={15} color={palette.onGold} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}
