import { WebView } from 'react-native-webview';
import { EMBED_ORIGIN, youtubeEmbedHtml, type Stream } from '@/lib/stream';

/**
 * Video della diretta dentro l'app. Su iOS niente Picture in Picture: richiederebbe la background mode
 * "audio", che l'app non dichiara, e uscendo dall'app il video si ferma. Su Android lo gestisce modules/pip-diretta.
 */
export function StreamView({ stream }: { stream: Stream }) {
  return (
    <WebView
      source={stream.kind === 'youtube' ? { html: youtubeEmbedHtml(stream.id), baseUrl: EMBED_ORIGIN } : { uri: stream.url }}
      style={{ flex: 1, backgroundColor: '#000' }}
      allowsInlineMediaPlayback
      allowsPictureInPictureMediaPlayback={false}
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      allowsBackForwardNavigationGestures={stream.kind === 'web'}
      // il player YouTube non deve aprire altre pagine dentro la finestrella
      setSupportMultipleWindows={false}
    />
  );
}
