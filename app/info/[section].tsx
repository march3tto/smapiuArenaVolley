import { Linking, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2, Dumbbell, Navigation, User, Volleyball, X, type LucideIcon } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
import { InstagramStrip } from '@/components/InstagramStrip';
import { MediaList } from '@/components/MediaList';
import { SponsorGrid } from '@/components/SponsorGrid';
import { Txt } from '@/components/Txt';
import { INFO, ORGANIGRAMMA, type InfoKey } from '@/data/altro';
import { ORGANIGRAMMA_PHOTO } from '@/data/assets';
import { useData } from '@/store/DataProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Venue } from '@/types';

const VENUE_ICON: Record<Venue['kind'], LucideIcon> = { arena: Building2, palasport: Volleyball, palestra: Dumbbell };

/** Dettaglio di una voce della tab Altro */
export default function InfoScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section: string }>();
  const { sponsors, venues, media } = useData();
  const info = INFO[section as InfoKey];

  if (!info) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color="muted">Pagina non trovata.</Txt>
      </View>
    );
  }
  const { Icon } = info;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: Platform.OS === 'ios' ? 22 : insets.top + 16, paddingBottom: insets.bottom + 30, gap: 16, width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
            <Icon size={20} color={palette.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt w={800} size={22} style={{ letterSpacing: -0.4 }}>{info.title}</Txt>
            <Txt size={13} color="muted">{info.subtitle}</Txt>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={18} color={c.text} />
          </IconButton>
        </View>

        {info.key === 'organigramma' ? (
          <>
            <CoverImage source={ORGANIGRAMMA_PHOTO} style={{ aspectRatio: 1024 / 683, borderRadius: 24, backgroundColor: c.fill }} />
            <Txt size={15} color="muted" style={{ lineHeight: 22, paddingHorizontal: 4 }}>{info.body}</Txt>
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {ORGANIGRAMMA.map((p, i) => (
                <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                    <User size={20} color={c.cobalt} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt w={700} size={16}>{p.name}</Txt>
                    <Txt w={700} size={11.5} color="cobalt" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>{p.role}</Txt>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : info.key === 'palestre' ? (
          venues.map((v) => {
            const VIcon = VENUE_ICON[v.kind];
            return (
              <Card key={v.name} style={{ gap: 4 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2, marginBottom: 8 }}>
                  <VIcon size={20} color={c.cobalt} />
                </View>
                <Txt w={700} size={16}>{v.name}</Txt>
                <Txt size={13} color="muted">{v.city}</Txt>
                <Txt size={14} style={{ marginVertical: 8 }}>{v.use}</Txt>
                <Button size="sm" label="Indicazioni" style={{ alignSelf: 'flex-start' }} icon={<Navigation size={14} color={c.text} />}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.city}`)}`)} />
              </Card>
            );
          })
        ) : info.key === 'sponsor' ? (
          <SponsorGrid sponsors={sponsors} />
        ) : info.key === 'galleria' ? (
          <>
            <InstagramStrip />
            {media.length ? (
              <View style={{ gap: 12 }}>
                <Txt w={800} size={18} style={{ letterSpacing: -0.3, paddingHorizontal: 4 }}>Video e podcast</Txt>
                <MediaList items={media} />
              </View>
            ) : null}
          </>
        ) : (
          <Card style={{ gap: 14 }}>
            {(info.body ?? '').split(/\n\s*\n/).map((p, i) => (
              <Txt key={i} size={16} style={{ lineHeight: 25 }}>{p.trim()}</Txt>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
