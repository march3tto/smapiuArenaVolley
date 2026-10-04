import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
import { Txt } from '@/components/Txt';
import { newsDate } from '@/lib/format';
import { useData } from '@/store/DataProvider';
import { useTheme } from '@/theme/ThemeProvider';

/** Notizia completa: copertina, categoria, data, titolo e testo diviso in paragrafi */
export default function NewsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { news } = useData();
  const n = news.find((x) => x.id === id);

  if (!n) {
    return (
      <View style={{ flex: 1, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color="muted">Notizia non trovata.</Txt>
      </View>
    );
  }
  // i paragrafi nel database sono separati da una riga vuota
  const paragraphs = (n.body || n.excerpt).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ height: 420, backgroundColor: c.fill }}>
          {n.image ? <CoverImage source={n.image} style={{ flex: 1 }} /> : null}
          <LinearGradient colors={['rgba(5,13,36,0.35)', 'transparent']} locations={[0, 0.25]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <IconButton label="Chiudi" onPress={() => router.back()} style={{ position: 'absolute', top: insets.top > 30 ? 16 : insets.top + 12, right: 14, backgroundColor: 'rgba(5,13,36,0.55)' }}>
            <X size={18} color="#fff" />
          </IconButton>
        </View>
        <View style={{ paddingHorizontal: 22, marginTop: 12, gap: 6, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: c.fill2 }}>
              <Txt w={700} size={12} color="accent">{n.category}</Txt>
            </View>
            <Txt size={13} color="muted">{newsDate(n.date)}</Txt>
          </View>
          <Txt w={900} size={26} style={{ letterSpacing: -0.6, marginTop: 4 }}>{n.title}</Txt>
          <View style={{ gap: 14, marginTop: 14 }}>
            {paragraphs.map((p, i) => (
              <Txt key={i} size={16} style={{ lineHeight: 25 }}>{p}</Txt>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
