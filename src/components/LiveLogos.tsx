import { View } from 'react-native';
import { Image } from 'expo-image';
import { YoutubeIcon } from './YoutubeIcon';
import { LOGO_FIPAV } from '@/data/assets';
import { space } from '@/theme/colors';

/** Icona dei pulsanti "Guarda la diretta": emblema FIPAV e, alla sua destra, il logo YouTube */
export function LiveLogos({ size = 22 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Image source={LOGO_FIPAV} style={{ width: size, height: size }} contentFit="contain" accessibilityIgnoresInvertColors />
      <YoutubeIcon size={size} />
    </View>
  );
}
