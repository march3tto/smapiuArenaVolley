import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoverImage } from './CoverImage';
import { LOADING_IMAGE } from '@/data/assets';
import { palette } from '@/theme/colors';

/** Schermata "We are Arena Volley" mostrata all'avvio finché i dati non sono pronti */
export function LoadingScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#0052AC' }} accessibilityLabel="Caricamento in corso">
      <CoverImage source={LOADING_IMAGE} style={{ flex: 1 }} />
      <ActivityIndicator color={palette.gold} style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 32 }} />
    </View>
  );
}
