import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import { Mic, Play } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { youtubeThumb, youtubeUrl } from '@/lib/api';
import { newsDate } from '@/lib/format';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { MediaItem } from '@/types';

/** Video (YouTube) e podcast della tabella "media": si aprono nell'app esterna */
export function MediaList({ items }: { items: MediaItem[] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {items.map((m) => {
        const isUrl = /^https?:\/\//.test(m.ref);
        const video = m.type === 'video';
        const cover = m.cover ?? (video && !isUrl ? youtubeThumb(m.ref) : null);
        const open = () => Linking.openURL(isUrl ? m.ref : youtubeUrl(m.ref));
        return (
          <Pressy key={m.id} onPress={open} scaleTo={0.98} accessibilityRole="link" accessibilityLabel={m.title}
            style={{ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
            <View style={{ width: 112, aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
              {cover ? <Image source={cover} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : null}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(5,13,36,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                {video ? <Play size={15} color="#fff" fill="#fff" /> : <Mic size={15} color="#fff" />}
              </View>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', gap: 3 }}>
              <Txt w={700} size={11} color={palette.gold}>{video ? 'VIDEO' : 'PODCAST'}{m.duration ? `  ·  ${m.duration}` : ''}</Txt>
              <Txt w={700} size={14.5} numberOfLines={2}>{m.title}</Txt>
              {m.date ? <Txt size={12} color="muted">{newsDate(m.date)}</Txt> : null}
            </View>
          </Pressy>
        );
      })}
    </View>
  );
}
