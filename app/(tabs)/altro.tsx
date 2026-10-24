import { useState, type ReactNode } from 'react';
import { LayoutAnimation, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { InfoBody, SponsorPopup } from '@/components/InfoContent';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Txt } from '@/components/Txt';
import { INFO, MEDIA, SOCIETA, type InfoKey } from '@/data/altro';
import { useData } from '@/store/DataProvider';
import { brand, palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Sponsor } from '@/types';

/** Mosaico di loghi sullo sfondo del pannello Sponsor: file più alte del pannello, l'eccesso resta nascosto */
const LOGO_ROWS = 8;
const LOGO_COLS = 5;
const LOGO_H = 18;
const LOGO_GAP = 3;

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
  const { c } = useTheme();
  const router = useRouter();
  // card aperta: il contenuto si espande sul posto, una alla volta; toccarla di nuovo la chiude
  const [openKey, setOpenKey] = useState<InfoKey | null>(null);
  const toggle = (k: InfoKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey((cur) => (cur === k ? null : k));
  };
  const mediaOpen = openKey && MEDIA.includes(openKey) ? openKey : null;
  // sponsor con il logo, nell'ordine dell'elenco (title e main sponsor per primi); se sono pochi si ripetono
  const { sponsors } = useData();
  const withLogo = sponsors.filter((s) => s.logo !== '');
  const logos = withLogo.length ? Array.from({ length: LOGO_ROWS * LOGO_COLS }, (_, i) => withLogo[i % withLogo.length]) : [];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <SectionHeader big title="Altro" subtitle="Sponsor, società, palestre e contatti." />

        <Pressy onPress={() => router.push('/assistente')} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Assistente, chiedi di partite, squadra e pallavolo">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
              <Sparkles size={22} color={palette.onGold} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt w={700} size={16}>Assistente</Txt>
              <Txt size={13} color="muted">Chiedi di partite, squadra e pallavolo</Txt>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Card>
        </Pressy>

        <Group title="Sostenitori e media">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {MEDIA.map((k) => {
              const { Icon, title, subtitle } = INFO[k];
              const on = mediaOpen === k;
              return (
                <Pressy key={k} onPress={() => toggle(k)} scaleTo={0.97} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={title} style={{ flex: 1 }}>
                  <Card style={{ gap: 4, overflow: 'hidden', borderColor: on ? palette.gold : c.line, borderWidth: on ? 1.5 : 1 }}>
                    {k === 'sponsor' && logos.length ? (
                      <>
                        <SponsorLogos list={logos} />
                        {/* sfuma il mosaico verso il basso: titolo e sottotitolo restano leggibili */}
                        <LinearGradient pointerEvents="none" colors={['transparent', c.card]} locations={[0.3, 0.72]}
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                        {/* stesso spazio dell'icona delle altre card: il pannello non cambia altezza */}
                        <View style={{ height: 46, marginBottom: 10 }} />
                      </>
                    ) : (
                      <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy, marginBottom: 10 }}>
                        <Icon size={22} color={palette.gold} />
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Txt w={700} size={16} style={{ flex: 1 }}>{title}</Txt>
                      <ChevronDown size={17} color={on ? c.accent : c.muted} style={{ transform: [{ rotate: on ? '180deg' : '0deg' }] }} />
                    </View>
                    <Txt size={13} color="muted">{subtitle}</Txt>
                  </Card>
                </Pressy>
              );
            })}
          </View>
          {/* contenuto della card aperta, sotto la riga (sponsor o galleria) */}
          {mediaOpen ? <InfoBody section={mediaOpen} /> : null}
        </Group>

        <Group title="Arena Volley Card">
          <CardPanel />
        </Group>

        <Group title="La società">
          <View>
            {SOCIETA.map((k, i) => {
              const { Icon, title, subtitle } = INFO[k];
              const on = openKey === k;
              // la card dopo quella aperta non la copre: parte sotto, staccata
              const afterOpen = i > 0 && openKey === SOCIETA[i - 1];
              const [from, to] = WALLET[i % WALLET.length];
              const gold = from === palette.gold;
              const fg = gold ? palette.onGold : palette.white;
              return (
                // card del wallet: ognuna copre la precedente lasciando vedere solo la testata
                <View key={k}
                  style={{ height: on ? undefined : CARD_H, marginTop: !i ? 0 : afterOpen ? 12 : PEEK - CARD_H, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
                    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 4 + i }}>
                  <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: on ? undefined : 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: on ? 16 : 0 }}>
                    <Pressy onPress={() => toggle(k)} scaleTo={0.98} accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={`${title}, ${subtitle}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: gold ? 'rgba(6,26,58,0.12)' : 'rgba(255,255,255,0.14)' }}>
                        <Icon size={20} color={gold ? palette.onGold : palette.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt w={800} size={17} color={fg}>{title}</Txt>
                        <Txt size={13} color={gold ? 'rgba(6,26,58,0.7)' : 'rgba(255,255,255,0.72)'} numberOfLines={1}>{subtitle}</Txt>
                      </View>
                      <ChevronDown size={18} color={fg} style={{ transform: [{ rotate: on ? '180deg' : '0deg' }] }} />
                    </Pressy>
                    {/* icona grande in filigrana, visibile solo sull'ultima card scoperta (non sopra il contenuto aperto) */}
                    {on ? null : <Icon size={110} color={gold ? 'rgba(6,26,58,0.1)' : 'rgba(255,255,255,0.08)'} style={{ position: 'absolute', right: -14, bottom: -22 }} />}
                  </LinearGradient>
                  {/* contenuto espanso dentro la card, sotto la testata colorata */}
                  {on ? (
                    <View style={{ padding: 12, backgroundColor: c.bg }}>
                      <InfoBody section={k} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Group>
      </Screen>
      {/* come nella pagina Sponsor: invito a diventare sponsor, sopra la barra delle schede */}
      {mediaOpen === 'sponsor' ? <SponsorPopup bottom={96} /> : null}
    </View>
  );

  /** Mosaico di loghi piccoli su piastrine bianche che riempie lo sfondo del pannello (decorativo: il pannello si legge dal titolo) */
  function SponsorLogos({ list }: { list: Sponsor[] }) {
    const rows = Array.from({ length: LOGO_ROWS }, (_, r) => list.slice(r * LOGO_COLS, (r + 1) * LOGO_COLS));
    return (
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', top: 6, left: 6, right: 6, gap: LOGO_GAP }}>
        {rows.map((row, r) => (
          <View key={r} style={{ height: LOGO_H, flexDirection: 'row', gap: LOGO_GAP }}>
            {row.map((s, i) => (
              <View key={`${s.id}-${r}-${i}`} style={{ flex: 1, borderRadius: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, padding: 1.5 }}>
                <Image source={s.logo} style={{ flex: 1 }} contentFit="contain" />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  /** Pannello dell'Arena Volley Card: richiama la tessera (blu notte e oro) con la foto a destra; apre la pagina dedicata */
  function CardPanel() {
    const { title, subtitle, image } = INFO.card;
    return (
      <Pressy onPress={() => router.push('/info/card')} scaleTo={0.98} accessibilityRole="link" accessibilityLabel={`${title}, ${subtitle}`}
        style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
        <LinearGradient colors={[brand.bluNotte, brand.bluScuro]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: palette.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Txt w={800} size={10.5} color={palette.onGold} style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Partner conventions</Txt>
            </View>
            <Txt display w={900} size={22} color={palette.white}>{title}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Txt size={13} color="rgba(255,255,255,0.72)" style={{ flex: 1 }}>{subtitle}</Txt>
              <ChevronRight size={18} color={palette.gold} />
            </View>
          </View>
          {image ? <Image source={image} style={{ width: 112, aspectRatio: 4 / 3, borderRadius: 14 }} contentFit="cover" /> : null}
        </LinearGradient>
      </Pressy>
    );
  }

  function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
      <View style={{ gap: 10, marginTop: 4 }}>
        <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>{title}</Txt>
        {children}
      </View>
    );
  }
}
