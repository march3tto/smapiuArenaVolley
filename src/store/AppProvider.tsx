import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { loadJSON, removeKey, saveJSON } from '@/lib/storage';
import type { AppUser, NotifPrefs } from '@/types';

interface AppCtx {
  ready: boolean;
  user: AppUser | null;
  guest: boolean;
  prefs: NotifPrefs;
  demoLive: boolean;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signUp: (name: string, email: string, password: string) => Promise<AppUser>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<AppUser>;
  resetPassword: (email: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  updatePrefs: (patch: Partial<NotifPrefs>) => void;
  /** Ritorna true se ora la categoria è seguita */
  toggleYouth: (id: string) => boolean;
  setDemoLive: (on: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);

const K = { user: 'av-user', guest: 'av-guest', prefs: 'av-notif', demo: 'av-demo-live' };
const DEFAULT_PREFS: NotifPrefs = { enabled: true, start: true, sets: true, final: true, news: true, youth: [] };

function nameFromEmail(email: string): string {
  const n = email.split('@')[0].split(/[._-]/)[0] ?? '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Tifoso';
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [guest, setGuest] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  // Con Supabase l'anteprima live è spenta di default (si accende da Impostazioni o con EXPO_PUBLIC_DEMO_LIVE=1)
  const [demoLive, setDemoLiveState] = useState(
    supabase ? process.env.EXPO_PUBLIC_DEMO_LIVE === '1' : process.env.EXPO_PUBLIC_DEMO_LIVE !== '0',
  );

  // Ripristino sessione e preferenze
  useEffect(() => {
    (async () => {
      const [g, p, d] = await Promise.all([loadJSON<boolean>(K.guest), loadJSON<NotifPrefs>(K.prefs), loadJSON<boolean>(K.demo)]);
      if (g) setGuest(true);
      if (p) setPrefs({ ...DEFAULT_PREFS, ...p });
      if (d !== null) setDemoLiveState(d);
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const u = data.session?.user;
        if (u) setUser({ id: u.id, email: u.email ?? '', name: String(u.user_metadata?.full_name ?? nameFromEmail(u.email ?? '')) });
      } else {
        const saved = await loadJSON<AppUser>(K.user);
        if (saved) setUser(saved);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '', name: String(u.user_metadata?.full_name ?? nameFromEmail(u.email ?? '')) } : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const finishLogin = useCallback(async (u: AppUser) => {
    setUser(u);
    setGuest(false);
    await removeKey(K.guest);
    if (!supabase) await saveJSON(K.user, u);
    return u;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error(error?.message === 'Invalid login credentials' ? 'Email o password non corrette.' : error?.message ?? 'Accesso non riuscito.');
      return finishLogin({ id: data.user.id, email, name: String(data.user.user_metadata?.full_name ?? nameFromEmail(email)) });
    }
    await wait(900);
    return finishLogin({ id: 'demo', email, name: nameFromEmail(email) });
  }, [finishLogin]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error || !data.user) throw new Error(error?.message ?? 'Registrazione non riuscita.');
      return finishLogin({ id: data.user.id, email, name });
    }
    await wait(900);
    return finishLogin({ id: 'demo', email, name });
  }, [finishLogin]);

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    if (supabase) {
      // Richiede la configurazione del provider in Supabase (Authentication > Providers)
      // e un flusso OAuth (expo-auth-session / expo-apple-authentication).
      throw new Error(`Accesso con ${provider === 'google' ? 'Google' : 'Apple'} da configurare in Supabase.`);
    }
    await wait(800);
    return finishLogin({ id: 'demo', email: provider, name: 'Tifoso' });
  }, [finishLogin]);

  const resetPassword = useCallback(async (email: string) => {
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
    } else {
      await wait(500);
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setGuest(true);
    saveJSON(K.guest, true);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    await removeKey(K.user);
    await removeKey(K.guest);
    setUser(null);
    setGuest(false);
  }, []);

  const updatePrefs = useCallback((patch: Partial<NotifPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      saveJSON(K.prefs, next);
      return next;
    });
  }, []);

  const toggleYouth = useCallback((id: string) => {
    const on = !prefs.youth.includes(id);
    updatePrefs({ youth: on ? [...prefs.youth, id] : prefs.youth.filter((x) => x !== id), ...(on ? { enabled: true } : {}) });
    return on;
  }, [prefs.youth, updatePrefs]);

  const setDemoLive = useCallback((on: boolean) => {
    setDemoLiveState(on);
    saveJSON(K.demo, on);
  }, []);

  const value = useMemo<AppCtx>(() => ({
    ready, user, guest, prefs, demoLive,
    signIn, signUp, signInWithProvider, resetPassword, continueAsGuest, signOut, updatePrefs, toggleYouth, setDemoLive,
  }), [ready, user, guest, prefs, demoLive, signIn, signUp, signInWithProvider, resetPassword, continueAsGuest, signOut, updatePrefs, toggleYouth, setDemoLive]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp deve stare dentro AppProvider');
  return v;
}
