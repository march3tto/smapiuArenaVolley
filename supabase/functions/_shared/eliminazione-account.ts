// Cancellazione di un account, usata da elimina-account (dall'app) e facebook-eliminazione-dati (callback di Meta).
// Ordine: controllo ultimo admin → revoca Apple → file nello Storage → auth.admin.deleteUser → registro anonimo.
// Con deleteUser spariscono a cascata identità (email, Apple, Google, Facebook), profili, consensi_utente e push_token.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { revocaApple } from './apple.ts';
import { ErroreHttp } from './http.ts';

export type Origine = 'app' | 'facebook_callback' | 'staff';

export const admin: SupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Codice mostrato all'utente e a Meta: 16 caratteri esadecimali maiuscoli, non collegato a dati personali */
export function nuovoCodiceConferma(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** URL pubblico della pagina di stato (function stato-eliminazione) */
export function urlStato(codice: string): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/stato-eliminazione?code=${encodeURIComponent(codice)}`;
}

/** Registra una cancellazione (anche "nessun account trovato", con utente null) */
export async function registra(utenteId: string | null, provider: string[], origine: Origine, codice = nuovoCodiceConferma()): Promise<string> {
  const { error } = await admin.from('account_eliminati').insert({ utente_eliminato_id: utenteId, provider, origine, codice_conferma: codice });
  if (error) throw new Error(`registro account_eliminati: ${error.message}`);
  return codice;
}

/**
 * File dell'utente nello Storage.
 * Oggi non esiste una convenzione di percorso per utente: i bucket (players, news, sponsors, opponents, brand, giovanili)
 * contengono solo contenuti della società caricati dallo staff. Se in futuro gli utenti caricheranno file
 * (es. avatar in "avatars/<user_id>/..."), eliminarli qui elencando il prefisso <user_id>/ di ogni bucket.
 */
async function eliminaFileUtente(_utenteId: string): Promise<void> {
  // niente da eliminare
}

export interface EsitoEliminazione {
  codice: string;
  provider: string[];
  /** false se l'utente aveva Apple ma la revoca non è riuscita (o manca il codice): la cancellazione è avvenuta comunque */
  appleRevocato: boolean | null;
}

export async function eliminaAccount(utenteId: string, origine: Origine, appleAuthorizationCode?: string | null): Promise<EsitoEliminazione> {
  const { data: u, error: eu } = await admin.auth.admin.getUserById(utenteId);
  if (eu || !u.user) throw new ErroreHttp(404, 'utente_non_trovato', 'Account non trovato.');
  const provider = [...new Set((u.user.identities ?? []).map((i) => i.provider))].sort();

  // l'ultimo admin non si elimina (il database lo impedirebbe comunque con trg_proteggi_ruolo)
  const { data: prof } = await admin.from('profili').select('ruolo').eq('id', utenteId).maybeSingle();
  if (prof?.ruolo === 'admin') {
    const { count } = await admin.from('profili').select('id', { count: 'exact', head: true }).eq('ruolo', 'admin');
    if ((count ?? 0) <= 1) {
      throw new ErroreHttp(409, 'ultimo_admin', "Sei l'unico amministratore: nomina un altro admin dal pannello Supabase prima di eliminare l'account.");
    }
  }

  let appleRevocato: boolean | null = null;
  if (provider.includes('apple')) {
    if (!appleAuthorizationCode) {
      console.warn(`eliminazione ${utenteId}: identità Apple senza authorizationCode, revoca non eseguita`);
      appleRevocato = false;
    } else {
      try {
        await revocaApple(appleAuthorizationCode);
        appleRevocato = true;
      } catch (e) {
        // la revoca non deve impedire la cancellazione
        console.error(`eliminazione ${utenteId}: revoca Apple non riuscita`, e);
        appleRevocato = false;
      }
    }
  }

  await eliminaFileUtente(utenteId);

  const { error: ed } = await admin.auth.admin.deleteUser(utenteId);
  if (ed) throw new ErroreHttp(500, 'eliminazione_non_riuscita', `Eliminazione non riuscita: ${ed.message}`);

  // l'account non esiste più: se il registro fallisce si riprova una volta, poi si segnala nei log senza far fallire la richiesta
  const codice = nuovoCodiceConferma();
  try {
    await registra(utenteId, provider, origine, codice);
  } catch (e) {
    console.error('primo tentativo di registrazione fallito', e);
    await registra(utenteId, provider, origine, codice).catch((e2) => console.error(`account ${utenteId} eliminato ma non registrato`, e2));
  }
  return { codice, provider, appleRevocato };
}
