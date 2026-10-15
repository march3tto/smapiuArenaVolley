import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { loadJSON, removeKey, saveJSON } from './storage';
import type { Provider } from './auth';

/*
 * Consensi dell'utente (tabella consensi_utente, append-only: ogni scelta è una nuova riga).
 * Validi se: informativa privacy accettata nella versione corrente + dichiarazione di avere almeno 14 anni.
 */

const extra = (Constants.expoConfig?.extra ?? {}) as { privacyPolicyUrl?: string; privacyPolicyVersion?: string };
/** Da app.config.ts */
export const PRIVACY_POLICY_URL = extra.privacyPolicyUrl ?? '';
export const PRIVACY_POLICY_VERSION = extra.privacyPolicyVersion ?? '';

/** Apre l'informativa nel browser interno all'app */
export const apriInformativa = () => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => undefined);

export type TipoConsenso = 'informativa_privacy' | 'eta_14_anni' | 'marketing';

export interface Consenso {
  concesso: boolean;
  versione: string;
  /** ISO 8601 */
  data: string;
  provider: Provider | null;
}

export type Consensi = Partial<Record<TipoConsenso, Consenso>>;

export function consensiValidi(c: Consensi): boolean {
  return c.informativa_privacy?.concesso === true && c.informativa_privacy.versione === PRIVACY_POLICY_VERSION && c.eta_14_anni?.concesso === true;
}

export async function caricaConsensi(userId: string): Promise<Consensi> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('consensi_utente_attuali')
    .select('tipo, concesso, versione_informativa, provider_accesso, creato_il')
    .eq('utente_id', userId);
  if (error) throw new Error(error.message);
  const out: Consensi = {};
  for (const r of data ?? []) {
    out[r.tipo as TipoConsenso] = { concesso: r.concesso, versione: r.versione_informativa, data: r.creato_il, provider: r.provider_accesso };
  }
  return out;
}

export async function registraConsensi(userId: string, provider: Provider, scelte: Partial<Record<TipoConsenso, boolean>>): Promise<void> {
  if (!supabase) return;
  const righe = (Object.entries(scelte) as [TipoConsenso, boolean][]).map(([tipo, concesso]) => ({
    utente_id: userId,
    tipo,
    concesso,
    versione_informativa: PRIVACY_POLICY_VERSION,
    provider_accesso: provider,
  }));
  if (!righe.length) return;
  const { error } = await supabase.from('consensi_utente').insert(righe);
  if (error) throw new Error(`Salvataggio dei consensi non riuscito: ${error.message}`);
}

/*
 * Registrazione con email e conferma dell'indirizzo attiva: signUp non apre una sessione e i consensi non si possono
 * ancora salvare. Le scelte fatte nel modulo restano sul dispositivo e si registrano al primo accesso con la stessa email.
 */
const K_IN_ATTESA = 'av-consensi-in-attesa';
interface InAttesa {
  email: string;
  marketing: boolean;
  versione: string;
}

export const salvaConsensiInAttesa = (email: string, marketing: boolean) =>
  saveJSON(K_IN_ATTESA, { email: email.toLowerCase(), marketing, versione: PRIVACY_POLICY_VERSION } satisfies InAttesa);

export const rimuoviConsensiInAttesa = () => removeKey(K_IN_ATTESA);

/** Se ci sono scelte in attesa per questa email (e per la versione corrente dell'informativa), le registra */
export async function registraConsensiInAttesa(userId: string, email: string): Promise<boolean> {
  const p = await loadJSON<InAttesa>(K_IN_ATTESA);
  if (!p || p.email !== email.toLowerCase()) return false;
  await removeKey(K_IN_ATTESA);
  if (p.versione !== PRIVACY_POLICY_VERSION) return false;
  await registraConsensi(userId, 'email', { eta_14_anni: true, informativa_privacy: true, marketing: p.marketing });
  return true;
}
