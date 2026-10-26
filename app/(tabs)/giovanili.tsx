import { useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ChevronDown, ChevronLeft, ChevronRight, Expand, Images, Sparkles, User, X } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { CoverImage } from '@/components/CoverImage';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { useTopBarHeight } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { GALLERIA, MOVIMENTO, SQUADRE, type SquadraRegionale } from '@/data/giovanili';
import { shortBirthDate } from '@/lib/format';
import { useData } from '@/store/DataProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImgSrc } from '@/types';

/** Foto ingrandita: quelle della galleria (si scorrono) o la foto di una squadra */
interface Foto { photo: ImgSrc; title?: string }

type Sezione = SquadraRegionale['key'] | 'movimento' | 'galleria';

/** Ordine: banner per andare alle sezioni → Serie B2 → Serie D → Movimento giovanile → Galleria */
export default function Giovanili() {
  const { c } = useTheme();
  const { loading, refresh } = useData();
  const { width } = useWindowDimensions();
  // foto ingrandita: elenco da scorrere (la galleria, oppure la sola foto di una squadra) e posizione
  const [viewer, setViewer] = useState<{ items: Foto[]; index: number } | null>(null);
  const cols = width >= 900 ? 4 : 2;
  const rows = Array.from({ length: Math.ceil(GALLERIA.length / cols) }, (_, r) => GALLERIA.slice(r * cols, r * cols + cols));

  // banner: posizione di ogni sezione nella pagina, la barra in alto è sopra il contenuto e va scavalcata
  const scroll = useRef<ScrollViewInstance>(null);
  // oggetto stabile scritto da onLayout (non serve ridisegnare quando cambia)
  const [pos] = useState<Partial<Record<Sezione, number>>>(() => ({}));
  const top = useTopBarHeight();
  const mark = (k: Sezione) => ({ onLayout: (e: { nativeEvent: { layout: { y: number } } }) => { pos[k] = e.nativeEvent.layout.y; } });
  const goTo = (k: Sezione) => {
    const y = pos[k];
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - top - 8), animated: true });
  };
  const banners: { key: Sezione; label: string; photo?: ImgSrc; Icon?: typeof Images }[] = [
    ...SQUADRE.map((s) => ({ key: s.key, label: s.name, photo: s.photo })),
    { key: 'movimento', label: 'Movimento giovanile', Icon: Sparkles },
    { key: 'galleria', label: 'Galleria', Icon: Images },
  ];

  return (
    <Screen onRefresh={refresh} refreshing={loading} scrollRef={scroll}>
      <SectionHeader big title="Giovanili" subtitle="Il movimento giovanile Arena Volley, dalle prime squadre regionali ai più piccoli." />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {banners.map((b) => (
          <Pressy key={b.key} onPress={() => goTo(b.key)} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={`Vai a ${b.label}`}
            style={{ flexGrow: 1, flexBasis: width >= 900 ? '22%' : '45%', height: 64, borderRadius: 18, overflow: 'hidden', backgroundColor: palette.navy }}>
            {b.photo ? <Image source={b.photo} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.45 }} contentFit="cover" /> : null}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 }}>
              {b.Icon ? <b.Icon size={18} color={palette.gold} /> : null}
              <Txt w={800} size={15} color={palette.white} numberOfLines={2} style={{ flex: 1 }}>{b.label}</Txt>
              <ChevronDown size={18} color={palette.gold} />
            </View>
          </Pressy>
        ))}
      </View>

      {SQUADRE.map((s) => (
        <View key={s.key} {...mark(s.key)}>
          <Squadra team={s} onPhoto={() => setViewer({ items: [{ photo: s.photo, title: s.name }], index: 0 })} />
        </View>
      ))}

      <Card style={{ gap: 14 }} {...mark('movimento')}>
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

      <View {...mark('galleria')}>
        <SectionHeader title="Galleria" subtitle="Le nostre squadre giovanili, stagione dopo stagione." />
      </View>
      <View style={{ gap: 10 }}>
        {rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((g, i) => (
              <Pressy key={i} onPress={() => setViewer({ items: GALLERIA, index: r * cols + i })} scaleTo={0.97} accessibilityRole="imagebutton" accessibilityLabel={g.title ?? `Foto ${r * cols + i + 1}`}
                style={{ flex: 1, aspectRatio: 3 / 2, borderRadius: 16, overflow: 'hidden', backgroundColor: c.fill }}>
                <Image source={g.photo} style={{ flex: 1 }} contentFit="cover" transition={200} />
                {g.title ? (
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(6,26,58,0.6)' }}>
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

      <Lightbox items={viewer?.items ?? []} index={viewer?.index ?? null}
        onChange={(i) => setViewer((v) => (v && i != null ? { ...v, index: i } : null))} />
    </Screen>
  );
}

/** Prima squadra regionale: foto (si ingrandisce toccandola), presentazione, giocatrici e staff in elenchi espandibili */
function Squadra({ team: s, onPhoto }: { team: SquadraRegionale; onPhoto: () => void }) {
  const { c } = useTheme();
  const { rosters } = useData();
  const players = rosters[s.categoria]?.players ?? [];
  const staff = rosters[s.categoria]?.staff ?? [];
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <Pressy onPress={onPhoto} scaleTo={0.99} accessibilityRole="imagebutton" accessibilityLabel={`Foto della ${s.name}, tocca per ingrandire`}>
        <CoverImage source={s.photo} style={{ aspectRatio: 3 / 2, backgroundColor: c.fill }} />
        <View style={{ position: 'absolute', right: 10, bottom: 10, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,26,58,0.6)' }}>
          <Expand size={16} color={palette.white} />
        </View>
      </Pressy>
      <View style={{ padding: 18, gap: 14 }}>
        <Txt w={900} size={28} style={{ letterSpacing: -0.8 }}>{s.name}</Txt>
        <Txt size={15} color="muted" style={{ lineHeight: 22 }}>{s.description}</Txt>

        {players.length ? (
          <Espandibile title="Giocatrici" count={players.length}>
            <View>
              {players.map((p, i) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <View style={{ minWidth: 28, height: 28, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
                    <Txt w={800} size={12.5} color={palette.gold} tnum>{p.number ?? '–'}</Txt>
                  </View>
                  <Txt w={600} size={14} numberOfLines={1} style={{ flex: 1 }}>{p.name}</Txt>
                  {p.birthDate ? <Txt size={13} color="muted" tnum>{shortBirthDate(p.birthDate)}</Txt> : null}
                </View>
              ))}
            </View>
          </Espandibile>
        ) : null}

        {staff.length ? (
          <Espandibile title="Tecnici" count={staff.length}>
            <View>
              {staff.map((t, i) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
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
          </Espandibile>
        ) : null}
      </View>
    </Card>
  );
}

/** Elenco chiuso di partenza: l'intestazione con il numero lo apre e lo chiude */
function Espandibile({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${title}, ${count}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? c.fill2 : c.fill })}>
        <Txt w={800} size={13} color="muted" style={{ flex: 1, letterSpacing: 1.4, textTransform: 'uppercase' }}>{title}</Txt>
        <View style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, backgroundColor: c.fill2 }}>
          <Txt w={700} size={11.5} tnum>{count}</Txt>
        </View>
        <ChevronDown size={18} color={c.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>{children}</View> : null}
    </View>
  );
}

/** Foto a schermo intero (galleria o foto di squadra), con frecce per scorrere se sono più di una */
function Lightbox({ items, index, onChange }: { items: Foto[]; index: number | null; onChange: (i: number | null) => void }) {
  const insets = useSafeAreaInsets();
  const item = index == null ? null : items[index] ?? null;
  const many = items.length > 1;
  const go = (d: number) => index != null && onChange((index + d + items.length) % items.length);
  const arrow = { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' } as const;

  return (
    <Modal visible={item != null} transparent animationType="fade" onRequestClose={() => onChange(null)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(3,26,56,0.96)', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
          <Txt w={700} size={14} color={palette.white} style={{ flex: 1 }} tnum>{index != null && many ? `${index + 1} / ${items.length}` : ''}</Txt>
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi" style={arrow}>
            <X size={20} color={palette.white} />
          </Pressable>
        </View>
        {item ? <Image source={item.photo} style={{ flex: 1, marginVertical: 16 }} contentFit="contain" transition={150} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          {many ? (
            <Pressable onPress={() => go(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Foto precedente" style={arrow}>
              <ChevronLeft size={22} color={palette.white} />
            </Pressable>
          ) : null}
          <Txt w={600} size={14} color={palette.white} center style={{ flex: 1 }} numberOfLines={2}>{item?.title ?? ''}</Txt>
          {many ? (
            <Pressable onPress={() => go(1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Foto successiva" style={arrow}>
              <ChevronRight size={22} color={palette.white} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
