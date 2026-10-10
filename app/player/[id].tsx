import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { CourtPosition } from '@/components/CourtPosition';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
import { JerseyNumber } from '@/components/JerseyNumber';
import { Txt } from '@/components/Txt';
import { ROLE_LABEL } from '@/constants';
import { birthDateAge } from '@/lib/format';
import { useData } from '@/store/DataProvider';
import { palette } from '@/theme/colors';
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
  // ruolo e maglia sono già nell'intestazione: qui solo i dati personali ("—" se non ancora inseriti)
  const facts: [string, string][] = [
    ['Data di nascita', p.birthDate ? birthDateAge(p.birthDate) : p.born ? `Classe ${p.born}` : '—'],
    ['Altezza', p.heightCm ? `${p.heightCm} cm` : '—'],
    ...(p.status ? [['Stagione', p.status === 'nuova' ? 'Nuovo arrivo' : 'Confermata'] as [string, string]] : []),
  ];
  // tutto visibile senza scorrere: la foto (3:4) prende lo spazio che resta sopra i dati
  const photoW = Math.min(width, 560);
  const photoMaxH = (photoW * 4) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <View style={{ flex: 1, minHeight: Math.min(180, height * 0.25), maxHeight: photoMaxH, backgroundColor: '#0B3166' }}>
        <CoverImage source={p.photo} style={{ flex: 1 }} />
        <LinearGradient colors={['transparent', 'rgba(6,26,58,0.2)', c.card]} locations={[0.4, 0.65, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        {p.number != null ? (
          <JerseyNumber value={p.number} size={88} style={{ position: 'absolute', right: 18, bottom: -4 }} />
        ) : null}
        <IconButton label="Chiudi" onPress={() => router.back()} style={{ position: 'absolute', top: insets.top > 30 ? 16 : insets.top + 12, right: 14, backgroundColor: 'rgba(6,26,58,0.55)' }}>
          <X size={18} color="#fff" />
        </IconButton>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, marginTop: -24, gap: 2, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt w={700} size={13} color="accent" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>{ROLE_LABEL[p.role]}</Txt>
          {p.isCaptain ? (
            <View style={{ backgroundColor: palette.gold, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 }}>
              <Txt w={700} size={11} color={palette.onGold}>Capitana</Txt>
            </View>
          ) : null}
        </View>
        <Txt w={900} size={26} numberOfLines={1} adjustsFontSizeToFit style={{ letterSpacing: -0.8 }}>{name}</Txt>
        {p.bio ? <Txt size={14} color="muted" numberOfLines={3} style={{ marginTop: 4 }}>{p.bio}</Txt> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {facts.map(([k, v]) => (
            <View key={k} style={{ flexGrow: 1, minWidth: 110, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
              <Txt size={11.5} color="muted">{k}</Txt>
              <Txt w={700} size={14} color={v === '—' ? 'muted' : 'text'}>{v}</Txt>
            </View>
          ))}
        </View>
        <View style={{ gap: 8, marginTop: 10, padding: 12, borderRadius: 16, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
          <Txt w={800} size={11.5} color="muted" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Posizione in campo</Txt>
          <CourtPosition role={p.role} size={Math.min(118, (photoW - 40) * 0.36)} />
        </View>
      </View>
    </View>
  );
}
