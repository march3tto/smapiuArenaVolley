import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImagePlus, Mic, Plus, Trash2, Video, X } from 'lucide-react-native';
import { AppSwitch } from '@/components/AppSwitch';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormField } from '@/components/FormField';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { fetchMediaAdmin, salvaMedia, setMediaPubblicato, youtubeThumb, type MediaDraft } from '@/lib/api';
import { preparaImmagine, type ImmaginePronta } from '@/lib/immagini';
import { parseStream } from '@/lib/stream';
import { hasSupabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const nuovo = (): MediaDraft => ({ id: null, type: 'video', title: '', ref: '', label: '', cover: null, published: true, date: '' });

/** Copertina calcolata da un link YouTube (https://img.youtube.com/vi/<id>/hqdefault.jpg) */
const YT_THUMB_RE = /^https:\/\/img\.youtube\.com\/vi\/[^/]+\/hqdefault\.jpg$/;
const isYoutubeThumb = (url: string | null) => !!url && YT_THUMB_RE.test(url);

/**
 * Nuovo link: per un video YouTube la copertina diventa la sua miniatura hqdefault, a meno che non ne sia già
 * stata caricata una a mano; cambiando link si aggiorna, e se il link non è più YouTube la miniatura si toglie.
 */
function conLink(m: MediaDraft, ref: string): MediaDraft {
  const s = parseStream(ref);
  const manuale = m.cover && !isYoutubeThumb(m.cover);
  if (manuale) return { ...m, ref };
  return { ...m, ref, cover: s?.kind === 'youtube' ? youtubeThumb(s.id) : null };
}

/** Riferimento salvato: per YouTube basta l'id (come leggono MediaList e youtubeThumb), altrimenti l'URL */
function normalizzaRef(ref: string): string {
  const s = parseStream(ref);
  return s?.kind === 'youtube' ? s.id : ref.trim();
}

/** Miniatura da mostrare: copertina caricata, altrimenti quella di YouTube */
function thumb(m: MediaDraft, local: ImmaginePronta | null): string | null {
  if (local) return local.uri;
  if (m.cover) return m.cover;
  // contenuti salvati prima della copertina calcolata: miniatura dal link
  const s = parseStream(m.ref);
  return s?.kind === 'youtube' ? youtubeThumb(s.id) : null;
}

/** Altro > Gestione contenuti > Podcast e video (solo staff/admin) */
export default function GestioneMedia() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useApp();
  const { refresh } = useData();
  const staff = hasSupabase && (user?.role === 'admin' || user?.role === 'staff');

  const [list, setList] = useState<MediaDraft[]>([]);
  const [draft, setDraft] = useState<MediaDraft | null>(null);
  const [cover, setCover] = useState<ImmaginePronta | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchMediaAdmin().then(setList).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    if (staff) load();
  }, [staff, load]);

  const paddingTop = Platform.OS === 'ios' ? space.lg : insets.top + space.md;
  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Txt w={800} size={20} style={{ flex: 1 }}>{draft ? (draft.id ? 'Modifica contenuto' : 'Nuovo podcast o video') : 'Podcast e video'}</Txt>
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

  const pickCover = () => run('Preparazione immagine…', async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const uri = res.canceled ? null : res.assets[0]?.uri;
    if (uri) setCover(await preparaImmagine(uri, { maxLato: 1280, qualita: 0.85 }));
  });

  const save = (m: MediaDraft) => run('Salvataggio…', async () => {
    if (!m.title.trim()) throw new Error('Il titolo è obbligatorio.');
    if (!parseStream(m.ref)) throw new Error('Link non valido: incolla un link YouTube o un URL.');
    // la copertina YouTube calcolata dal link si salva in url_immagine_copertina (una caricata a mano ha la precedenza)
    await salvaMedia({ ...conLink(m, m.ref), ref: normalizzaRef(m.ref) }, cover);
    toast.show(m.published ? `${m.type === 'podcast' ? 'Podcast' : 'Video'} pubblicato` : 'Salvato (non pubblicato)');
    setDraft(null);
    setCover(null);
    load();
    await refresh();
  });

  const toggle = (m: MediaDraft, published: boolean) => run('', async () => {
    setList((l) => l.map((x) => (x.id === m.id ? { ...x, published } : x)));
    try {
      await setMediaPubblicato(m.id!, published);
    } finally {
      load();
    }
    await refresh();
  });

  const preview = draft ? thumb(draft, cover) : null;
  const stream = draft ? parseStream(draft.ref) : null;

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
          <View style={{ gap: space.md }}>
            <SegmentedControl stretch value={draft.type} onChange={(type) => setDraft({ ...draft, type })}
              options={[{ value: 'video', label: 'Video' }, { value: 'podcast', label: 'Podcast' }]} />
            <FormField label="Titolo" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} />
            <FormField label="Link" value={draft.ref} onChangeText={(ref) => setDraft(conLink(draft, ref))} autoCapitalize="none" autoCorrect={false}
              keyboardType="url" placeholder="https://youtu.be/… o https://…"
              hint={stream?.kind === 'youtube' ? `YouTube: ${stream.id}` : stream ? 'Link esterno' : undefined} />
            <FormField label="Etichetta (facoltativa)" value={draft.label} onChangeText={(label) => setDraft({ ...draft, label })} placeholder="Es. Highlights, Intervista, 12:30"
              hint="Compare accanto a VIDEO/PODCAST ed è il titolo della notifica" />

            <View style={{ gap: space.sm }}>
              <Txt w={600} size={12} color="muted">Copertina{!cover && (isYoutubeThumb(draft.cover) || (!draft.cover && stream?.kind === 'youtube')) ? ' (miniatura di YouTube)' : ''}</Txt>
              {preview ? <Image source={preview} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: c.fill }} contentFit="cover" /> : null}
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button size="sm" label={cover || (draft.cover && !isYoutubeThumb(draft.cover)) ? 'Cambia copertina' : isYoutubeThumb(draft.cover) ? 'Usa un’altra copertina' : 'Carica copertina'} icon={<ImagePlus size={15} color={c.text} />}
                  onPress={pickCover} disabled={!!busy} style={{ flex: 1 }} />
                {/* "Togli" solo per una copertina caricata a mano: si torna alla miniatura di YouTube (se il link lo è) */}
                {cover || (draft.cover && !isYoutubeThumb(draft.cover)) ? (
                  <Button size="sm" label="Togli" icon={<Trash2 size={15} color={c.text} />} disabled={!!busy}
                    onPress={() => {
                      setCover(null);
                      setDraft(conLink({ ...draft, cover: null }, draft.ref));
                    }} />
                ) : null}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
              <View style={{ flex: 1 }}>
                <Txt w={700} size={15}>Pubblica subito</Txt>
                <Txt size={12} color="muted">{draft.published ? 'Visibile a tutti; parte la notifica push.' : 'Salvato ma nascosto.'}</Txt>
              </View>
              <AppSwitch value={draft.published} onValueChange={(published) => setDraft({ ...draft, published })} accessibilityLabel="Pubblica subito" />
            </View>
            <Button variant="gold" size="lg" label={draft.published ? 'Pubblica' : 'Salva'} onPress={() => save(draft)} disabled={!!busy} />
          </View>
        ) : (
          <>
            <Button variant="gold" label="Nuovo podcast o video" icon={<Plus size={16} color={palette.onGold} />} disabled={!!busy}
              onPress={() => {
                setDraft(nuovo());
                setCover(null);
              }} />
            <Txt w={800} size={13} color="muted" style={{ letterSpacing: 1.4, textTransform: 'uppercase', marginTop: space.sm }}>Ultimi contenuti</Txt>
            {list.map((m) => {
              const t = thumb(m, null);
              const Icon = m.type === 'podcast' ? Mic : Video;
              return (
                <Card key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Pressy style={{ flex: 1, flexDirection: 'row', gap: space.md, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={`Modifica ${m.title}`}
                    onPress={() => {
                      setDraft(m);
                      setCover(null);
                    }}>
                    {t ? <Image source={t} style={{ width: 72, height: 40.5, borderRadius: 8, backgroundColor: c.fill }} contentFit="cover" />
                      : <View style={{ width: 72, height: 40.5, borderRadius: 8, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={c.muted} /></View>}
                    <View style={{ flex: 1 }}>
                      <Txt w={700} size={14} numberOfLines={2}>{m.title}</Txt>
                      <Txt size={12} color="muted">{m.type === 'podcast' ? 'Podcast' : 'Video'}{m.label ? ` · ${m.label}` : ''}{m.published ? '' : ' · nascosto'}</Txt>
                    </View>
                  </Pressy>
                  <AppSwitch value={m.published} onValueChange={(v) => toggle(m, v)} accessibilityLabel={`Pubblicato: ${m.title}`} />
                </Card>
              );
            })}
            {!list.length ? <Txt size={13} color="muted">Nessun contenuto.</Txt> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
