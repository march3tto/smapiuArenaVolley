import { Linking, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { ExternalLink } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { TIER_LABEL, TIER_ORDER } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import type { Sponsor, SponsorTier } from '@/types';

const COLS: Record<SponsorTier, [number, number]> = { title: [1, 3], main: [2, 2], sponsor: [2, 4], charity: [2, 2] };

/** Sponsor raggruppati per categoria, loghi su riquadro bianco */
export function SponsorGrid({ sponsors }: { sponsors: Sponsor[] }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const contentW = Math.min(width, 1120) - 28;
  const wide = width >= 760;

  return (
    <View style={{ gap: 22 }}>
      {TIER_ORDER.map((tier) => {
        const list = sponsors.filter((s) => s.tier === tier);
        if (!list.length) return null;
        const cols = COLS[tier][wide ? 1 : 0];
        const gap = 12;
        const tileW = (contentW - gap * (cols - 1)) / cols;
        const big = tier === 'title' || tier === 'main';
        return (
          <View key={tier} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt w={700} size={13} color="muted">{TIER_LABEL[tier]}</Txt>
              <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, backgroundColor: c.fill2 }}>
                <Txt w={700} size={11}>{list.length}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {list.map((s) => (
                <Pressy key={s.id} onPress={s.url ? () => Linking.openURL(s.url!) : undefined} disabled={!s.url} scaleTo={0.97}
                  accessibilityRole={s.url ? 'link' : undefined} accessibilityLabel={s.name}
                  style={{ width: tileW, borderRadius: 18, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
                  <View style={{ height: big ? 120 : 92, backgroundColor: '#fff', padding: big ? 10 : 6 }}>
                    <Image source={s.logo} style={{ flex: 1 }} contentFit="contain" />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 9 }}>
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
