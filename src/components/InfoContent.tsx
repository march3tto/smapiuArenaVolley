import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, ChevronRight, Dumbbell, Mail, MapPin, MessageCircle, Minus, Phone, Navigation, Plus, Trophy, User, Volleyball, X, type LucideIcon } from 'lucide-react-native';
import { Card } from './Card';
import { CoverImage } from './CoverImage';
import { Pressy } from './Pressy';
import { SponsorGrid } from './SponsorGrid';
import { Txt } from './Txt';
import { CONTACTS } from '@/constants';
import { ALBO_ORO, ARENA_CARD, INFO, ORGANIGRAMMA, SAFEGUARDING, type InfoKey } from '@/data/altro';
import { ORGANIGRAMMA_PHOTO } from '@/data/assets';
import { useData } from '@/store/DataProvider';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { Venue } from '@/types';

const VENUE_ICON: Record<Venue['kind'], LucideIcon> = { arena: Building2, palasport: Volleyball, palestra: Dumbbell };

/** Contenuto di una voce della tab Altro: si espande dentro la card nella tab e si usa anche nella pagina /info/[section] */
export function InfoBody({ section }: { section: InfoKey }) {
  const { c } = useTheme();
  const { sponsors, venues } = useData();
  const info = INFO[section];
  return (
    <View style={{ gap: space.md }}>
      {info.key === 'organigramma' ? (
        <>
          <CoverImage source={ORGANIGRAMMA_PHOTO} style={{ aspectRatio: 1024 / 683, borderRadius: 24, backgroundColor: c.fill }} />
          <Txt size={15} color="muted" style={{ lineHeight: 22, paddingHorizontal: space.xs }}>{info.body}</Txt>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {ORGANIGRAMMA.map((p, i) => (
              <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                  <User size={20} color={c.cobalt} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt w={700} size={16}>{p.name}</Txt>
                  <Txt w={700} size={11.5} color="cobalt" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: space.xs }}>{p.role}</Txt>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : info.key === 'albo' ? (
        <>
          {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 4 / 5, borderRadius: 24, backgroundColor: c.fill }} /> : null}
          <Txt size={15} color="muted" style={{ lineHeight: 22, paddingHorizontal: space.xs }}>{info.body}</Txt>
          <AlboOro />
        </>
      ) : info.key === 'safeguarding' ? (
        <>
          {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 3 / 2, borderRadius: 24, backgroundColor: c.fill }} /> : null}
          <Card style={{ gap: space.md }}>
            <Txt w={800} size={12} color="accent" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Nomina responsabile e adozione MOG</Txt>
            <Txt w={900} size={24} style={{ letterSpacing: -0.6 }}>{info.headline}</Txt>
            <Txt size={16} style={{ lineHeight: 25 }}>{info.body}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 18, backgroundColor: c.fill2 }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
                <User size={20} color={palette.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt w={700} size={16}>{SAFEGUARDING.responsible}</Txt>
                <Txt w={700} size={11.5} color="cobalt" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: space.xs }}>Responsabile safeguarding</Txt>
              </View>
            </View>
          </Card>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {SAFEGUARDING.contacts.map((ct, i) => (
              <Pressy key={ct.email} scaleTo={0.98} accessibilityRole="link" accessibilityLabel={`Scrivi a ${ct.club}`}
                onPress={() => Linking.openURL(`mailto:${ct.email}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
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
            <View key={city} style={{ gap: space.sm }}>
              <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: space.xs }}>{city}</Txt>
              <Card padded={false} style={{ overflow: 'hidden' }}>
                {venues.filter((v) => v.city === city).map((v, i) => {
                  const VIcon = VENUE_ICON[v.kind];
                  return (
                    <Pressy key={v.name} scaleTo={0.98} accessibilityRole="link" accessibilityLabel={`Indicazioni per ${v.name}`}
                      onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${v.address}`)}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
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
      ) : info.key === 'card' ? (
        <ArenaCard />
      ) : info.key === 'galleria' ? (
        // contenuti rimossi: la pagina resta vuota finché non si caricano le nuove foto
        null
      ) : (
        <>
          {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 4 / 3, borderRadius: 24, backgroundColor: c.fill }} /> : null}
          {info.facts ? (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {info.facts.map((f) => (
                <Card key={f.label} style={{ flex: 1, padding: space.md, alignItems: 'center', gap: space.xs }}>
                  <Txt w={900} size={24} color="accent" style={{ letterSpacing: -0.6 }} tnum>{f.value}</Txt>
                  <Txt size={12} color="muted" center>{f.label}</Txt>
                </Card>
              ))}
            </View>
          ) : null}
          <Card style={{ gap: space.md }}>
            {info.headline ? <Txt w={900} size={24} style={{ letterSpacing: -0.6 }}>{info.headline}</Txt> : null}
            {(info.body ?? '').split(/\n\s*\n/).map((p, i) => (
              <Txt key={i} size={16} style={{ lineHeight: 25 }}>{p.trim()}</Txt>
            ))}
          </Card>
        </>
      )}
    </View>
  );
}

/** Pagina Arena Volley Card: presentazione, vantaggi, promozioni dei partner, come ottenerla e invito alle aziende */
function ArenaCard() {
  const { c } = useTheme();
  const { convenzioni } = useData();
  const info = INFO.card;
  const label = { letterSpacing: 1.2, textTransform: 'uppercase' } as const;
  return (
    <>
      {info.image ? <CoverImage source={info.image} style={{ aspectRatio: 4 / 3, borderRadius: 24, backgroundColor: c.fill }} /> : null}
      <Card style={{ gap: space.md }}>
        <Txt w={800} size={12} color="accent" style={label}>Partner conventions</Txt>
        <Txt display w={900} size={28} color="cobalt">{info.headline}</Txt>
        {(info.body ?? '').split(/\n\s*\n/).map((p, i) => (
          // il primo paragrafo è l'introduzione, in evidenza
          <Txt key={i} w={i ? undefined : 700} size={i ? 15 : 17} color={i ? 'muted' : undefined} style={{ lineHeight: i ? 23 : 25 }}>{p.trim()}</Txt>
        ))}
      </Card>

      <Txt display w={900} size={24} color="cobalt" style={{ paddingHorizontal: space.xs, marginTop: space.xs }}>Perché Arena Volley Card?</Txt>
      {ARENA_CARD.perks.map(({ Icon, title, text }) => (
        <Card key={title} style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
            <Icon size={20} color={palette.gold} />
          </View>
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt w={800} size={16}>{title}</Txt>
            <Txt size={14} color="muted" style={{ lineHeight: 20 }}>{text}</Txt>
          </View>
        </Card>
      ))}

      {convenzioni.length ? (
        <Txt display w={900} size={24} color="cobalt" style={{ paddingHorizontal: space.xs, marginTop: space.xs }}>Promozioni sponsor</Txt>
      ) : null}
      {convenzioni.map((p) => (
        <Pressy key={p.id} scaleTo={0.98} disabled={!p.url} accessibilityRole={p.url ? 'link' : undefined} accessibilityLabel={`${p.name}: ${p.promo}`}
          onPress={() => p.url && Linking.openURL(p.url)}
          style={{ flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <View style={{ width: 76, height: 76, borderRadius: 14, backgroundColor: '#fff', padding: space.xs, overflow: 'hidden' }}>
            <Image source={p.logo} style={{ flex: 1 }} contentFit="contain" />
          </View>
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt w={800} size={16}>{p.name}</Txt>
            <Txt size={14} color="muted" style={{ lineHeight: 20 }}>{p.promo}</Txt>
            {p.url ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs }}>
                <Txt w={700} size={13} color="accent">Scopri la promozione</Txt>
                <ChevronRight size={15} color={c.accent} />
              </View>
            ) : null}
          </View>
        </Pressy>
      ))}

      <Card style={{ gap: space.sm, backgroundColor: palette.navy, borderColor: palette.navy }}>
        <Txt display w={900} size={22} color={palette.gold}>Come fare per ottenere l’Arena Volley Card?</Txt>
        <Txt size={15} color={palette.white} style={{ lineHeight: 23 }}>{ARENA_CARD.howTo}</Txt>
      </Card>

      <Card style={{ gap: space.md }}>
        <Txt display w={900} size={22} color="cobalt">Sei un’azienda? Diventa partner!</Txt>
        <Txt size={15} color="muted" style={{ lineHeight: 23 }}>{ARENA_CARD.partnerInvite} {ARENA_CARD.email}</Txt>
        <Pressy scaleTo={0.97} accessibilityRole="link" accessibilityLabel={`Scrivi a ${ARENA_CARD.email}`}
          onPress={() => Linking.openURL(`mailto:${ARENA_CARD.email}`)}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 999, backgroundColor: palette.gold }}>
          <Mail size={17} color={palette.onGold} />
          <Txt w={800} size={15} color={palette.onGold}>Scrivici</Txt>
        </Pressy>
      </Card>
    </>
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, backgroundColor: on ? palette.gold : 'transparent' }}>
              <Txt w={800} size={17} color={on ? palette.onGold : c.text} style={{ flex: 1, letterSpacing: -0.3 }}>Stagione {s.season}</Txt>
              {on ? <Minus size={18} color={palette.onGold} /> : <Plus size={18} color={c.muted} />}
            </Pressy>
            {on ? (
              <View style={{ padding: space.md, gap: space.md }}>
                {s.items.map((it) => (
                  <View key={it.team} style={{ flexDirection: 'row', gap: space.md }}>
                    <Trophy size={16} color={c.accent} style={{ marginTop: space.xs }} />
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

const MARKETING = CONTACTS.offices.find((o) => o.label === 'Sponsor e marketing')?.email ?? 'marketing@arenavolleyteam.it';

/** "Vuoi diventare nostro sponsor?": piccola finestra in basso che compare aprendo gli sponsor; si chiude con la X. bottom: spazio extra dal fondo */
export function SponsorPopup({ bottom = 16 }: { bottom?: number }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(true);
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    // entra poco dopo l'apertura, quando la pagina è già visibile
    const t = setTimeout(() => Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 7 }).start(), 600);
    return () => clearTimeout(t);
  }, [anim]);
  const close = () => Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setOpen(false));
  if (!open) return null;
  return (
    <Animated.View style={{ position: 'absolute', left: 14, right: 14, bottom: insets.bottom + bottom, alignItems: 'center',
      opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
      <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, paddingRight: space.sm, borderRadius: 18,
        backgroundColor: palette.gold }}>
        <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
          <Txt w={900} size={14} display color={palette.navy} style={{ textTransform: 'uppercase' }}>Vuoi diventare nostro sponsor?</Txt>
          <Txt size={12} color={palette.navy} numberOfLines={1}>Scrivi a {MARKETING}</Txt>
        </View>
        <Pressy onPress={() => mail(MARKETING)} scaleTo={0.94} accessibilityRole="link" accessibilityLabel={`Diventa sponsor: scrivi a ${MARKETING}`}
          style={{ paddingHorizontal: space.md, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
          <Txt w={700} size={11.5} color={palette.white} style={{ letterSpacing: 0.6 }}>SCRIVICI</Txt>
        </Pressy>
        <Pressy onPress={close} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Chiudi" hitSlop={8} style={{ padding: space.xs }}>
          <X size={16} color={palette.navy} />
        </Pressy>
      </View>
    </Animated.View>
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
    <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: space.xs, marginTop: space.xs }}>{t}</Txt>
  );
  const chip = (Icon: LucideIcon, text: string, onPress: () => void) => (
    <Pressy key={text} onPress={onPress} scaleTo={0.95} accessibilityRole="link" accessibilityLabel={text}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 999, backgroundColor: c.fill2 }}>
      <Icon size={15} color={c.accent} />
      <Txt w={600} size={13}>{text}</Txt>
    </Pressy>
  );

  return (
    <>
      <Card style={{ gap: space.md }}>
        <Pressy scaleTo={0.98} accessibilityRole="link" accessibilityLabel="Sede, apri in Mappe"
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACTS.address)}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: GOLD_TINT }}>
            <MapPin size={20} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt w={700} size={16}>Segreteria</Txt>
            <Txt size={13} color="muted">{CONTACTS.address}</Txt>
          </View>
          <ChevronRight size={18} color={c.muted} />
        </Pressy>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {actions.map(({ Icon, label: l, onPress }) => (
            <Pressy key={l} onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={l}
              style={{ flex: 1, alignItems: 'center', gap: space.sm, paddingVertical: space.md, borderRadius: 14, backgroundColor: c.fill2 }}>
              <Icon size={20} color={c.cobalt} />
              <Txt w={600} size={12.5}>{l}</Txt>
            </Pressy>
          ))}
        </View>
      </Card>

      {label('Segreterie per zona')}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {CONTACTS.desks.map((d, i) => (
          <View key={d.area} style={{ paddingHorizontal: space.md, paddingVertical: space.md, gap: space.sm, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Txt w={700} size={15}>{d.area}</Txt>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {chip(Phone, d.phone, () => tel(d.phone))}
              {chip(Mail, d.email, () => mail(d.email))}
            </View>
          </View>
        ))}
      </Card>

      {label('Scrivici')}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {CONTACTS.offices.map((o, i) => (
          <View key={o.email} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
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
