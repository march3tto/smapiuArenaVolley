import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { NotifPrefs } from '@/types';

/*
 * Notifiche push (Expo Push API, inviate dalla Edge Function invia-notifica):
 * - registra il token del dispositivo con la RPC registra_push_token (anche senza login);
 * - salva le scelte di Impostazioni con la RPC preferenze_push_token: il server invia solo i tipi attivati;
 * - mostra il banner anche ad app aperta;
 * - al tocco apre la schermata giusta in base a data.tipo (partita, notizia, video, podcast).
 */

/** Dati allegati a ogni notifica dalla function */
interface DatiNotifica {
  tipo?: 'partita' | 'notizia' | 'video' | 'podcast';
  id?: string;
}

const attive = Platform.OS !== 'web';

if (attive) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

/** projectId EAS: serve a getExpoPushTokenAsync (in Expo Go viene da app.json, expo.extra.eas.projectId) */
function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Token Expo del dispositivo, o null (simulatore, web, permesso negato, projectId mancante).
 * chiedi = false: non chiede il permesso (serve solo a comunicare al server che le notifiche sono spente).
 */
export async function ottieniPushToken(chiedi = true): Promise<string | null> {
  if (!attive || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Notifiche', importance: Notifications.AndroidImportance.HIGH });
  }
  const cur = await Notifications.getPermissionsAsync();
  const granted = cur.granted || (chiedi && cur.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) {
    if (chiedi) console.warn('Notifiche push: permesso non concesso (Impostazioni iOS > Expo Go > Notifiche).');
    return null;
  }
  const pid = projectId();
  if (!pid) {
    console.warn('Notifiche push: manca expo.extra.eas.projectId in app.json (si crea con "npx eas-cli init").');
    return null;
  }
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: pid });
  return data;
}

/** Salva il token sul database; per i genitori collega la categoria giovanile del profilo */
async function registraToken(token: string, userId: string | null) {
  if (!supabase) return;
  let categoria: string | null = null;
  if (userId) {
    const { data } = await supabase.from('profili').select('ruolo, categoria_giovanile_id').eq('id', userId).maybeSingle();
    if (data?.ruolo === 'genitore' && data.categoria_giovanile_id) categoria = String(data.categoria_giovanile_id);
  }
  const { error } = await supabase.rpc('registra_push_token', { p_token: token, p_piattaforma: Platform.OS, p_categoria_giovanile_id: categoria });
  if (error) console.warn('Notifiche push: registrazione del token non riuscita', error.message);
}

/** Scelte di Impostazioni sul server: notifiche spente o singoli tipi esclusi non vengono inviati a questo dispositivo */
async function salvaPreferenze(token: string, p: Omit<NotifPrefs, 'youth'>) {
  if (!supabase) return;
  const { error } = await supabase.rpc('preferenze_push_token', {
    p_token: token, p_attive: p.enabled, p_inizio: p.start, p_set: p.sets, p_finale: p.final, p_contenuti: p.news,
  });
  if (error) console.warn('Notifiche push: preferenze non salvate', error.message);
}

/** Apre la schermata legata alla notifica toccata */
async function apri(router: ReturnType<typeof useRouter>, d: DatiNotifica) {
  if (!d.id) return;
  switch (d.tipo) {
    case 'partita': {
      const { data } = supabase ? await supabase.from('partite').select('stato').eq('id', d.id).maybeSingle() : { data: null };
      if (data?.stato === 'live') router.push('/live');
      else router.navigate({ pathname: '/risultati', params: data?.stato === 'programmata' ? { filter: 'future' } : {} });
      break;
    }
    case 'notizia':
      router.push({ pathname: '/notizia/[id]', params: { id: d.id } });
      break;
    case 'video':
    case 'podcast':
      router.navigate({ pathname: '/news', params: { filtro: 'media' } });
      break;
  }
}

/**
 * Registrazione del token all'apertura (e a ogni cambio di utente, per collegarlo al profilo), preferenze di Impostazioni
 * sul server a ogni modifica, e apertura della schermata al tocco di una notifica, anche ad app chiusa.
 */
export function useNotifichePush({ userId, prefs, ready }: { userId: string | null; prefs: NotifPrefs; ready: boolean }) {
  const router = useRouter();
  const { enabled, start, sets, final, news } = prefs;

  useEffect(() => {
    if (!attive || !ready) return;
    let annullato = false;
    const scelte = { enabled, start, sets, final, news };
    // spente: niente richiesta di permesso, si avvisa solo il server (se il dispositivo era già registrato)
    ottieniPushToken(enabled)
      .then(async (token) => {
        if (!token || annullato) return;
        if (enabled) await registraToken(token, userId);
        await salvaPreferenze(token, scelte);
      })
      .catch((e) => console.warn('Notifiche push non disponibili', e));
    return () => {
      annullato = true;
    };
  }, [userId, ready, enabled, start, sets, final, news]);

  useEffect(() => {
    if (!attive) return;
    // app aperta da una notifica mentre era chiusa
    const ultima = Notifications.getLastNotificationResponse();
    if (ultima) {
      apri(router, ultima.notification.request.content.data as DatiNotifica);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      apri(router, r.notification.request.content.data as DatiNotifica);
    });
    return () => sub.remove();
  }, [router]);
}
