import { Linking, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { ExternalLink } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { TIER_LABEL, TIER_ORDER } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import type { Sponsor, SponsorTier } from '@/types';
import { space } from '@/theme/colors';

/** Corpo dei titoli delle categorie sponsor */
const SPONSOR_TITLE_SIZE = 24;

const COLS: Record<SponsorTier, [number, number]> = { title: [1, 3], main: [2, 2], sponsor: [2, 4], charity: [2, 2] };

/** Sponsor raggruppati per categoria, loghi su riquadro bianco */
export function SponsorGrid({ sponsors }: { sponsors: Sponsor[] }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const contentW = Math.min(width, 1120) - 28;
  const wide = width >= 760;

  return (
    <View style={{ gap: space.lg }}>
      {TIER_ORDER.map((tier) => {
        const list = sponsors.filter((s) => s.tier === tier);
        if (!list.length) return null;
        const cols = COLS[tier][wide ? 1 : 0];
        const gap = 12;
        const tileW = (contentW - gap * (cols - 1)) / cols;
        const big = tier === 'title' || tier === 'main';
        return (
          <View key={tier} style={{ gap: space.md }}>
            {/* titolo della categoria come sul sito: maiuscolo blu */}
            <Txt w={900} size={SPONSOR_TITLE_SIZE} display color="cobalt">{TIER_LABEL[tier]}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {list.map((s) => (
                <Pressy key={s.id} onPress={s.url ? () => Linking.openURL(s.url!) : undefined} disabled={!s.url} scaleTo={0.97}
                  accessibilityRole={s.url ? 'link' : undefined} accessibilityLabel={s.name}
                  style={{ width: tileW, borderRadius: 18, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
                  <View style={{ height: big ? 120 : 92, backgroundColor: '#fff', padding: big ? space.sm : space.sm }}>
                    <Image source={s.logo} style={{ flex: 1 }} contentFit="contain" />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.sm }}>
                    <Txt w={600} size={12.5} numberOfLines={2} style={{ flexShrink: 1 }}>{s.name}</Txt>
                    {s.url ? <ExternalLink size={11} color={c.accent} /> : null}
                  </View>
                </Pressy>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
