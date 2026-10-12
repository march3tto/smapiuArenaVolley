import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Txt } from '@/components/Txt';
import { INFO, MEDIA, SOCIETA, type InfoKey } from '@/data/altro';
import { brand, palette } from '@/theme/colors';

/** Wallet "La società": altezza della card e parte visibile (testata) quando è coperta dalla successiva */
const CARD_H = 168;
const PEEK = 74;
/** Sfumature delle card, in ordine: blu del brand, una card in giallo */
const WALLET: [string, string][] = [
  [brand.bluScuro, brand.bluNotte],
  [brand.blu, brand.bluScuro],
  [palette.gold, '#F2C200'],
  [brand.bluNotte, brand.bluScuro],
  [brand.blu, '#0D4A8C'],
  [brand.bluScuro, brand.footer],
];

export default function Altro() {
  const router = useRouter();
  const open = (section: InfoKey) => router.push({ pathname: '/info/[section]', params: { section } });

  return (
    <Screen>
      <SectionHeader big title="Altro" subtitle="Sponsor, società, palestre e contatti." />

      <Group title="Sostenitori e media">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {MEDIA.map((k) => {
            const { Icon, title, subtitle } = INFO[k];
            return (
              <Pressy key={k} onPress={() => open(k)} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={title} style={{ flex: 1 }}>
                <Card style={{ gap: 4 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy, marginBottom: 10 }}>
                    <Icon size={22} color={palette.gold} />
                  </View>
                  <Txt w={700} size={16}>{title}</Txt>
                  <Txt size={13} color="muted">{subtitle}</Txt>
                </Card>
              </Pressy>
            );
          })}
        </View>
      </Group>

      <Group title="La società">
        <View>
          {SOCIETA.map((k, i) => {
            const { Icon, title, subtitle } = INFO[k];
            const [from, to] = WALLET[i % WALLET.length];
            const gold = from === palette.gold;
            const fg = gold ? palette.onGold : palette.white;
            return (
              // card del wallet: ognuna copre la precedente lasciando vedere solo la testata
              <Pressy key={k} onPress={() => open(k)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`${title}, ${subtitle}`}
                style={{ height: CARD_H, marginTop: i ? PEEK - CARD_H : 0, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
                  shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 4 + i }}>
                <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: gold ? 'rgba(6,26,58,0.12)' : 'rgba(255,255,255,0.14)' }}>
                      <Icon size={20} color={gold ? palette.onGold : palette.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt w={800} size={17} color={fg}>{title}</Txt>
                      <Txt size={13} color={gold ? 'rgba(6,26,58,0.7)' : 'rgba(255,255,255,0.72)'} numberOfLines={1}>{subtitle}</Txt>
                    </View>
                    <ChevronRight size={18} color={fg} />
                  </View>
                  {/* icona grande in filigrana, visibile solo sull'ultima card scoperta */}
                  <Icon size={110} color={gold ? 'rgba(6,26,58,0.1)' : 'rgba(255,255,255,0.08)'} style={{ position: 'absolute', right: -14, bottom: -22 }} />
                </LinearGradient>
              </Pressy>
            );
          })}
        </View>
      </Group>
    </Screen>
  );

  function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
      <View style={{ gap: 10, marginTop: 4 }}>
        <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>{title}</Txt>
        {children}
      </View>
    );
  }
}
