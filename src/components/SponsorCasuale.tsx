import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Image } from 'expo-image';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { useData } from '@/store/DataProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/colors';

/**
 * Logo di uno sponsor a caso, in fondo alle schede (giocatrice, news). Lo sponsor si sceglie una volta all'apertura
 * della scheda e resta quello finché la scheda è montata; toccandolo si apre il sito, se c'è.
 */
export function SponsorCasuale() {
  const { c } = useTheme();
  const { sponsors } = useData();
  // numero casuale fissato al montaggio: l'indice si ricava dalla lista, così funziona anche se gli sponsor arrivano dopo
  const [caso] = useState(Math.random);
  if (!sponsors.length) return null;
  const s = sponsors[Math.floor(caso * sponsors.length)];
  return (
    <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
      <Txt w={800} size={10.5} color="muted" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Con il sostegno di</Txt>
      <Pressy onPress={s.url ? () => Linking.openURL(s.url!) : undefined} disabled={!s.url} scaleTo={0.97}
        accessibilityRole={s.url ? 'link' : undefined} accessibilityLabel={`Sponsor: ${s.name}`}
        style={{ width: 180, aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', padding: space.sm, borderWidth: 1, borderColor: c.line }}>
        <Image source={s.logo} style={{ flex: 1 }} contentFit="contain" />
      </Pressy>
    </View>
  );
}
