import { useState } from 'react';
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

/** Loghi per riga: [mobile, browser] */
const COLS: Record<SponsorTier, [number, number]> = { title: [1, 3], main: [2, 2], sponsor: [2, 4], charity: [2, 2] };
/** Proporzioni del riquadro logo: [mobile, browser] */
const RATIO: Record<SponsorTier, [number, number]> = { title: [16 / 9, 3 / 2], main: [3 / 2, 16 / 9], sponsor: [4 / 3, 4 / 3], charity: [4 / 3, 16 / 9] };

/** Sponsor raggruppati per categoria, loghi su riquadro bianco */
export function SponsorGrid({ sponsors }: { sponsors: Sponsor[] }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  // larghezza reale del contenitore (la griglia sta sia nella pagina sia dentro la card della tab Altro)
  const [contentW, setContentW] = useState(0);

  return (
    <View style={{ gap: space.lg }} onLayout={(e) => setContentW(e.nativeEvent.layout.width)}>
      {TIER_ORDER.map((tier) => {
        const list = sponsors.filter((s) => s.tier === tier);
        if (!list.length) return null;
        const cols = COLS[tier][wide ? 1 : 0];
        const gap = 12;
        // floor: evita che arrotondamenti subpixel mandino a capo l'ultima tile della riga
        const tileW = contentW ? Math.floor((contentW - gap * (cols - 1)) / cols) : 0;
        const ratio = RATIO[tier][wide ? 1 : 0];
        return (
          <View key={tier} style={{ gap: space.md }}>
            {/* titolo della categoria come sul sito: maiuscolo blu */}
            <Txt w={900} size={SPONSOR_TITLE_SIZE} display color="cobalt">{TIER_LABEL[tier]}</Txt>
            {contentW ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {list.map((s) => (
                <Pressy key={s.id} onPress={s.url ? () => Linking.openURL(s.url!) : undefined} disabled={!s.url} scaleTo={0.97}
                  accessibilityRole={s.url ? 'link' : undefined} accessibilityLabel={s.name}
                  style={{ width: tileW, borderRadius: 18, overflow: 'hidden', backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
                  <View style={{ aspectRatio: ratio, backgroundColor: '#fff', padding: space.xs }}>
                    <Image source={s.logo} style={{ flex: 1 }} contentFit="contain" />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.sm }}>
                    <Txt w={600} size={12.5} numberOfLines={2} style={{ flexShrink: 1 }}>{s.name}</Txt>
                    {s.url ? <ExternalLink size={11} color={c.accent} /> : null}
                  </View>
                </Pressy>
              ))}
            </View> : null}
          </View>
        );
      })}
    </View>
  );
}
