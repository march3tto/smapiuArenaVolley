import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
        },
      })
    : null;

export const hasSupabase = supabase !== null;

/** "bucket/file" → URL pubblico dello Storage Supabase (il primo segmento del percorso è il bucket) */
export function storageUrl(path: string): string {
  if (!supabase || /^https?:\/\//.test(path)) return path;
  const [bucket, ...rest] = path.split('/');
  if (!rest.length) return path;
  return supabase.storage.from(bucket).getPublicUrl(rest.join('/')).data.publicUrl;
}
