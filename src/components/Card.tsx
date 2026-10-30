import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/colors';

export function Card({ style, padded = true, ...rest }: ViewProps & { padded?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: c.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.line,
          padding: padded ? space.md : 0,
        },
        style,
      ]}
    />
  );
}
