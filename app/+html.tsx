import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { blue } from '@/theme/colors';

/*
 * Pagina HTML che avvolge ogni rotta, solo sul web (l'app nativa non la usa).
 * Gira in Node durante l'export statico: niente API del browser qui.
 * Manifest, icone e meta per installare l'app come PWA (anche dalla Home di iOS).
 */
export default function Root({ children }: PropsWithChildren) {
  // da SDK 58 stili, CSS e script del bundle arrivano da qui: senza, la pagina non si idrata
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="it" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="description" content="L'app ufficiale di Arena Volley Team: risultati, dirette, classifica, rosa e news." />
        <meta name="theme-color" content={blue[900]} />
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

        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
