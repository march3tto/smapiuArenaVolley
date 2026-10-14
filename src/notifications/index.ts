import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

/*
 * Notifiche push (Expo Push API, inviate dalla Edge Function invia-notifica):
 * - registra il token del dispositivo con la RPC registra_push_token (anche senza login);
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

/** Chiede il permesso e ritorna il token Expo, o null (simulatore, web, permesso negato, projectId mancante) */
export async function ottieniPushToken(): Promise<string | null> {
  if (!attive || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Notifiche', importance: Notifications.AndroidImportance.HIGH });
  }
  const cur = await Notifications.getPermissionsAsync();
  const granted = cur.granted || (cur.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) {
    console.warn('Notifiche push: permesso non concesso (Impostazioni iOS > Expo Go > Notifiche).');
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
 * Registrazione del token all'apertura (e a ogni cambio di utente, per collegarlo al profilo)
 * e apertura della schermata al tocco di una notifica, anche ad app chiusa.
 */
export function useNotifichePush({ userId, enabled, ready }: { userId: string | null; enabled: boolean; ready: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!attive || !ready || !enabled) return;
    let annullato = false;
    ottieniPushToken()
      .then((token) => (token && !annullato ? registraToken(token, userId) : undefined))
      .catch((e) => console.warn('Notifiche push non disponibili', e));
    return () => {
      annullato = true;
    };
  }, [userId, enabled, ready]);

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
