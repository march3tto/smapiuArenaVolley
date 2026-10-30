import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { CourtPosition } from '@/components/CourtPosition';
import { CoverImage } from '@/components/CoverImage';
import { PlayerPlaceholder } from '@/components/PlayerPlaceholder';
import { IconButton } from '@/components/IconButton';
import { Txt } from '@/components/Txt';
import { ROLE_LABEL } from '@/constants';
import { birthDate } from '@/lib/format';
import { useData } from '@/store/DataProvider';
import { blue, palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export default function PlayerScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { players } = useData();
  const p = players.find((x) => x.id === id);

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
        <Txt color="muted">Giocatrice non trovata.</Txt>
      </View>
    );
  }
  const name = `${p.firstName} ${p.lastName}`;
  // ruolo e maglia sopra i dati personali ("—" se non ancora inseriti)
  const facts: [string, string][] = [
    ['Ruolo', ROLE_LABEL[p.role]],
    ['Maglia', p.number != null ? `#${p.number}` : '—'],
    ['Data di nascita', p.birthDate ? birthDate(p.birthDate) : p.born ? `Classe ${p.born}` : '—'],
    ['Altezza', p.heightCm ? `${p.heightCm} cm` : '—'],
    ...(p.status ? [['Stagione', p.status === 'nuova' ? 'Nuovo arrivo' : 'Confermata'] as [string, string]] : []),
  ];
  // tutto visibile senza scorrere: la foto (3:4) prende lo spazio che resta sopra i dati
  const photoW = Math.min(width, 560);
  const photoMaxH = (photoW * 4) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <View style={{ flex: 1, minHeight: Math.min(180, height * 0.25), maxHeight: photoMaxH, backgroundColor: blue[800] }}>
        {p.photo !== '' ? <CoverImage source={p.photo} style={{ flex: 1 }} /> : <PlayerPlaceholder number={p.number} size={Math.round(photoW * 0.3)} style={{ flex: 1 }} />}
        <IconButton label="Chiudi" onPress={() => router.back()} style={{ position: 'absolute', top: insets.top > 30 ? 16 : insets.top + 12, right: 14, backgroundColor: 'rgba(6,26,58,0.55)' }}>
          <X size={18} color="#fff" />
        </IconButton>
      </View>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.md, marginTop: -space.lg, gap: space.xs, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Txt w={900} size={26} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, letterSpacing: -0.8 }}>{name}</Txt>
          {p.isCaptain ? (
            <View style={{ backgroundColor: palette.gold, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: 999 }}>
              <Txt w={700} size={11} color={palette.onGold}>Capitana</Txt>
            </View>
          ) : null}
        </View>
        {p.bio ? <Txt size={14} color="muted" numberOfLines={3} style={{ marginTop: space.xs }}>{p.bio}</Txt> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
          {facts.map(([k, v], i) => (
            // ruolo e maglia sulla prima riga, dati personali sotto
            <View key={k} style={{ flexGrow: 1, flexBasis: i < 2 ? '40%' : 110, minWidth: 110, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 14, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
              <Txt size={11.5} color="muted">{k}</Txt>
              <Txt w={700} size={14} color={v === '—' ? 'muted' : 'text'}>{v}</Txt>
            </View>
          ))}
        </View>
        <View style={{ gap: space.sm, marginTop: space.sm, padding: space.md, borderRadius: 16, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
          <Txt w={800} size={11.5} color="muted" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Posizione in campo</Txt>
          <CourtPosition role={p.role} size={Math.min(118, (photoW - 40) * 0.36)} />
        </View>
      </View>
    </View>
  );
}
