import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressy } from './Pressy';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  label: string;
  size?: number;
  active?: boolean;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ children, onPress, label, size = 40, active, dot, style }: Props) {
  const { c } = useTheme();
  return (
    <Pressy
      onPress={onPress}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? palette.gold : c.fill,
          borderWidth: active ? 0 : 1,
          borderColor: c.line,
        },
        style,
      ]}
    >
      {children}
      {dot ? (
        <View style={{ position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: palette.gold, borderWidth: 2, borderColor: c.card }} />
      ) : null}
    </Pressy>
  );
}
