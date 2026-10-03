import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Colors } from './colors';
import { loadJSON, saveJSON } from '@/lib/storage';

export type ThemeMode = 'dark' | 'light';
interface ThemeCtx {
  c: Colors;
  mode: ThemeMode;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = 'av-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(system === 'light' ? 'light' : 'dark');

  useEffect(() => {
    loadJSON<ThemeMode>(KEY).then((saved) => saved && setMode(saved));
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next: ThemeMode = m === 'dark' ? 'light' : 'dark';
      saveJSON(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ c: mode === 'dark' ? dark : light, mode, toggle }), [mode, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme deve stare dentro ThemeProvider');
  return v;
}
