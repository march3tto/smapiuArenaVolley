import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { IconButton } from '@/components/IconButton';
import { InfoBody, SponsorPopup } from '@/components/InfoContent';
import { Txt } from '@/components/Txt';
import { INFO, type InfoKey } from '@/data/altro';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Dettaglio di una voce della tab Altro a pagina intera (link diretti); nella tab le card si espandono sul posto */
export default function InfoScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section: string }>();
  const info = INFO[section as InfoKey];

  if (!info) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color="muted">Pagina non trovata.</Txt>
      </View>
    );
  }
  const { Icon } = info;
  const sponsorPage = info.key === 'sponsor';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.md, paddingTop: Platform.OS === 'ios' ? space.lg : insets.top + space.md, paddingBottom: insets.bottom + space.xl, gap: space.md, width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xs }}>
          {/* la pagina Sponsor parte direttamente dalle categorie: niente icona, titolo e sottotitolo, solo la X */}
          {sponsorPage ? <View style={{ flex: 1 }} /> : (
            <>
              <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
                <Icon size={20} color={palette.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt w={800} size={22} style={{ letterSpacing: -0.4 }}>{info.title}</Txt>
                <Txt size={13} color="muted">{info.subtitle}</Txt>
              </View>
            </>
          )}
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={18} color={c.text} />
          </IconButton>
        </View>

        <InfoBody section={info.key} />
      </ScrollView>
      {sponsorPage ? <SponsorPopup /> : null}
    </View>
  );
}
