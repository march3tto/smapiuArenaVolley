/*
 * Service worker della PWA, generato con Workbox dopo `expo export -p web` (npm run build:web).
 * - precache: bundle JS/CSS di Expo, icone, manifest e pagina offline;
 * - HTML: prima la rete (si vede sempre l'ultima versione), la copia in cache serve solo offline;
 * - JS/CSS/immagini/font con hash nel nome: prima la cache (il nome cambia a ogni versione);
 * - Supabase (REST, Auth, Realtime, Storage, Edge Functions come l'assistente) e ogni altro dominio
 *   non passano dalla cache: nessuna regola li intercetta, vanno sempre in rete.
 * Il nuovo service worker resta in attesa finché l'utente non tocca "Aggiorna" (PwaUpdater.web.tsx).
 */
import { generateSW } from 'workbox-build';

const dist = process.argv[2] ?? 'dist';

const { count, size, warnings } = await generateSW({
  globDirectory: dist,
  globPatterns: ['_expo/static/**/*.{js,css}', 'icon-*.png', 'apple-touch-icon.png', 'favicon.ico', 'manifest.json', 'offline.html'],
  swDest: `${dist}/sw.js`,
  // il bundle web è di qualche MB: deve stare nel precache
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  // i nomi con hash di Expo non hanno bisogno di revisione
  dontCacheBustURLsMatching: /\/_expo\/static\/|\.[0-9a-f]{32}\./,
  clientsClaim: true,
  skipWaiting: false,
  cleanupOutdatedCaches: true,
  // l'HTML si gestisce sotto (prima la rete), non con il fallback del precache
  navigateFallback: undefined,
  offlineGoogleAnalytics: false,
  sourcemap: false,
  runtimeCaching: [
    {
      // pagine dell'app: rete, poi copia salvata, poi pagina offline
      urlPattern: ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pagine',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 40 },
        precacheFallback: { fallbackURL: 'offline.html' },
      },
    },
    {
      // file con hash di Metro (immagini, font, bundle): non cambiano mai a parità di nome
      urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')),
      handler: 'CacheFirst',
      options: {
        cacheName: 'asset',
        expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
});

for (const w of warnings) console.warn(`[sw] ${w}`);
console.log(`[sw] ${dist}/sw.js: ${count} file in precache (${(size / 1024 / 1024).toFixed(1)} MB)`);
