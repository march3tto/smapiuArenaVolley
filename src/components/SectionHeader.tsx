import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  right?: ReactNode;
  big?: boolean;
}

export function SectionHeader({ title, subtitle, action, right, big }: Props) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Txt w={800} size={big ? 30 : 18} style={{ letterSpacing: big ? -0.9 : -0.3 }}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt size={13} color="muted" style={{ marginTop: 3 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt w={700} size={13} color="accent">
            {action.label}
          </Txt>
          <ChevronRight size={15} color={c.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}
