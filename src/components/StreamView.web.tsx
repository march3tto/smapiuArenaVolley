import { createElement } from 'react';
import type { Stream } from '@/lib/stream';

/** Sul web react-native-webview non esiste: iframe diretto (il browser offre già il Picture in Picture) */
export function StreamView({ stream }: { stream: Stream }) {
  const src = stream.kind === 'youtube' ? `https://www.youtube.com/embed/${stream.id}?playsinline=1&autoplay=1&rel=0` : stream.url;
  return createElement('iframe', {
    src,
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    allowFullScreen: true,
    style: { border: 0, width: '100%', height: '100%', backgroundColor: '#000' },
  });
}
