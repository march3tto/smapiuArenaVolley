import { WebView } from 'react-native-webview';
import { EMBED_ORIGIN, youtubeEmbedHtml, type Stream } from '@/lib/stream';

/**
 * Video della diretta dentro l'app. Su iOS il video può uscire dall'app in Picture in Picture
 * (pulsante PiP del player a schermo intero, o andando alla Home mentre è a schermo intero).
 */
export function StreamView({ stream }: { stream: Stream }) {
  return (
    <WebView
      source={stream.kind === 'youtube' ? { html: youtubeEmbedHtml(stream.id), baseUrl: EMBED_ORIGIN } : { uri: stream.url }}
      style={{ flex: 1, backgroundColor: '#000' }}
      allowsInlineMediaPlayback
      allowsPictureInPictureMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      allowsBackForwardNavigationGestures={stream.kind === 'web'}
      // il player YouTube non deve aprire altre pagine dentro la finestrella
      setSupportMultipleWindows={false}
    />
  );
}
