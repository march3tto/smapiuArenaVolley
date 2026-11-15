import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Tempo massimo per una lettura/scrittura del database o dell'auth: oltre, la richiesta si annulla */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * fetch con timeout per REST e Auth: su iOS, tornando dal background, una connessione morta può restare appesa
 * per sempre (spinner che non si chiude, diretta ferma). Edge Function e Storage hanno tempi propri (upload, AI).
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  const target = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  if (/\/(functions|storage)\/v1\//.test(target)) return fetch(input, init);
  const ctrl = new AbortController();
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) ctrl.abort();
    else outer.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
};

const noWindow = () => Platform.OS === 'web' && typeof window === 'undefined';
const sessionStorage = {
  getItem: (key: string) => (noWindow() ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (noWindow() ? Promise.resolve() : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (noWindow() ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: sessionStorage,
          autoRefreshToken: !noWindow(),
          persistSession: true,
          detectSessionInUrl: false,
          // login Facebook (OAuth nel browser): il ritorno all'app porta un ?code= da scambiare con exchangeCodeForSession
          flowType: 'pkce',
        },
        global: { fetch: fetchWithTimeout },
      })
    : null;

export const hasSupabase = supabase !== null;

// React Native: il rinnovo del token gira solo con l'app in primo piano (schema consigliato da Supabase),
// così al ritorno dal background le richieste non aspettano un rinnovo rimasto a metà
if (supabase && Platform.OS !== 'web') {
  const client = supabase;
  AppState.addEventListener('change', (st) => {
    if (st === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });
}

/**
 * Dati dimostrativi (src/data/mock.ts) solo in sviluppo e senza Supabase: una build di produzione senza le variabili
 * EXPO_PUBLIC_SUPABASE_* resta vuota e segnala l'errore invece di mostrare partite, news o login finti.
 */
export const demoMode = !supabase && __DEV__;

/** "bucket/file" → URL pubblico dello Storage Supabase (il primo segmento del percorso è il bucket) */
export function storageUrl(path: string): string {
  if (!supabase || /^https?:\/\//.test(path)) return path;
  const [bucket, ...rest] = path.split('/');
  if (!rest.length) return path;
  return supabase.storage.from(bucket).getPublicUrl(rest.join('/')).data.publicUrl;
}
