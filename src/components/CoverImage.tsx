import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ImgSrc } from '@/types';

/**
 * Immagine intera e centrata nel riquadro (le copertine sono spesso verticali):
 * dietro, la stessa immagine sfocata riempie lo spazio ai lati.
 */
export function CoverImage({ source, style }: { source: ImgSrc; style?: StyleProp<ViewStyle> }) {
  const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Image source={source} style={fill} contentFit="cover" blurRadius={24} />
      <View style={[fill, { backgroundColor: 'rgba(6,26,58,0.25)' }]} />
      <Image source={source} style={fill} contentFit="contain" contentPosition="center" transition={250} />
    </View>
  );
}
