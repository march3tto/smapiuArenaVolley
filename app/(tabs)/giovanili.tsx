import { useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Bell, BellOff, ChevronLeft, ChevronRight, User, X } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { CoverImage } from '@/components/CoverImage';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { YouthCard } from '@/components/YouthCard';
import { GALLERIA, MOVIMENTO, SQUADRE, type SquadraRegionale } from '@/data/giovanili';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function Giovanili() {
  const { c } = useTheme();
  const { youth, loading, refresh } = useData();
  const { prefs, toggleYouth } = useApp();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const [photo, setPhoto] = useState<number | null>(null);
  const cols = width >= 900 ? 4 : 2;
  const rows = Array.from({ length: Math.ceil(GALLERIA.length / cols) }, (_, r) => GALLERIA.slice(r * cols, r * cols + cols));

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <SectionHeader big title="Giovanili" subtitle="Il movimento giovanile Arena Volley, dalle prime squadre regionali ai più piccoli." />

      <Card style={{ gap: 14 }}>
        <Txt w={800} size={12} color="accent" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Movimento giovanile</Txt>
        <Txt size={16} style={{ lineHeight: 24 }}>{MOVIMENTO.intro}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {MOVIMENTO.facts.map((f) => (
            <View key={f.label} style={{ flexGrow: 1, flexBasis: width >= 900 ? '30%' : '45%', padding: 14, borderRadius: 18, backgroundColor: c.fill2, gap: 2 }}>
              <Txt w={900} size={26} color="accent" style={{ letterSpacing: -0.6 }} tnum>{f.value}</Txt>
              <Txt size={13} color="muted">{f.label}</Txt>
            </View>
          ))}
        </View>
      </Card>

      {SQUADRE.map((s) => <Squadra key={s.key} team={s} />)}

      {youth.length ? (
        <View style={{ gap: 14 }}>
          <SectionHeader title="Categorie" subtitle="Tocca la campanella per seguire una squadra." />
          {youth.map((y) => (
            <YouthCard
              key={y.id}
              team={y}
              following={prefs.youth.includes(y.id)}
              onToggle={() => {
                const on = toggleYouth(y.id);
                toast.show(on ? `Riceverai le notifiche dell'${y.name}.` : `Non riceverai più le notifiche dell'${y.name}.`, on ? Bell : BellOff);
              }}
            />
          ))}
        </View>
      ) : null}

      <SectionHeader title="Galleria" subtitle="Le nostre squadre giovanili, stagione dopo stagione." />
      <View style={{ gap: 10 }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((g, i) => (
              <Pressy key={i} onPress={() => setPhoto(r * cols + i)} scaleTo={0.97} accessibilityRole="imagebutton" accessibilityLabel={g.title ?? `Foto ${r * cols + i + 1}`}
                style={{ flex: 1, aspectRatio: 3 / 2, borderRadius: 16, overflow: 'hidden', backgroundColor: c.fill }}>
                <Image source={g.photo} style={{ flex: 1 }} contentFit="cover" transition={200} />
                {g.title ? (
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(5,13,36,0.6)' }}>
                    <Txt w={700} size={11.5} color={palette.white} numberOfLines={1}>{g.title}</Txt>
                  </View>
                ) : null}
              </Pressy>
            ))}
            {/* riempitivi per l'ultima riga incompleta */}
            {Array.from({ length: cols - row.length }, (_, i) => <View key={`f${i}`} style={{ flex: 1 }} />)}
          </View>
        ))}
      </View>

      <Lightbox index={photo} onChange={setPhoto} />
    </Screen>
  );
}

/** Prima squadra regionale: foto, presentazione, giocatrici e staff */
function Squadra({ team: s }: { team: SquadraRegionale }) {
  const { c } = useTheme();
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <CoverImage source={s.photo} style={{ aspectRatio: 3 / 2, backgroundColor: c.fill }} />
      <View style={{ padding: 18, gap: 14 }}>
        <Txt w={900} size={28} style={{ letterSpacing: -0.8 }}>{s.name}</Txt>
        <Txt size={15} color="muted" style={{ lineHeight: 22 }}>{s.description}</Txt>

        <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 4 }}>Giocatrici</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {s.players.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: c.fill2 }}>
              <View style={{ minWidth: 28, height: 28, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
                <Txt w={800} size={12.5} color={palette.gold} tnum>{p.number}</Txt>
              </View>
              <Txt w={600} size={13.5}>{p.name}</Txt>
            </View>
          ))}
        </View>

        <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 4 }}>Tecnici</Txt>
        <View>
          {s.staff.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill2 }}>
                <User size={18} color={c.cobalt} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt w={700} size={15}>{t.name}</Txt>
                <Txt w={700} size={11.5} color="cobalt" style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>{t.role}</Txt>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

/** Foto della galleria a schermo intero, con frecce per scorrere */
function Lightbox({ index, onChange }: { index: number | null; onChange: (i: number | null) => void }) {
  const insets = useSafeAreaInsets();
  const item = index == null ? null : GALLERIA[index];
  const go = (d: number) => index != null && onChange((index + d + GALLERIA.length) % GALLERIA.length);
  const arrow = { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' } as const;

  return (
    <Modal visible={item != null} transparent animationType="fade" onRequestClose={() => onChange(null)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(3,8,22,0.96)', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
          <Txt w={700} size={14} color={palette.white} style={{ flex: 1 }} tnum>{index != null ? `${index + 1} / ${GALLERIA.length}` : ''}</Txt>
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi" style={arrow}>
            <X size={20} color={palette.white} />
          </Pressable>
        </View>
        {item ? <Image source={item.photo} style={{ flex: 1, marginVertical: 16 }} contentFit="contain" transition={150} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          <Pressable onPress={() => go(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Foto precedente" style={arrow}>
            <ChevronLeft size={22} color={palette.white} />
          </Pressable>
          <Txt w={600} size={14} color={palette.white} center style={{ flex: 1 }} numberOfLines={2}>{item?.title ?? ''}</Txt>
          <Pressable onPress={() => go(1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Foto successiva" style={arrow}>
            <ChevronRight size={22} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
