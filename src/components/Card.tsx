import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/colors';

export function Card({ style, padded = true, ...rest }: ViewProps & { padded?: boolean }) {
  const { c, mode } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: c.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.line,
          padding: padded ? 18 : 0,
          shadowColor: mode === 'dark' ? '#000' : '#0B338F',
          shadowOpacity: mode === 'dark' ? 0.35 : 0.12,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
        },
        style,
      ]}
    />
  );
}
