import { View } from 'react-native';
import { Image } from 'expo-image';
import { Txt } from './Txt';
import { LOGO_AVT, OPPONENT_LOGOS } from '@/data/assets';
import { TEAM_BADGES, US } from '@/constants';
import { initials, slugify } from '@/lib/format';
import { blue, palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { ImgSrc } from '@/types';

interface Props {
  name: string;
  size?: number;
  logo?: ImgSrc | null;
}

/** Stemma squadra: il nostro logo, il logo dell'avversaria se c'è, altrimenti sigla su fondo blu */
export function TeamBadge({ name, size = 44, logo: logoProp }: Props) {
  const { c } = useTheme();
  const logo = logoProp || OPPONENT_LOGOS[slugify(name)];
  const r = Math.round(size * 0.32);
  if (name === US || name.startsWith('Smapiù')) {
    return (
      <View
        style={{ backgroundColor: palette.navy, width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,213,3,0.65)' }}
        accessibilityLabel={name}
      >
        <Image source={LOGO_AVT} style={{ width: size * 0.7, height: size * 0.76 }} contentFit="contain" />
      </View>
    );
  }
  if (logo) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: c.line }} accessibilityLabel={name}>
        <Image source={logo} style={{ width: size * 0.82, height: size * 0.82 }} contentFit="contain" />
      </View>
    );
  }
  const abbr = TEAM_BADGES[name] ?? initials(name, 3);
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: blue[700], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} accessibilityLabel={name}>
      <Txt w={800} size={Math.round(size * 0.27)} color="#fff">
        {abbr}
      </Txt>
    </View>
  );
}
