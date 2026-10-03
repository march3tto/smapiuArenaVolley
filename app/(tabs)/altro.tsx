import { useRef } from 'react';
import { Linking, ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Building2, Clock, Dumbbell, Handshake, Mail, MapPin, Navigation, Phone, PlayCircle, Volleyball, type LucideIcon } from 'lucide-react-native';
import { MediaList } from '@/components/MediaList';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InstagramStrip } from '@/components/InstagramStrip';
import { Pressy } from '@/components/Pressy';
import { SectionHeader } from '@/components/SectionHeader';
import { SponsorGrid } from '@/components/SponsorGrid';
import { Txt } from '@/components/Txt';
import { CONTACTS } from '@/constants';
import { useData } from '@/store/DataProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Venue } from '@/types';

const VENUE_ICON: Record<Venue['kind'], LucideIcon> = { arena: Building2, palasport: Volleyball, palestra: Dumbbell };

export default function Altro() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { sponsors, venues, media } = useData();
  const scroll = useRef<ScrollView>(null);
  const pos = useRef<Record<string, number>>({});
  const mark = (k: string) => (e: LayoutChangeEvent) => {
    pos.current[k] = e.nativeEvent.layout.y;
  };
  const jump = (k: string) => scroll.current?.scrollTo({ y: Math.max(0, (pos.current[k] ?? 0) - 8), animated: true });
  const venueW = width >= 760 ? (Math.min(width, 1120) - 28 - 24) / 3 : undefined;

  return (
    <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: c.bg }} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 14, paddingTop: 8, paddingBottom: insets.bottom + 110, gap: 16, width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
      <SectionHeader big title="Altro" subtitle="Video, sponsor, palestre e contatti della società." />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {media.length ? <Button size="sm" label="Video e podcast" onPress={() => jump('media')} /> : null}
        <Button size="sm" label="Sponsor" onPress={() => jump('sponsor')} />
        <Button size="sm" label="Palestre" onPress={() => jump('palestre')} />
        <Button size="sm" label="Contatti" onPress={() => jump('contatti')} />
      </View>

      {media.length ? (
        <View onLayout={mark('media')} style={{ gap: 14 }}>
          <BlockTitle Icon={PlayCircle} title="Video e podcast" />
          <MediaList items={media} />
        </View>
      ) : null}

      <View onLayout={mark('sponsor')} style={{ gap: 14 }}>
        <BlockTitle Icon={Handshake} title="Sponsor" />
        <SponsorGrid sponsors={sponsors} />
      </View>

      <View onLayout={mark('palestre')} style={{ gap: 14 }}>
        <BlockTitle Icon={MapPin} title="Palestre" />
        <View style={{ flexDirection: venueW ? 'row' : 'column', gap: 12 }}>
          {venues.map((v) => {
            const Icon = VENUE_ICON[v.kind];
            return (
              <Card key={v.name} style={{ gap: 4, width: venueW }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,155,255,0.15)', marginBottom: 8 }}>
                  <Icon size={20} color={c.cobalt} />
                </View>
                <Txt w={700} size={16}>{v.name}</Txt>
                <Txt size={13} color="muted">{v.city}</Txt>
                <Txt size={14} style={{ marginVertical: 8 }}>{v.use}</Txt>
                <Button size="sm" label="Indicazioni" style={{ alignSelf: 'flex-start' }} icon={<Navigation size={14} color={c.text} />}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.city}`)}`)} />
              </Card>
            );
          })}
        </View>
      </View>

      <View onLayout={mark('contatti')} style={{ gap: 14 }}>
        <BlockTitle Icon={Mail} title="Contatti" />
        <Card style={{ paddingVertical: 8 }}>
          <ContactRow Icon={Mail} label="Email" value={CONTACTS.email} onPress={() => Linking.openURL(`mailto:${CONTACTS.email}`)} />
          <ContactRow Icon={Phone} label="Telefono" value={CONTACTS.phone} onPress={() => Linking.openURL(`tel:${CONTACTS.phone.replace(/\s/g, '')}`)} />
          <ContactRow Icon={Clock} label="Orari segreteria" value={CONTACTS.hours} last />
        </Card>
        <InstagramStrip />
      </View>
    </ScrollView>
  );

  function BlockTitle({ Icon, title }: { Icon: LucideIcon; title: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <Icon size={18} color={c.accent} />
        <Txt w={800} size={20} style={{ letterSpacing: -0.4 }}>{title}</Txt>
      </View>
    );
  }

  function ContactRow({ Icon, label, value, onPress, last }: { Icon: LucideIcon; label: string; value: string; onPress?: () => void; last?: boolean }) {
    return (
      <Pressy onPress={onPress} disabled={!onPress} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
          <Icon size={18} color={c.accent} />
        </View>
        <View>
          <Txt size={12.5} color="muted">{label}</Txt>
          <Txt w={600} size={15}>{value}</Txt>
        </View>
      </Pressy>
    );
  }
}
