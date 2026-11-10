import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { MvpPanel, type MvpTeam } from './MvpPanel';
import { ToastProvider } from './Toast';
import { Txt } from './Txt';
import { useTheme } from '@/theme/ThemeProvider';
import type { LiveEvent, Match } from '@/types';
import { space } from '@/theme/colors';

/** Finestra al centro dello schermo con il voto MVP (lo stesso della scheda "Vota MVP" della diretta), aperto sopra la schermata attuale */
export function MvpSheet({ open, onClose, match, awayMatch, events, set, finished, teams }: { open: boolean; onClose: () => void; match: Match; awayMatch: boolean; events: LiveEvent[]; set: number; finished: boolean; teams: MvpTeam[] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* il modal sta sopra l'app: gli avvisi del pannello (es. voto bloccato) devono comparire qui dentro */}
      <ToastProvider>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: space.md, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi il voto MVP" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,26,56,0.55)' }} />
          <View style={{ maxHeight: '100%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: c.bg, borderRadius: 24, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm }}>
              {/* spazio pari al pulsante di chiusura: il titolo resta al centro */}
              <View style={{ width: 36 }} />
              <Txt w={800} size={17} center style={{ flex: 1 }}>MVP DEL MATCH</Txt>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi"
                style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill }}>
                <X size={18} color={c.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: space.md, paddingTop: space.sm }}>
              <MvpPanel key={match.id} match={match} awayMatch={awayMatch} events={events} set={set} finished={finished} teams={teams} onLeave={onClose} />
            </ScrollView>
          </View>
        </View>
      </ToastProvider>
    </Modal>
  );
}
