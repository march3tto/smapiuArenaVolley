import type { ReactNode } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { palette, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'gold' | 'ghost' | 'ok' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'ghost', size = 'md', icon, loading, disabled, style, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const h = size === 'sm' ? 38 : size === 'lg' ? 54 : 46;
  const bg = variant === 'gold' ? palette.gold : variant === 'ok' ? c.ok : variant === 'danger' ? c.danger : c.fill;
  const fg = variant === 'gold' ? palette.onGold : variant === 'ok' || variant === 'danger' ? '#fff' : c.text;
  return (
    <Pressy
      onPress={disabled || loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={[
        {
          height: h,
          borderRadius: radius.pill,
          paddingHorizontal: size === 'sm' ? space.md : space.lg,
          backgroundColor: bg,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: c.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon ? <View>{icon}</View> : null}
      <Txt w={700} size={size === 'sm' ? 13 : 15} color={fg}>
        {label}
      </Txt>
    </Pressy>
  );
}
