import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImagePlus, Maximize, Minus, PenLine, Plus, ScanText, X } from 'lucide-react-native';
import { AppSwitch } from '@/components/AppSwitch';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormField, dataValida, oggi } from '@/components/FormField';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import {
  fetchNewsAdmin, newsDaScreenshot, salvaNews, setNewsPubblicata, type NewsCategoryKey, type NewsDraft,
} from '@/lib/api';
import { preparaImmagine, type ImmaginePronta, type Riquadro } from '@/lib/immagini';
import { slugify } from '@/lib/format';
import { hasSupabase, storageUrl } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { NewsSource } from '@/types';

const CATEGORIE: { value: NewsCategoryKey; label: string }[] = [
  { value: 'societa', label: 'Società' },
  { value: 'prima_squadra', label: 'Serie A3' },
  { value: 'giovanili', label: 'Giovanili' },
  { value: 'sponsor', label: 'Sponsor' },
];
const FONTI: { value: NewsSource; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'sito_web', label: 'Sito web' },
  { value: 'app', label: 'App' },
];

const nuova = (source: NewsSource): NewsDraft => ({
  id: null, title: '', body: '', category: 'societa', date: oggi(), coverPath: null, published: true, source,
});

/** Immagine sorgente della copertina (screenshot o altra foto) con il riquadro da ritagliare, in pixel */
interface Cover {
  img: ImmaginePronta;
  box: Riquadro;
}

const full = (img: ImmaginePronta): Riquadro => ({ x1: 0, y1: 0, x2: img.width, y2: img.height });

async function scegliImmagine(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  return res.canceled ? null : res.assets[0]?.uri ?? null;
}

/** Altro > Gestione contenuti > News (solo staff/admin): da screenshot con l'AI o scritta a mano, poi revisione e pubblicazione */
export default function GestioneNews() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useApp();
  const { refresh } = useData();
  const staff = hasSupabase && (user?.role === 'admin' || user?.role === 'staff');

  const [list, setList] = useState<NewsDraft[]>([]);
  const [draft, setDraft] = useState<NewsDraft | null>(null);
  const [slug, setSlug] = useState('');
  const [cover, setCover] = useState<Cover | null>(null);
  const [estimated, setEstimated] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchNewsAdmin().then(setList).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    if (staff) load();
  }, [staff, load]);

  const paddingTop = Platform.OS === 'ios' ? space.lg : insets.top + space.md;
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Txt w={800} size={20} style={{ flex: 1 }}>{draft ? (draft.id ? 'Modifica news' : 'Nuova news') : 'News'}</Txt>
      <IconButton label="Chiudi" onPress={() => (draft ? setDraft(null) : router.back())}><X size={18} color={c.text} /></IconButton>
    </View>
  );
  if (!staff) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: space.md, paddingTop, gap: space.md }}>
        {header}
        <Txt size={15} color="muted">Questa schermata è riservata allo staff.</Txt>
      </View>
    );
  }

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const fromScreenshot = () => run('Lettura dello screenshot…', async () => {
    const uri = await scegliImmagine();
    if (!uri) return;
    // stessa immagine per l'AI e per il ritaglio: il riquadro suggerito è in questi pixel
    const img = await preparaImmagine(uri, { maxLato: 1600, qualita: 0.85 });
    const d = nuova('instagram');
    setDraft(d);
    setCover({ img, box: full(img) });
    const p = await newsDaScreenshot(img, oggi());
    setDraft({ ...d, title: p.title, body: p.body, category: p.category, date: p.date });
    setSlug(p.slug);
    setEstimated(p.estimated);
    if (p.box) setCover({ img, box: p.box });
  });

  const otherImage = () => run('Preparazione immagine…', async () => {
    const uri = await scegliImmagine();
    if (!uri) return;
    const img = await preparaImmagine(uri, { maxLato: 2000, qualita: 0.9 });
    setCover({ img, box: full(img) });
  });

  const save = (d: NewsDraft) => run('Salvataggio…', async () => {
    if (!d.title.trim() || !d.body.trim()) throw new Error('Titolo e testo sono obbligatori.');
    if (!dataValida(d.date)) throw new Error('Data non valida: usa AAAA-MM-GG.');
    // copertina ritagliata come fa lo script: news/<data>-<slug>.jpg
    const img = cover ? await preparaImmagine(cover.img.uri, { crop: cover.box, maxLato: 1600, qualita: 0.88 }) : null;
    await salvaNews(d, { slug: slug || slugify(d.title).split('-').slice(0, 6).join('-'), today: oggi(), cover: img });
    toast.show(d.published ? 'News pubblicata' : 'News salvata (non pubblicata)');
    setDraft(null);
    setCover(null);
    load();
    await refresh();
  });

  // pubblica o nasconde dalla lista; se non riesce la lista torna com'era
  const toggle = (n: NewsDraft, published: boolean) => run('', async () => {
    setList((l) => l.map((x) => (x.id === n.id ? { ...x, published } : x)));
    try {
      await setNewsPubblicata(n.id!, published);
    } finally {
      load();
    }
    await refresh();
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.md, paddingTop, paddingBottom: insets.bottom + space.xl, gap: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        {header}
        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <ActivityIndicator color={palette.gold} />
            <Txt size={13} color="muted">{busy}</Txt>
          </View>
        ) : null}
        {error ? <Txt size={13} color="danger">{error}</Txt> : null}

        {draft ? (
          <Editor draft={draft} onChange={setDraft} cover={cover} onCover={setCover} existingCover={draft.coverPath}
            estimated={estimated} onOtherImage={otherImage} disabled={!!busy} onSave={() => save(draft)} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button variant="gold" label="Da screenshot" icon={<ScanText size={16} color={palette.onGold} />} style={{ flex: 1 }} disabled={!!busy}
                onPress={fromScreenshot} />
              <Button label="Scrivi a mano" icon={<PenLine size={16} color={c.text} />} style={{ flex: 1 }} disabled={!!busy}
                onPress={() => {
                  setDraft(nuova('app'));
                  setCover(null);
                  setSlug('');
                  setEstimated(false);
                }} />
            </View>
            <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', marginTop: space.sm }}>Ultime news</Txt>
            {list.map((n) => (
              <Card key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Pressy style={{ flex: 1, flexDirection: 'row', gap: space.md, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={`Modifica ${n.title}`}
                  onPress={() => {
                    setDraft(n);
                    setCover(null);
                    setSlug('');
                    setEstimated(false);
                  }}>
                  {n.coverPath ? <Image source={storageUrl(n.coverPath)} style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: c.fill }} contentFit="cover" /> : null}
                  <View style={{ flex: 1 }}>
                    <Txt w={700} size={14} numberOfLines={2}>{n.title}</Txt>
                    <Txt size={12} color="muted">{n.date} · {CATEGORIE.find((x) => x.value === n.category)?.label}{n.published ? '' : ' · nascosta'}</Txt>
                  </View>
                </Pressy>
                <AppSwitch value={n.published} onValueChange={(v) => toggle(n, v)} accessibilityLabel={`Pubblicata: ${n.title}`} />
              </Card>
            ))}
            {!list.length ? <Txt size={13} color="muted">Nessuna news.</Txt> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Editor({ draft, onChange, cover, onCover, existingCover, estimated, onOtherImage, onSave, disabled }: {
  draft: NewsDraft; onChange: (d: NewsDraft) => void; cover: Cover | null; onCover: (c: Cover) => void; existingCover: string | null;
  estimated: boolean; onOtherImage: () => void; onSave: () => void; disabled: boolean;
}) {
  const { c } = useTheme();
  const set = <K extends keyof NewsDraft>(k: K, v: NewsDraft[K]) => onChange({ ...draft, [k]: v });
  const dateError = dataValida(draft.date) ? null : 'Formato AAAA-MM-GG';
  return (
    <View style={{ gap: space.md }}>
      <FormField label="Titolo" value={draft.title} onChangeText={(v) => set('title', v)} placeholder="Es. Serie D, Coppa Veneto: vittoria 3-1" />
      <FormField label="Testo" multiline value={draft.body} onChangeText={(v) => set('body', v)} hint="Paragrafi separati da una riga vuota. Niente @ né dati inventati." />
      <View style={{ gap: space.xs }}>
        <Txt w={600} size={12} color="muted">Categoria</Txt>
        <SegmentedControl value={draft.category} onChange={(v) => set('category', v)} options={CATEGORIE} />
      </View>
      <FormField label="Data" value={draft.date} onChangeText={(v) => set('date', v)} autoCapitalize="none" keyboardType="numbers-and-punctuation"
        error={dateError} hint={estimated ? 'Stimata dal tempo relativo del post ("3 g"): controllala.' : undefined} />
      <View style={{ gap: space.xs }}>
        <Txt w={600} size={12} color="muted">Fonte</Txt>
        <SegmentedControl stretch value={draft.source ?? 'app'} onChange={(v) => set('source', v)} options={FONTI} />
      </View>

      <View style={{ gap: space.sm }}>
        <Txt w={600} size={12} color="muted">Copertina</Txt>
        {cover ? <CropEditor cover={cover} onChange={onCover} />
          : existingCover ? <Image source={storageUrl(existingCover)} style={{ width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: c.fill }} contentFit="cover" />
          : <Txt size={13} color="muted">Nessuna copertina.</Txt>}
        <Button size="sm" label={cover || existingCover ? 'Scegli un’altra immagine' : 'Aggiungi immagine'} icon={<ImagePlus size={15} color={c.text} />}
          onPress={onOtherImage} disabled={disabled} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
        <View style={{ flex: 1 }}>
          <Txt w={700} size={15}>Pubblica subito</Txt>
          <Txt size={12} color="muted">{draft.published ? 'Visibile a tutti; parte la notifica push.' : 'Salvata ma nascosta.'}</Txt>
        </View>
        <AppSwitch value={draft.published} onValueChange={(v) => set('published', v)} accessibilityLabel="Pubblica subito" />
      </View>
      <Button variant="gold" size="lg" label={draft.published ? 'Pubblica' : 'Salva'} onPress={onSave} disabled={disabled || !!dateError} />
    </View>
  );
}

/**
 * Ritaglio della copertina: riquadro suggerito dall'AI sopra l'immagine, ogni bordo si sposta a passi del 2%.
 * Sotto, l'anteprima del ritaglio così come verrà salvato.
 */
function CropEditor({ cover, onChange }: { cover: Cover; onChange: (c: Cover) => void }) {
  const { c } = useTheme();
  const { img, box } = cover;
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const k = w / img.width;
  const stepX = Math.round(img.width * 0.02);
  const stepY = Math.round(img.height * 0.02);
  const move = (edge: keyof Riquadro, delta: number) => {
    const b = { ...box, [edge]: box[edge] + delta };
    b.x1 = Math.max(0, Math.min(b.x1, b.x2 - 20));
    b.y1 = Math.max(0, Math.min(b.y1, b.y2 - 20));
    b.x2 = Math.min(img.width, Math.max(b.x2, b.x1 + 20));
    b.y2 = Math.min(img.height, Math.max(b.y2, b.y1 + 20));
    onChange({ img, box: b });
  };
  const bw = box.x2 - box.x1;
  const bh = box.y2 - box.y1;
  // anteprima larga come metà schermo, con l'immagine spostata dentro una finestra delle proporzioni del ritaglio
  const pw = Math.min(w, 240);
  const pk = pw / bw;
  const edges: { edge: keyof Riquadro; label: string; step: number; invert?: boolean }[] = [
    { edge: 'y1', label: 'Sopra', step: stepY },
    { edge: 'y2', label: 'Sotto', step: stepY, invert: true },
    { edge: 'x1', label: 'Sinistra', step: stepX },
    { edge: 'x2', label: 'Destra', step: stepX, invert: true },
  ];
  return (
    <View style={{ gap: space.sm }}>
      <View onLayout={onLayout} style={{ width: '100%', aspectRatio: img.width / img.height, borderRadius: 12, overflow: 'hidden', backgroundColor: c.fill }}>
        <Image source={img.uri} style={{ width: '100%', height: '100%' }} contentFit="fill" />
        {w ? (
          <>
            {/* zona esclusa oscurata, riquadro in oro */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: box.y1 * k, backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: box.y2 * k, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: box.x1 * k, top: box.y1 * k, height: bh * k, backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: box.x2 * k, right: 0, top: box.y1 * k, height: bh * k, backgroundColor: 'rgba(0,0,0,0.55)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: box.x1 * k, top: box.y1 * k, width: bw * k, height: bh * k, borderWidth: 2, borderColor: palette.gold }} />
          </>
        ) : null}
      </View>
      {edges.map(({ edge, label, step, invert }) => (
        <View key={edge} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Txt size={13} style={{ flex: 1 }}>{label}</Txt>
          {/* "−" restringe il riquadro, "+" lo allarga, per ogni bordo */}
          <IconButton label={`${label}: restringi`} size={36} onPress={() => move(edge, invert ? -step : step)}><Minus size={16} color={c.text} /></IconButton>
          <IconButton label={`${label}: allarga`} size={36} onPress={() => move(edge, invert ? step : -step)}><Plus size={16} color={c.text} /></IconButton>
        </View>
      ))}
      <Button size="sm" label="Tutta l’immagine" icon={<Maximize size={15} color={c.text} />} onPress={() => onChange({ img, box: full(img) })} />
      {pw ? (
        <View style={{ gap: space.xs }}>
          <Txt w={600} size={12} color="muted">Anteprima della copertina</Txt>
          <View style={{ width: pw, height: bh * pk, overflow: 'hidden', borderRadius: 12, backgroundColor: c.fill }}>
            <Image source={img.uri} contentFit="fill"
              style={{ position: 'absolute', left: -box.x1 * pk, top: -box.y1 * pk, width: img.width * pk, height: img.height * pk }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
