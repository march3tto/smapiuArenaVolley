import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTopBarHeight } from './TopBar';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Contenitore scorrevole delle tab, con spazio per la barra inferiore */
export function Screen({ children, onRefresh, refreshing, contentStyle }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopBarHeight();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ padding: 14, paddingTop: top + 8, paddingBottom: insets.bottom + 110, gap: 16, width: '100%', maxWidth: 1120, alignSelf: 'center' }, contentStyle]}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ top }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} progressViewOffset={top} tintColor={c.accent} colors={[c.accent]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}
