import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, X } from 'lucide-react-native';
import { MvpPanel, type MvpTeam } from './MvpPanel';
import { ToastProvider } from './Toast';
import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeProvider';
import type { LiveEvent, Match } from '@/types';
import { space } from '@/theme/colors';

/** Pannello dal basso con il voto MVP (lo stesso della scheda "Vota MVP" della diretta), aperto sopra la schermata attuale */
export function MvpSheet({ open, onClose, match, awayMatch, events, finished, teams }: { open: boolean; onClose: () => void; match: Match; awayMatch: boolean; events: LiveEvent[]; finished: boolean; teams: MvpTeam[] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* il modal sta sopra l'app: gli avvisi del pannello (es. voto bloccato) devono comparire qui dentro */}
      <ToastProvider>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi il voto MVP" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,26,56,0.55)' }} />
          <View style={{ maxHeight: '85%', width: '100%', maxWidth: 900, alignSelf: 'center', backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: c.line, paddingBottom: insets.bottom }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm }}>
              <Award size={20} color={c.accent} />
              <Txt w={800} size={17} style={{ flex: 1 }}>Vota la tua MVP</Txt>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi"
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill }}>
                <X size={18} color={c.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: space.md, paddingTop: space.sm }}>
              <MvpPanel key={match.id} match={match} awayMatch={awayMatch} events={events} finished={finished} teams={teams} onLeave={onClose} showTitle={false} />
            </ScrollView>
          </View>
        </View>
      </ToastProvider>
    </Modal>
  );
}
