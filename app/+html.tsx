import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

/*
 * Pagina HTML che avvolge ogni rotta, solo sul web (l'app nativa non la usa).
 * Gira in Node durante l'export statico: niente API del browser qui.
 * Manifest, icone e meta per installare l'app come PWA (anche dalla Home di iOS).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="description" content="L'app ufficiale di Arena Volley Team: risultati, dirette, classifica, rosa e news." />
        <meta name="theme-color" content="#061A3A" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />

        {/* iOS: icona e aspetto quando l'app è aggiunta alla schermata Home */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arena Volley" />

        {/* come sul nativo lo scorrimento è delle ScrollView, non della pagina */}
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background-color:#061A3A;}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
