import { useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2, ChevronRight, Dumbbell, Mail, MapPin, MessageCircle, Minus, Phone, Navigation, Plus, Trophy, User, Volleyball, X, type LucideIcon } from 'lucide-react-native';
import { Pressy } from '@/components/Pressy';
import { Card } from '@/components/Card';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
import { InstagramStrip } from '@/components/InstagramStrip';
import { MediaList } from '@/components/MediaList';
import { SponsorGrid } from '@/components/SponsorGrid';
import { Txt } from '@/components/Txt';
import { CONTACTS } from '@/constants';
import { ALBO_ORO, INFO, ORGANIGRAMMA, SAFEGUARDING, type InfoKey } from '@/data/altro';
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
        ) : info.key === 'albo' ? (
          <>
            {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 4 / 5, borderRadius: 24, backgroundColor: c.fill }} /> : null}
            <Txt size={15} color="muted" style={{ lineHeight: 22, paddingHorizontal: 4 }}>{info.body}</Txt>
            <AlboOro />
          </>
        ) : info.key === 'safeguarding' ? (
          <>
            {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 3 / 2, borderRadius: 24, backgroundColor: c.fill }} /> : null}
            <Card style={{ gap: 14 }}>
              <Txt w={800} size={12} color="accent" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Nomina responsabile e adozione MOG</Txt>
              <Txt w={900} size={24} style={{ letterSpacing: -0.6 }}>{info.headline}</Txt>
              <Txt size={16} style={{ lineHeight: 25 }}>{info.body}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: c.fill2 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
                  <User size={20} color={palette.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt w={700} size={16}>{SAFEGUARDING.responsible}</Txt>
                  <Txt w={700} size={11.5} color="cobalt" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>Responsabile safeguarding</Txt>
                </View>
              </View>
            </Card>
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {SAFEGUARDING.contacts.map((ct, i) => (
                <Pressy key={ct.email} scaleTo={0.98} accessibilityRole="link" accessibilityLabel={`Scrivi a ${ct.club}`}
                  onPress={() => Linking.openURL(`mailto:${ct.email}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                    <Mail size={20} color={c.cobalt} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt w={700} size={16}>{ct.club}</Txt>
                    <Txt size={13} color="muted">{ct.email}</Txt>
                  </View>
                </Pressy>
              ))}
            </Card>
          </>
        ) : info.key === 'contatti' ? (
          <Contatti />
        ) : info.key === 'palestre' ? (
          <>
            {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 4 / 3, borderRadius: 24, backgroundColor: c.fill }} /> : null}
            {[...new Set(venues.map((v) => v.city))].map((city) => (
              <View key={city} style={{ gap: 10 }}>
                <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: 4 }}>{city}</Txt>
                <Card padded={false} style={{ overflow: 'hidden' }}>
                  {venues.filter((v) => v.city === city).map((v, i) => {
                    const VIcon = VENUE_ICON[v.kind];
                    return (
                      <Pressy key={v.name} scaleTo={0.98} accessibilityRole="link" accessibilityLabel={`Indicazioni per ${v.name}`}
                        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${v.address}`)}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                        <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                          <VIcon size={20} color={c.cobalt} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt w={700} size={16}>{v.name}</Txt>
                          <Txt size={13} color="muted">{v.address}</Txt>
                        </View>
                        <Navigation size={18} color={c.accent} />
                      </Pressy>
                    );
                  })}
                </Card>
              </View>
            ))}
          </>
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
          <>
            {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 4 / 3, borderRadius: 24, backgroundColor: c.fill }} /> : null}
            {info.facts ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {info.facts.map((f) => (
                  <Card key={f.label} style={{ flex: 1, padding: 14, alignItems: 'center', gap: 2 }}>
                    <Txt w={900} size={24} color="accent" style={{ letterSpacing: -0.6 }} tnum>{f.value}</Txt>
                    <Txt size={12} color="muted" center>{f.label}</Txt>
                  </Card>
                ))}
              </View>
            ) : null}
            <Card style={{ gap: 14 }}>
              {info.headline ? <Txt w={900} size={24} style={{ letterSpacing: -0.6 }}>{info.headline}</Txt> : null}
              {(info.body ?? '').split(/\n\s*\n/).map((p, i) => (
                <Txt key={i} size={16} style={{ lineHeight: 25 }}>{p.trim()}</Txt>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Stagioni a fisarmonica: una aperta alla volta, la più recente all'inizio */
function AlboOro() {
  const { c } = useTheme();
  const [open, setOpen] = useState<string | undefined>(ALBO_ORO[0]?.season);
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      {ALBO_ORO.map((s, i) => {
        const on = open === s.season;
        return (
          <View key={s.season} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Pressy onPress={() => setOpen(on ? undefined : s.season)} scaleTo={0.99} accessibilityRole="button" accessibilityState={{ expanded: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: on ? palette.gold : 'transparent' }}>
              <Txt w={800} size={17} color={on ? palette.onGold : c.text} style={{ flex: 1, letterSpacing: -0.3 }}>Stagione {s.season}</Txt>
              {on ? <Minus size={18} color={palette.onGold} /> : <Plus size={18} color={c.muted} />}
            </Pressy>
            {on ? (
              <View style={{ padding: 16, gap: 12 }}>
                {s.items.map((it) => (
                  <View key={it.team} style={{ flexDirection: 'row', gap: 12 }}>
                    <Trophy size={16} color={c.accent} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Txt w={700} size={15}>{it.team}</Txt>
                      {it.result ? <Txt size={13.5} color="muted">{it.result}</Txt> : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const GOLD_TINT = 'rgba(255,213,3,0.18)';
const tel = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
const mail = (email: string) => Linking.openURL(`mailto:${email}`);

/** Sede, segreterie per zona e indirizzi email per argomento */
function Contatti() {
  const { c } = useTheme();
  const actions: { Icon: LucideIcon; label: string; onPress: () => void }[] = [
    { Icon: Phone, label: 'Chiama', onPress: () => tel(CONTACTS.phone) },
    { Icon: Mail, label: 'Email', onPress: () => mail(CONTACTS.email) },
    { Icon: MessageCircle, label: 'WhatsApp', onPress: () => Linking.openURL(`https://wa.me/${CONTACTS.whatsapp}`) },
  ];
  const label = (t: string) => (
    <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: 4, marginTop: 4 }}>{t}</Txt>
  );
  const chip = (Icon: LucideIcon, text: string, onPress: () => void) => (
    <Pressy key={text} onPress={onPress} scaleTo={0.95} accessibilityRole="link" accessibilityLabel={text}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.fill2 }}>
      <Icon size={15} color={c.accent} />
      <Txt w={600} size={13}>{text}</Txt>
    </Pressy>
  );

  return (
    <>
      <Card style={{ gap: 14 }}>
        <Pressy scaleTo={0.98} accessibilityRole="link" accessibilityLabel="Sede, apri in Mappe"
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACTS.address)}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: GOLD_TINT }}>
            <MapPin size={20} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt w={700} size={16}>Segreteria</Txt>
            <Txt size={13} color="muted">{CONTACTS.address}</Txt>
          </View>
          <ChevronRight size={18} color={c.muted} />
        </Pressy>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.map(({ Icon, label: l, onPress }) => (
            <Pressy key={l} onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={l}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: c.fill2 }}>
              <Icon size={20} color={c.cobalt} />
              <Txt w={600} size={12.5}>{l}</Txt>
            </Pressy>
          ))}
        </View>
      </Card>

      {label('Segreterie per zona')}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {CONTACTS.desks.map((d, i) => (
          <View key={d.area} style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Txt w={700} size={15}>{d.area}</Txt>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {chip(Phone, d.phone, () => tel(d.phone))}
              {chip(Mail, d.email, () => mail(d.email))}
            </View>
          </View>
        ))}
      </Card>

      {label('Scrivici')}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {CONTACTS.offices.map((o, i) => (
          <View key={o.email} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            {/* solo la busta avvia l'email */}
            <Pressy onPress={() => mail(o.email)} scaleTo={0.9} hitSlop={6} accessibilityRole="link" accessibilityLabel={`Scrivi a ${o.label}`}
              style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
              <Mail size={20} color={c.cobalt} />
            </Pressy>
            <View style={{ flex: 1 }}>
              <Txt w={700} size={16}>{o.label}</Txt>
              <Txt size={13} color="muted" selectable>{o.email}</Txt>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}
