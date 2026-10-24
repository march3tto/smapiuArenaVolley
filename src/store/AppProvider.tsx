import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { FunctionsHttpError, type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { loadJSON, removeKey, saveJSON } from '@/lib/storage';
import { accediCon, codiceAutorizzazioneApple, esciDaiProvider, providerCorrente, providerDiUtente, salvaProviderCorrente, type SocialProvider } from '@/lib/auth';
import { caricaConsensi, consensiValidi, registraConsensi, registraConsensiInAttesa, rimuoviConsensiInAttesa, salvaConsensiInAttesa, type Consensi } from '@/lib/privacy';
import type { AppUser, NotifPrefs } from '@/types';

/** nessuno = non collegato; errore = non verificabili (rete, migrazione non applicata): l'app non blocca l'utente */
export type StatoConsensi = 'nessuno' | 'caricamento' | 'mancanti' | 'ok' | 'errore';

interface AppCtx {
  ready: boolean;
  user: AppUser | null;
  guest: boolean;
  prefs: NotifPrefs;
  /** Partita demo attiva: con Supabase vale solo per un admin collegato (solo lui la vede in Impostazioni) */
  demoLive: boolean;
  /** Pubblicità eliminata: vale solo con un utente registrato (vedi adsHidden) */
  noAds: boolean;
  /** true se la pubblicità non va mostrata: utente registrato che l'ha eliminata */
  adsHidden: boolean;
  /** Ultima scelta per tipo di consenso */
  consents: Consensi;
  consentStatus: StatoConsensi;
  signIn: (email: string, password: string) => Promise<AppUser>;
  /**
   * Con la registrazione l'utente dichiara 14 anni e accetta l'informativa (caselle obbligatorie del modulo).
   * null = conferma dell'email attiva in Supabase: l'utente accede dopo aver aperto il link ricevuto.
   */
  signUp: (name: string, email: string, password: string, marketing: boolean) => Promise<AppUser | null>;
  signInWithProvider: (provider: SocialProvider) => Promise<AppUser>;
  resetPassword: (email: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  /** Onboarding: 14 anni e informativa accettati, marketing a scelta; name se il profilo non ha nome */
  acceptConsents: (marketing: boolean, name?: string) => Promise<void>;
  setMarketing: (on: boolean) => Promise<void>;
  setYouthCategory: (id: string | null) => Promise<void>;
  /** Ritorna il codice di conferma della cancellazione */
  deleteAccount: () => Promise<string>;
  updatePrefs: (patch: Partial<NotifPrefs>) => void;
  /** Ritorna true se ora la categoria è seguita */
  toggleYouth: (id: string) => boolean;
  setDemoLive: (on: boolean) => void;
  setNoAds: (on: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);

const K = { user: 'av-user', guest: 'av-guest', prefs: 'av-notif', demo: 'av-demo-live', noAds: 'av-no-ads' };
const DEFAULT_PREFS: NotifPrefs = { enabled: true, start: true, sets: true, final: true, news: true, youth: [] };

/** profili.ruolo (enum ruolo_utente) → ruolo nell'app */
const RUOLO: Record<string, NonNullable<AppUser['role']>> = { pubblico: 'public', genitore: 'parent', staff: 'staff', admin: 'admin' };

function nameFromEmail(email: string): string {
  const n = email.split('@')[0].split(/[._-]/)[0] ?? '';
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Tifoso';
}

/** Utente Supabase → utente dell'app (ruolo e categoria arrivano dal profilo) */
function toAppUser(u: User, prev?: AppUser | null): AppUser {
  const full = String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? '').trim();
  const same = prev?.id === u.id;
  return {
    id: u.id,
    email: u.email ?? '',
    name: full || nameFromEmail(u.email ?? ''),
    hasName: !!full,
    providers: providerDiUtente(u),
    role: same ? prev.role : undefined,
    youthCategoryId: same ? prev.youthCategoryId : undefined,
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sessionUser(): Promise<User> {
  const { data } = await supabase!.auth.getSession();
  if (!data.session) throw new Error('Sessione scaduta: accedi di nuovo.');
  return data.session.user;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [guest, setGuest] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  // consensi dell'utente indicato: per un utente diverso (o nessuno) lo stato si ricava sotto, senza azzerarlo a mano
  const [consentState, setConsentState] = useState<{ uid: string; consents: Consensi; status: 'mancanti' | 'ok' | 'errore' } | null>(null);
  // Con Supabase l'anteprima live è spenta di default (si accende da Impostazioni o con EXPO_PUBLIC_DEMO_LIVE=1)
  const [demoLive, setDemoLiveState] = useState(
    supabase ? process.env.EXPO_PUBLIC_DEMO_LIVE === '1' : process.env.EXPO_PUBLIC_DEMO_LIVE !== '0',
  );

  const [noAds, setNoAdsState] = useState(false);

  // Ripristino sessione e preferenze
  useEffect(() => {
    (async () => {
      const [g, p, d, na] = await Promise.all([loadJSON<boolean>(K.guest), loadJSON<NotifPrefs>(K.prefs), loadJSON<boolean>(K.demo), loadJSON<boolean>(K.noAds)]);
      if (g) setGuest(true);
      if (p) setPrefs({ ...DEFAULT_PREFS, ...p });
      if (d !== null) setDemoLiveState(d);
      if (na) setNoAdsState(true);
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const u = data.session?.user;
        if (u) setUser(toAppUser(u));
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
      // ruolo e categoria restano quelli già letti se l'utente non cambia (es. refresh del token, nome aggiornato)
      setUser((prev) => (u ? toAppUser(u, prev) : null));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Ruolo e categoria dal profilo (il ruolo abilita le funzioni admin, es. il punteggio della diretta)
  const uid = user?.id;
  const email = user?.email ?? '';
  const hasRole = !!user?.role;
  useEffect(() => {
    if (!supabase || !uid || hasRole) return;
    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    // con un errore (rete, sessione non ancora pronta) non si scende a "pubblico": si riprova, altrimenti un admin
    // perderebbe le funzioni della diretta fino al riavvio dell'app
    const load = (attempt: number) => {
      supabase!.from('profili').select('ruolo, categoria_giovanile_id').eq('id', uid).maybeSingle().then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('Profilo non caricato', error.message);
          retry = setTimeout(() => load(attempt + 1), Math.min(30000, 2000 * 2 ** attempt));
          return;
        }
        const role = RUOLO[String(data?.ruolo)] ?? 'public';
        const youthCategoryId = (data?.categoria_giovanile_id as string | null) ?? null;
        setUser((u) => (u && u.id === uid ? { ...u, role, youthCategoryId } : u));
      });
    };
    load(0);
    return () => {
      active = false;
      clearTimeout(retry);
    };
  }, [uid, hasRole]);

  // Consensi: senza informativa (versione corrente) e dichiarazione 14 anni l'app mostra l'onboarding bloccante
  const loadConsents = useCallback(async (id: string, mail: string) => {
    let c = await caricaConsensi(id);
    if (!consensiValidi(c) && mail && (await registraConsensiInAttesa(id, mail))) c = await caricaConsensi(id);
    return c;
  }, []);

  useEffect(() => {
    if (!supabase || !uid) return;
    let active = true;
    loadConsents(uid, email)
      .then((c) => {
        if (active) setConsentState({ uid, consents: c, status: consensiValidi(c) ? 'ok' : 'mancanti' });
      })
      .catch((e) => {
        console.warn('Consensi non verificabili', e);
        if (active) setConsentState({ uid, consents: {}, status: 'errore' });
      });
    return () => {
      active = false;
    };
  }, [uid, email, loadConsents]);

  const current = uid && consentState?.uid === uid ? consentState : null;
  const consents = useMemo(() => current?.consents ?? {}, [current]);
  const consentStatus: StatoConsensi = !supabase || !uid ? 'nessuno' : current ? current.status : 'caricamento';

  const finishLogin = useCallback(async (u: AppUser) => {
    setUser((prev) => (prev?.id === u.id ? { ...u, role: u.role ?? prev.role, youthCategoryId: u.youthCategoryId ?? prev.youthCategoryId } : u));
    setGuest(false);
    await removeKey(K.guest);
    if (!supabase) await saveJSON(K.user, u);
    return u;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error(error?.message === 'Invalid login credentials' ? 'Email o password non corrette.' : error?.message ?? 'Accesso non riuscito.');
      await salvaProviderCorrente('email');
      return finishLogin(toAppUser(data.user));
    }
    await wait(900);
    return finishLogin({ id: 'demo', email, name: nameFromEmail(email) });
  }, [finishLogin]);

  const signUp = useCallback(async (name: string, email: string, password: string, marketing: boolean) => {
    if (supabase) {
      // le scelte si salvano prima: con la conferma email attiva non c'è ancora una sessione per scriverle,
      // e comunque le registra il caricamento dei consensi appena l'utente è collegato
      await salvaConsensiInAttesa(email, marketing);
      await salvaProviderCorrente('email');
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error || !data.user) {
        await rimuoviConsensiInAttesa();
        throw new Error(error?.message ?? 'Registrazione non riuscita.');
      }
      if (!data.session) return null;
      return finishLogin(toAppUser(data.user));
    }
    await wait(900);
    return finishLogin({ id: 'demo', email, name });
  }, [finishLogin]);

  const signInWithProvider = useCallback(async (provider: SocialProvider) => {
    if (supabase) return finishLogin(toAppUser(await accediCon(provider)));
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

  const clearLocal = useCallback(async () => {
    await removeKey(K.user);
    await removeKey(K.guest);
    setUser(null);
    setGuest(false);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await esciDaiProvider(user?.providers ?? []);
      await supabase.auth.signOut();
    }
    await clearLocal();
  }, [user?.providers, clearLocal]);

  const acceptConsents = useCallback(async (marketing: boolean, name?: string) => {
    if (!supabase) return;
    const u = await sessionUser();
    const nome = name?.trim();
    if (nome) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: nome } });
      if (error) throw new Error(`Salvataggio del nome non riuscito: ${error.message}`);
      await supabase.from('profili').update({ nome_completo: nome }).eq('id', u.id);
    }
    await registraConsensi(u.id, await providerCorrente(u), { eta_14_anni: true, informativa_privacy: true, marketing });
    const c = await caricaConsensi(u.id);
    setConsentState({ uid: u.id, consents: c, status: consensiValidi(c) ? 'ok' : 'mancanti' });
  }, []);

  const setMarketing = useCallback(async (on: boolean) => {
    if (!supabase) return;
    const u = await sessionUser();
    await registraConsensi(u.id, await providerCorrente(u), { marketing: on });
    const c = await caricaConsensi(u.id);
    setConsentState({ uid: u.id, consents: c, status: consensiValidi(c) ? 'ok' : 'mancanti' });
  }, []);

  const setYouthCategory = useCallback(async (id: string | null) => {
    if (!supabase || !uid) return;
    const { error } = await supabase.from('profili').update({ categoria_giovanile_id: id }).eq('id', uid);
    if (error) throw new Error(error.message);
    setUser((u) => (u && u.id === uid ? { ...u, youthCategoryId: id } : u));
  }, [uid]);

  const deleteAccount = useCallback(async () => {
    if (!supabase) throw new Error('Supabase non configurato.');
    const u = await sessionUser();
    const providers = providerDiUtente(u);
    // l'App Store chiede di revocare Sign in with Apple: serve un codice appena emesso, quindi una nuova conferma con Apple
    const appleAuthorizationCode = providers.includes('apple') && Platform.OS === 'ios' ? await codiceAutorizzazioneApple() : undefined;
    const { data, error } = await supabase.functions.invoke<{ codice: string }>('elimina-account', { body: { appleAuthorizationCode } });
    if (error) {
      let msg = 'Eliminazione non riuscita, riprova più tardi.';
      if (error instanceof FunctionsHttpError) {
        const b = await error.context.json().catch(() => null);
        if (b?.error) msg = b.error;
      }
      throw new Error(msg);
    }
    await esciDaiProvider(providers, true);
    // l'utente non esiste più sul server: basta chiudere la sessione locale
    await supabase.auth.signOut({ scope: 'local' });
    await clearLocal();
    return data?.codice ?? '';
  }, [clearLocal]);

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

  const setNoAds = useCallback((on: boolean) => {
    setNoAdsState(on);
    saveJSON(K.noAds, on);
  }, []);

  // la scelta resta salvata sul dispositivo, ma senza account (ospite o dopo l'uscita) la pubblicità torna
  const adsHidden = !!user && noAds;
  // anche la demo resta salvata sul dispositivo, ma con Supabase si vede solo da admin: chi non lo è non può spegnerla da Impostazioni
  const demoOn = demoLive && (!supabase || user?.role === 'admin');

  const value = useMemo<AppCtx>(() => ({
    ready, user, guest, prefs, demoLive: demoOn, noAds, adsHidden, consents, consentStatus,
    signIn, signUp, signInWithProvider, resetPassword, continueAsGuest, signOut,
    acceptConsents, setMarketing, setYouthCategory, deleteAccount,
    updatePrefs, toggleYouth, setDemoLive, setNoAds,
  }), [ready, user, guest, prefs, demoOn, noAds, adsHidden, consents, consentStatus, signIn, signUp, signInWithProvider, resetPassword, continueAsGuest, signOut, acceptConsents, setMarketing, setYouthCategory, deleteAccount, updatePrefs, toggleYouth, setDemoLive, setNoAds]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp deve stare dentro AppProvider');
  return v;
}
