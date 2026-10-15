import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { loadJSON, saveJSON } from './storage';

/*
 * Accesso con Apple, Google e Facebook su Supabase Auth.
 * - Apple (solo iOS): Sign in with Apple nativo → signInWithIdToken con nonce. Su Android e web il pulsante non compare:
 *   la guideline 4.8 dell'App Store riguarda solo iOS e il flusso web di Apple richiederebbe un Services ID in più.
 * - Google (iOS, Android): @react-native-google-signin → signInWithIdToken. Modulo nativo: serve la development build.
 * - Facebook: OAuth nel browser (PKCE) con expo-web-browser e ritorno su arenavolley://auth/callback.
 * Sul web l'app offre solo l'accesso con email.
 */

export type Provider = 'email' | 'apple' | 'google' | 'facebook';
export type SocialProvider = Exclude<Provider, 'email'>;

export const PROVIDER_LABEL: Record<Provider, string> = { email: 'Email', apple: 'Apple', google: 'Google', facebook: 'Facebook' };

/** Il login è stato annullato dall'utente: nessun messaggio di errore */
export class AccessoAnnullato extends Error {
  constructor() {
    super('Accesso annullato.');
  }
}

const extra = (Constants.expoConfig?.extra ?? {}) as { googleWebClientId?: string; googleIosClientId?: string };
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const nativo = Platform.OS === 'ios' || Platform.OS === 'android';

/** Pulsanti da mostrare nella schermata di accesso, nell'ordine */
export async function providerDisponibili(): Promise<SocialProvider[]> {
  if (!supabase || !nativo) return [];
  const apple = Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync().catch(() => false));
  return [...(apple ? (['apple'] as const) : []), 'google', 'facebook'];
}

/** Metodo con cui l'utente ha fatto l'ultimo accesso su questo dispositivo (per il registro dei consensi) */
const K_PROVIDER = 'av-provider';
export const salvaProviderCorrente = (p: Provider) => saveJSON(K_PROVIDER, p);
export async function providerCorrente(u: User): Promise<Provider> {
  const p = await loadJSON<Provider>(K_PROVIDER);
  return p && providerDiUtente(u).includes(p) ? p : (providerDiUtente(u)[0] ?? 'email');
}

/** Identità collegate all'account (Supabase collega da solo i provider con la stessa email verificata) */
export function providerDiUtente(u: User): Provider[] {
  const tutti = [...(u.identities ?? []).map((i) => i.provider), ...((u.app_metadata?.providers as string[] | undefined) ?? [])];
  return [...new Set(tutti)].filter((p): p is Provider => p in PROVIDER_LABEL);
}

function errore(e: unknown, fallback: string): Error {
  return e instanceof Error ? e : new Error(fallback);
}

// ---------- Apple ----------

async function accediConApple(): Promise<User> {
  // nonce: ad Apple va l'hash, a Supabase il valore in chiaro (che lo confronta con quello nel token)
  const nonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  let cred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AccessoAnnullato();
    throw errore(e, 'Accesso con Apple non riuscito.');
  }
  if (!cred.identityToken) throw new Error('Apple non ha restituito il token di accesso.');

  const { data, error } = await supabase!.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce });
  if (error || !data.user) throw new Error(error?.message ?? 'Accesso con Apple non riuscito.');

  // Apple manda il nome solo al primo accesso: va salvato subito (l'email può essere un indirizzo @privaterelay.appleid.com, valido)
  const nome = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ').trim();
  if (nome) {
    const { data: agg } = await supabase!.auth.updateUser({ data: { full_name: nome } });
    await supabase!.from('profili').update({ nome_completo: nome }).eq('id', data.user.id);
    return agg.user ?? data.user;
  }
  return data.user;
}

/** authorizationCode nuovo, necessario alla function elimina-account per revocare Sign in with Apple */
export async function codiceAutorizzazioneApple(): Promise<string> {
  try {
    const cred = await AppleAuthentication.signInAsync({ requestedScopes: [] });
    if (!cred.authorizationCode) throw new Error('Apple non ha restituito il codice di autorizzazione.');
    return cred.authorizationCode;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AccessoAnnullato();
    throw errore(e, 'Conferma con Apple non riuscita.');
  }
}

// ---------- Google ----------

type ModuloGoogle = typeof import('@react-native-google-signin/google-signin');
let google: ModuloGoogle | null = null;

/** Caricato solo quando serve: in Expo Go il modulo nativo non c'è e l'import farebbe chiudere l'app */
function moduloGoogle(): ModuloGoogle {
  if (inExpoGo) throw new Error("L'accesso con Google richiede la development build dell'app (non funziona in Expo Go).");
  if (!extra.googleWebClientId) throw new Error('Accesso con Google non configurato (manca EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
  if (!google) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    google = require('@react-native-google-signin/google-signin') as ModuloGoogle;
    // webClientId: il token deve essere emesso per il client web, quello registrato nel provider Google di Supabase
    google.GoogleSignin.configure({ webClientId: extra.googleWebClientId, iosClientId: extra.googleIosClientId });
  }
  return google;
}

async function accediConGoogle(): Promise<User> {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = moduloGoogle();
  let token: string | null;
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const r = await GoogleSignin.signIn();
    if (!isSuccessResponse(r)) throw new AccessoAnnullato();
    token = r.data.idToken;
  } catch (e) {
    if (e instanceof AccessoAnnullato || (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)) throw new AccessoAnnullato();
    throw errore(e, 'Accesso con Google non riuscito.');
  }
  if (!token) throw new Error('Google non ha restituito il token di accesso.');
  const { data, error } = await supabase!.auth.signInWithIdToken({ provider: 'google', token });
  if (error || !data.user) throw new Error(error?.message ?? 'Accesso con Google non riuscito.');
  return data.user;
}

// ---------- Facebook ----------

async function accediConFacebook(): Promise<User> {
  // in una development build: arenavolley://auth/callback (da aggiungere ai Redirect URL di Supabase)
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo, skipBrowserRedirect: true, scopes: 'email public_profile' },
  });
  if (error || !data.url) throw new Error(error?.message ?? 'Accesso con Facebook non riuscito.');

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') throw new AccessoAnnullato();
  const { queryParams } = Linking.parse(res.url);
  const err = queryParams?.error_description ?? queryParams?.error;
  if (err) throw new Error(String(err));
  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('Accesso con Facebook non riuscito: codice mancante.');

  const { data: s, error: e2 } = await supabase!.auth.exchangeCodeForSession(code);
  if (e2 || !s.user) throw new Error(e2?.message ?? 'Accesso con Facebook non riuscito.');
  return s.user;
}

// ---------- comuni ----------

export async function accediCon(p: SocialProvider): Promise<User> {
  if (!supabase) throw new Error('Supabase non configurato.');
  const u = p === 'apple' ? await accediConApple() : p === 'google' ? await accediConGoogle() : await accediConFacebook();
  await salvaProviderCorrente(p);
  return u;
}

/** Disconnessione dai provider nativi (Google). Con revoca = true l'app perde anche l'autorizzazione (cancellazione account). */
export async function esciDaiProvider(providers: Provider[], revoca = false): Promise<void> {
  if (!providers.includes('google') || inExpoGo || !nativo || !extra.googleWebClientId) return;
  try {
    const { GoogleSignin } = moduloGoogle();
    if (revoca) await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch (e) {
    console.warn('Disconnessione da Google non riuscita', e);
  }
}
