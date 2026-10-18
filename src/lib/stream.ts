/**
 * Diretta di una partita: il campo id_video_youtube_live può contenere l'id di un video YouTube,
 * un link YouTube (watch, youtu.be, /live/, /embed/) oppure il link di un altro streaming (es. federazione).
 */
export type Stream = { kind: 'youtube'; id: string; url: string } | { kind: 'web'; url: string };

const YT_ID = /^[\w-]{11}$/;

export function parseStream(ref: string): Stream | null {
  const s = ref.trim();
  if (!s) return null;
  if (YT_ID.test(s)) return { kind: 'youtube', id: s, url: `https://www.youtube.com/watch?v=${s}` };
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]{11})/)?.[1] ?? null;
  }
  if (id && YT_ID.test(id)) return { kind: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` };
  return { kind: 'web', url: u.toString() };
}

/** Origine "vera" per il player YouTube incorporato: senza referrer YouTube rifiuta la riproduzione (errore 153) */
export const EMBED_ORIGIN = 'https://march3tto.github.io/smapiuArenaVolley/';

/** Pagina con il player YouTube a tutta area: playsinline per restare nella finestra, PiP e schermo intero ammessi */
export function youtubeEmbedHtml(id: string) {
  const src = `https://www.youtube.com/embed/${id}?playsinline=1&autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent(EMBED_ORIGIN.replace(/\/[^/]*\/?$/, ''))}`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}
