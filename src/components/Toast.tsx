import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Info } from 'lucide-react-native';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

type IconComp = typeof Info;
interface ToastCtx {
  show: (message: string, Icon?: IconComp) => void;
}
const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ msg: string; Icon: IconComp } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, Icon: IconComp = Info) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, Icon });
    anim.setValue(0);
    progress.setValue(1);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
    Animated.timing(progress, { toValue: 0, duration: 3200, useNativeDriver: false }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  }, [anim, progress]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96, alignItems: 'center',
            opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          }}
        >
          <View style={{ maxWidth: 440, width: '100%', backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.lineStrong, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
            <toast.Icon size={18} color={c.accent} />
            <Txt size={14} w={500} style={{ flex: 1 }}>
              {toast.msg}
            </Txt>
            <Animated.View style={{ position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: palette.gold, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast deve stare dentro ToastProvider');
  return v;
}
