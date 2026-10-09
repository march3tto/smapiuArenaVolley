import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChartColumn, X } from 'lucide-react-native';
import { CourtPosition } from '@/components/CourtPosition';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
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
  // statistiche con barra relativa alla migliore della rosa
  const best = (k: 'points' | 'aces' | 'blocks') => Math.max(1, ...players.map((x) => x[k] ?? 0));
  const stats = ([['Punti', p.points, best('points')], ['Ace', p.aces, best('aces')], ['Muri punto', p.blocks, best('blocks')]] as [string, number | null | undefined, number][])
    .filter((s): s is [string, number, number] => typeof s[1] === 'number');
  // ruolo e maglia sono già nell'intestazione: qui solo i dati personali ("—" se non ancora inseriti)
  const facts: [string, string][] = [
    ['Data di nascita', p.birthDate ? birthDateAge(p.birthDate) : p.born ? `Classe ${p.born}` : '—'],
    ['Altezza', p.heightCm ? `${p.heightCm} cm` : '—'],
    ...(p.status ? [['Stagione', p.status === 'nuova' ? 'Nuovo arrivo' : 'Confermata'] as [string, string]] : []),
  ];
  // foto intera (3:4) sulla larghezza disponibile, senza superare il 62% dello schermo
  const photoW = Math.min(width, 560);
  const photoH = Math.min((photoW * 4) / 3, height * 0.62);

  return (
    <View style={{ flex: 1, backgroundColor: c.card }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ height: photoH, backgroundColor: '#1E4586' }}>
          <CoverImage source={p.photo} style={{ flex: 1 }} />
          <LinearGradient colors={['transparent', 'rgba(5,13,36,0.2)', c.card]} locations={[0.4, 0.65, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          {p.number != null ? (
            <Txt w={900} size={110} color="rgba(242,184,0,0.85)" style={{ position: 'absolute', right: 18, bottom: -6, letterSpacing: -6, lineHeight: 110 }}>
              #{p.number}
            </Txt>
          ) : null}
          <IconButton label="Chiudi" onPress={() => router.back()} style={{ position: 'absolute', top: insets.top > 30 ? 16 : insets.top + 12, right: 14, backgroundColor: 'rgba(5,13,36,0.55)' }}>
            <X size={18} color="#fff" />
          </IconButton>
        </View>
        <View style={{ paddingHorizontal: 22, marginTop: -28, gap: 4, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt w={700} size={13} color="accent" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>{ROLE_LABEL[p.role]}</Txt>
            {p.isCaptain ? (
              <View style={{ backgroundColor: palette.gold, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 }}>
                <Txt w={700} size={11} color={palette.onGold}>Capitana</Txt>
              </View>
            ) : null}
          </View>
          <Txt w={900} size={30} style={{ letterSpacing: -1 }}>{name}</Txt>
          {p.bio ? <Txt size={15} color="muted" style={{ marginTop: 10 }}>{p.bio}</Txt> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
            {facts.map(([k, v]) => (
              <View key={k} style={{ flexGrow: 1, minWidth: 110, padding: 12, borderRadius: 16, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
                <Txt size={12} color="muted">{k}</Txt>
                <Txt w={700} size={15} color={v === '—' ? 'muted' : 'text'}>{v}</Txt>
              </View>
            ))}
          </View>
          <View style={{ gap: 12, marginTop: 20, padding: 14, borderRadius: 18, backgroundColor: c.fill, borderWidth: 1, borderColor: c.line }}>
            <Txt w={800} size={12} color="muted" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Posizione in campo</Txt>
            <CourtPosition role={p.role} size={Math.min(150, (photoW - 44) * 0.42)} />
          </View>
          {stats.length ? (
            <View style={{ gap: 12, marginTop: 20 }}>
              {stats.map(([k, v, max]) => (
                <View key={k} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Txt size={14} color="muted">{k}</Txt>
                    <Txt w={800} size={24} tnum>{v}</Txt>
                  </View>
                  <View style={{ height: 6, borderRadius: 6, backgroundColor: c.fill2, overflow: 'hidden' }}>
                    <View style={{ height: 6, borderRadius: 6, width: `${(v / max) * 100}%`, backgroundColor: palette.gold }} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
              <ChartColumn size={15} color={palette.gold} />
              <Txt size={13} color="muted">Le statistiche arrivano con l'inizio del campionato.</Txt>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
