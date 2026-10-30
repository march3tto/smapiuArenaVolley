import { View, type StyleProp, type ViewStyle } from 'react-native';
import { User } from 'lucide-react-native';
import { JerseyNumber } from './JerseyNumber';
import { blue } from '@/theme/colors';

/** Al posto della foto quando manca la liberatoria (giocatrici_pubbliche.consenso_foto = false) o la foto */
export function PlayerPlaceholder({ number, size, style }: { number?: number | null; size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: blue[800], alignItems: 'center', justifyContent: 'center' }, style]} accessibilityLabel="Foto non disponibile">
      {number != null
        ? <JerseyNumber value={number} size={size} style={{ opacity: 0.9 }} />
        : <User size={size} color="rgba(214,228,247,0.35)" strokeWidth={1.5} />}
    </View>
  );
}
