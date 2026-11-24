import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { ALLOW_SCREEN_CAPTURE } from '@/config/screenCapture';

// screenshot e registrazioni bloccati in tutta l'app: l'immagine catturata risulta nera
// (Android: FLAG_SECURE, anche l'anteprima nelle app recenti; iOS 13+). Sul web non è supportato.
// Nella build "demo" (ALLOW_SCREEN_CAPTURE) non attiva alcun blocco. L'hook va chiamato
// sempre, senza condizioni: il controllo è dentro l'effetto.
export function useScreenCaptureGuard() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (ALLOW_SCREEN_CAPTURE) {
      console.log('Screen capture allowed – demo build');
      return;
    }
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    if (Platform.OS === 'ios') ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => {});
  }, []);
}

// stessa cosa come componente da montare nell'albero (non disegna nulla)
export function ScreenCaptureGuard() {
  useScreenCaptureGuard();
  return null;
}
