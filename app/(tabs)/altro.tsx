import type { ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Globe, Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Txt } from '@/components/Txt';
import { CONTACTS, INSTAGRAM_URL } from '@/constants';
import { INFO, MEDIA, SOCIETA, type InfoKey } from '@/data/altro';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const GOLD_TINT = 'rgba(242,184,0,0.18)';

export default function Altro() {
  const { c } = useTheme();
  const router = useRouter();
  const open = (section: InfoKey) => router.push({ pathname: '/info/[section]', params: { section } });

  const actions: { Icon: LucideIcon; label: string; onPress: () => void }[] = [
    { Icon: Phone, label: 'Chiama', onPress: () => Linking.openURL(`tel:${CONTACTS.phone.replace(/\s/g, '')}`) },
    { Icon: Mail, label: 'Email', onPress: () => Linking.openURL(`mailto:${CONTACTS.email}`) },
    { Icon: MessageCircle, label: 'WhatsApp', onPress: () => Linking.openURL(`https://wa.me/${CONTACTS.whatsapp}`) },
    { Icon: Globe, label: 'Social', onPress: () => Linking.openURL(INSTAGRAM_URL) },
  ];

  return (
    <Screen>
      <SectionHeader big title="Altro" subtitle="Società, sponsor, palestre e contatti." />

      <Group title="La società">
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {SOCIETA.map((k, i) => {
            const { Icon, title, subtitle } = INFO[k];
            const gold = k === 'albo';
            return (
              <Pressy key={k} onPress={() => open(k)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={title}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: gold ? GOLD_TINT : c.fill2 }}>
                  <Icon size={20} color={gold ? c.accent : c.cobalt} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt w={700} size={16}>{title}</Txt>
                  <Txt size={13} color="muted">{subtitle}</Txt>
                </View>
                <ChevronRight size={18} color={c.muted} />
              </Pressy>
            );
          })}
        </Card>
      </Group>

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

      <Group title="Contatti">
        <Card style={{ gap: 14 }}>
          <Pressy scaleTo={0.98} accessibilityRole="link" accessibilityLabel="Segreteria"
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACTS.address)}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flex: 1 }}>
              <Txt w={700} size={16}>Segreteria</Txt>
              <Txt size={13} color="muted">{CONTACTS.address} · {CONTACTS.hours}</Txt>
            </View>
            <ChevronRight size={18} color={c.muted} />
          </Pressy>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {actions.map(({ Icon, label, onPress }) => (
              <Pressy key={label} onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={label}
                style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: c.fill2 }}>
                <Icon size={20} color={c.cobalt} />
                <Txt w={600} size={12.5}>{label}</Txt>
              </Pressy>
            ))}
          </View>
        </Card>
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
