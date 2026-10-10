import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Mic, Play } from 'lucide-react-native';
import { mediaLinks } from './MediaList';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { MediaItem } from '@/types';

/** Banner orizzontale basso per la home: video e podcast che scorrono di lato */
export function MediaStrip({ items }: { items: MediaItem[] }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {items.map((m) => {
        const { video, cover, open } = mediaLinks(m);
        return (
          <Pressy key={m.id} onPress={open} scaleTo={0.97} accessibilityRole="link" accessibilityLabel={`${video ? 'Video' : 'Podcast'}: ${m.title}`}
            style={{ width: 270, height: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
            <View style={{ width: 96, height: 54, borderRadius: 10, overflow: 'hidden', backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
              {cover ? <Image source={cover} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : null}
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(6,26,58,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                {video ? <Play size={12} color="#fff" fill="#fff" /> : <Mic size={12} color="#fff" />}
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt w={700} size={10.5} color={palette.gold}>{video ? 'VIDEO' : 'PODCAST'}{m.duration ? `  ·  ${m.duration}` : ''}</Txt>
              <Txt w={700} size={13} numberOfLines={2}>{m.title}</Txt>
            </View>
          </Pressy>
        );
      })}
    </ScrollView>
  );
}
