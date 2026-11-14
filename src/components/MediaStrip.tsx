import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { mediaLinks, useOpenMedia } from './MediaList';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { MediaItem } from '@/types';

/** Titolo su più righe: si va a capo a ogni trattino (gli spazi attorno si tolgono) */
const splitTitle = (t: string) => t.split(/\s*[-–—]\s*/).filter(Boolean).join('\n');

/** Banner orizzontale basso per la home: video e podcast che scorrono di lato */
export function MediaStrip({ items }: { items: MediaItem[] }) {
  const { c, mode } = useTheme();
  const openMedia = useOpenMedia();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {items.map((m) => {
        const { video, cover } = mediaLinks(m);
        return (
          <Pressy key={m.id} onPress={() => openMedia(m)} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${video ? 'Video' : 'Podcast'}: ${m.title}`}
            style={{ width: 320, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
            <View style={{ width: 96, height: 78, borderRadius: 10, overflow: 'hidden', backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
              {cover ? <Image source={cover} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : null}
              {video ? (
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(6,26,58,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={12} color="#fff" fill="#fff" />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: space.xs }}>
              {/* niente scritta "podcast": l'etichetta resta solo per i video, la durata per tutti */}
              {video || m.duration ? (
                <Txt w={700} size={12.5} color={mode === 'dark' ? palette.gold : palette.blue}>{[video ? 'VIDEO' : '', m.duration].filter(Boolean).join('  ·  ')}</Txt>
              ) : null}
              <Txt w={700} size={15.5} numberOfLines={4}>{splitTitle(m.title)}</Txt>
            </View>
          </Pressy>
        );
      })}
    </ScrollView>
  );
}
