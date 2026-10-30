import type { ReactNode, Ref } from 'react';
import { RefreshControl, ScrollView, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTopBarHeight } from './TopBar';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/colors';

interface Props {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Per scorrere da codice (es. banner che portano a una sezione) */
  scrollRef?: Ref<ScrollViewInstance>;
}

/** Contenitore scorrevole delle tab, con spazio per la barra inferiore */
export function Screen({ children, onRefresh, refreshing, contentStyle, scrollRef }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopBarHeight();
  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[{ padding: space.md, paddingTop: top + space.sm, paddingBottom: insets.bottom + 112, gap: space.md, width: '100%', maxWidth: 1120, alignSelf: 'center' }, contentStyle]}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ top }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} progressViewOffset={top} tintColor={c.accent} colors={[c.accent]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}
