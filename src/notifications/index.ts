import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

/*
 * Notifiche push all'avvio (Expo Push API, inviate dalla Edge Function invia-notifica):
 * - solo setNotificationHandler: nessuna richiesta di permesso e nessun token qui
 *   (attivazione, token e preferenze sono in src/services/notifiche.ts, richiamati da Impostazioni);
 * - mostra il banner anche ad app aperta;
 * - al tocco apre la schermata giusta in base a data.tipo (partita, mvp, notizia, video, podcast).
 */

/** Dati allegati a ogni notifica dalla function */
interface DatiNotifica {
  tipo?: 'partita' | 'mvp' | 'notizia' | 'video' | 'podcast';
  id?: string;
}

const attive = Platform.OS !== 'web';

if (attive) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
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
    case 'mvp':
      // si apre la diretta direttamente sulla scheda del voto
      router.push({ pathname: '/live', params: { scheda: 'mvp' } });
      break;
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
 * Apertura della schermata al tocco di una notifica, anche ad app chiusa. Non chiede permessi e non registra token:
 * l'attivazione delle notifiche avviene solo da Impostazioni (src/services/notifiche.ts).
 */
export function useAperturaNotifiche() {
  const router = useRouter();

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
