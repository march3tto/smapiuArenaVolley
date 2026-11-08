import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { loadJSON, removeKey, saveJSON } from '@/lib/storage';
import type { NotifPrefs } from '@/types';

/*
 * Notifiche push per gli utenti con accesso, attivate SOLO da Impostazioni con un tocco esplicito.
 * Nessuna funzione di questo file va chiamata all'avvio: l'unica che può mostrare il popup di sistema è attivaNotifiche.
 * Il token del dispositivo sta nella tabella dispositivi_push (migration 20261107000100), una riga per token,
 * con le scelte per tipo di Impostazioni che la function invia-notifica usa per filtrare i destinatari.
 */

export type EsitoAttivazione = 'attivate' | 'negate' | 'non_supportato';
export type PermessoNotifiche = 'granted' | 'denied' | 'undetermined' | 'non_supportato';

export interface StatoNotifiche {
  /** Permesso di sistema (iOS/Android) */
  permesso: PermessoNotifiche;
  /** L'utente ha un token con attive = true per questo dispositivo */
  attiveSuDispositivo: boolean;
}

/** Scelte per tipo di Impostazioni (senza interruttore generale e giovanili) */
export type PreferenzeNotifiche = Omit<NotifPrefs, 'youth' | 'enabled'>;

/** Ultimo token registrato da questo dispositivo: serve a disattivarlo o rimuoverlo senza richiamare le API native */
const CHIAVE_TOKEN = 'av-push-token';
const TABELLA = 'dispositivi_push';

const piattaformaSupportata = Platform.OS === 'ios' || Platform.OS === 'android';

/** Scelte di Impostazioni → colonne di dispositivi_push */
function colonnePreferenze(p: PreferenzeNotifiche) {
  return {
    inizio_partita: p.start,
    fine_set: p.sets,
    risultato_finale: p.final,
    contenuti: p.news,
    game_day: p.gameDay,
    voto_mvp: p.mvp,
  };
}

function erroreSupabase(azione: string, e: { message: string }): Error {
  return new Error(`${azione} non riuscita: ${e.message}`);
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Permesso di sistema attuale. Usa solo getPermissionsAsync: non mostra mai il popup */
export async function permessoNotifiche(): Promise<PermessoNotifiche> {
  if (!piattaformaSupportata || !Device.isDevice) return 'non_supportato';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermessoNotifiche;
  } catch (e) {
    console.warn('Notifiche: lettura del permesso non riuscita', e);
    return 'undetermined';
  }
}

/**
 * Token del dispositivo senza chiedere nulla: quello salvato all'attivazione oppure, se il permesso è già concesso,
 * quello restituito da Expo (getExpoPushTokenAsync non mostra popup). null se non disponibile.
 */
async function tokenCorrente(): Promise<string | null> {
  const salvato = await loadJSON<string>(CHIAVE_TOKEN);
  if (salvato) return salvato;
  if ((await permessoNotifiche()) !== 'granted') return null;
  const pid = projectId();
  if (!pid) return null;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    return data;
  } catch (e) {
    console.warn('Notifiche: token del dispositivo non disponibile', e);
    return null;
  }
}

/** Categoria giovanile da collegare al token: solo per i genitori, per ricevere le partite della categoria */
async function categoriaGiovanile(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('profili').select('ruolo, categoria_giovanile_id').eq('id', userId).maybeSingle();
  return data?.ruolo === 'genitore' && data.categoria_giovanile_id ? String(data.categoria_giovanile_id) : null;
}

/**
 * Attiva le notifiche per l'utente su questo dispositivo. Da chiamare SOLO dopo un tocco dell'utente in Impostazioni:
 * se il permesso non è mai stato chiesto, qui compare il popup di sistema.
 * 'negate': permesso rifiutato (la UI propone Linking.openSettings()).
 */
export async function attivaNotifiche(userId: string, preferenze?: PreferenzeNotifiche): Promise<EsitoAttivazione> {
  if (!piattaformaSupportata || !Device.isDevice) return 'non_supportato';
  if (!supabase) throw new Error('Servizio non configurato: impossibile attivare le notifiche.');

  try {
    // Android 13+: il canale va creato prima della richiesta di permesso
    if (Platform.OS === 'android') {
      // AndroidImportance arriva da un export * che il plugin import non segue (il typecheck lo trova)
      // eslint-disable-next-line import/namespace
      await Notifications.setNotificationChannelAsync('default', { name: 'Notifiche', importance: Notifications.AndroidImportance.HIGH });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') {
      ({ status } = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
    }
    if (status !== 'granted') return 'negate';

    const pid = projectId();
    if (!pid) throw new Error('Configurazione incompleta: manca il projectId EAS (expo.extra.eas.projectId).');
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: pid });

    const riga = {
      user_id: userId,
      token,
      piattaforma: Platform.OS,
      attive: true,
      aggiornato_il: new Date().toISOString(),
      categoria_giovanile_id: await categoriaGiovanile(userId),
      ...(preferenze ? colonnePreferenze(preferenze) : {}),
    };
    let { error } = await supabase.from(TABELLA).upsert(riga, { onConflict: 'token' });
    // token ancora collegato a un altro account (uscita senza logout, es. sessione scaduta): si libera e si riprova
    if (error?.code === '42501') {
      const { error: e } = await supabase.rpc('libera_dispositivo_push', { p_token: token });
      if (e) throw erroreSupabase('Liberazione del dispositivo', e);
      ({ error } = await supabase.from(TABELLA).upsert(riga, { onConflict: 'token' }));
    }
    if (error) throw erroreSupabase('Registrazione del dispositivo', error);

    await saveJSON(CHIAVE_TOKEN, token);
    return 'attivate';
  } catch (e) {
    throw e instanceof Error ? e : new Error('Attivazione delle notifiche non riuscita.');
  }
}

/** Disattiva le notifiche dell'utente su questo dispositivo (attive = false, il token resta) */
export async function disattivaNotifiche(userId: string): Promise<void> {
  if (!supabase) return;
  const token = await tokenCorrente();
  if (!token) return;
  try {
    const { error } = await supabase.from(TABELLA)
      .update({ attive: false, aggiornato_il: new Date().toISOString() })
      .eq('token', token).eq('user_id', userId);
    if (error) throw erroreSupabase('Disattivazione delle notifiche', error);
  } catch (e) {
    throw e instanceof Error ? e : new Error('Disattivazione delle notifiche non riuscita.');
  }
}

/** Permesso di sistema e stato del token dell'utente su questo dispositivo, per riallineare l'interruttore */
export async function statoNotifiche(userId: string): Promise<StatoNotifiche> {
  const permesso = await permessoNotifiche();
  if (permesso === 'non_supportato' || !supabase) return { permesso, attiveSuDispositivo: false };
  const token = await tokenCorrente();
  if (!token) return { permesso, attiveSuDispositivo: false };
  try {
    const { data, error } = await supabase.from(TABELLA).select('attive').eq('token', token).eq('user_id', userId).maybeSingle();
    if (error) throw erroreSupabase('Lettura dello stato delle notifiche', error);
    return { permesso, attiveSuDispositivo: !!data?.attive };
  } catch (e) {
    throw e instanceof Error ? e : new Error('Lettura dello stato delle notifiche non riuscita.');
  }
}

/** Salva le scelte per tipo di Impostazioni sul token dell'utente (nessun effetto se il dispositivo non è registrato) */
export async function salvaPreferenzeNotifiche(userId: string, preferenze: PreferenzeNotifiche): Promise<void> {
  if (!supabase) return;
  const token = await tokenCorrente();
  if (!token) return;
  try {
    const { error } = await supabase.from(TABELLA)
      .update({ ...colonnePreferenze(preferenze), aggiornato_il: new Date().toISOString() })
      .eq('token', token).eq('user_id', userId);
    if (error) throw erroreSupabase('Salvataggio delle preferenze', error);
  } catch (e) {
    throw e instanceof Error ? e : new Error('Salvataggio delle preferenze non riuscito.');
  }
}

/**
 * Elimina il token di questo dispositivo dall'account. Va chiamata PRIMA di supabase.auth.signOut():
 * dopo il logout la RLS non permetterebbe più di toccare la riga. Non blocca mai il logout.
 */
export async function rimuoviTokenAlLogout(): Promise<void> {
  try {
    const token = await loadJSON<string>(CHIAVE_TOKEN);
    if (token && supabase) {
      const { error } = await supabase.from(TABELLA).delete().eq('token', token);
      if (error) console.warn('Notifiche: rimozione del dispositivo non riuscita', error.message);
    }
  } catch (e) {
    console.warn('Notifiche: rimozione del dispositivo non riuscita', e);
  } finally {
    await removeKey(CHIAVE_TOKEN);
  }
}
