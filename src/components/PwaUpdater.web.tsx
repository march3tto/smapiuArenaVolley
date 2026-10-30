import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';
import { Button } from './Button';
import { Txt } from './Txt';
import { palette, space } from '@/theme/colors';

/** Ogni quanto si controlla se è uscita una nuova versione mentre l'app resta aperta */
const CHECK_MS = 30 * 60 * 1000;

/**
 * PWA: registra il service worker (solo nella build di produzione, generato da scripts/build-sw.mjs) e,
 * quando ne arriva uno nuovo, mostra "Nuova versione disponibile". Toccando Aggiorna il nuovo service worker
 * prende il controllo e la pagina si ricarica.
 */
export function PwaUpdater() {
  const insets = useSafeAreaInsets();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    let reg: ServiceWorkerRegistration | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    // solo se una versione precedente controllava già la pagina: alla prima installazione non c'è nulla da aggiornare
    const track = (w: ServiceWorker | null) => {
      if (!w) return;
      const check = () => { if (w.state === 'installed' && sw.controller) setWaiting(w); };
      check();
      w.addEventListener('statechange', check);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') reg?.update().catch(() => {}); };
    // il service worker nuovo ha preso il controllo (dopo Aggiorna): si ricarica una volta sola
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    sw.register('/sw.js').then((r) => {
      reg = r;
      track(r.waiting);
      r.addEventListener('updatefound', () => track(r.installing));
      timer = setInterval(() => r.update().catch(() => {}), CHECK_MS);
    }).catch((e) => console.warn('Service worker non registrato', e));
    sw.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer) clearInterval(timer);
      sw.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!waiting) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: 12, right: 12, alignItems: 'center', zIndex: 1000 }}>
      <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingLeft: space.md, borderRadius: 18,
        backgroundColor: palette.navy, borderWidth: 1, borderColor: 'rgba(255,213,3,0.55)' }}>
        <RefreshCw size={18} color={palette.gold} />
        <Txt w={600} size={14} color={palette.white} style={{ flex: 1 }}>Nuova versione disponibile</Txt>
        <Button size="sm" variant="gold" label="Aggiorna" onPress={() => waiting.postMessage({ type: 'SKIP_WAITING' })} />
      </View>
    </View>
  );
}
