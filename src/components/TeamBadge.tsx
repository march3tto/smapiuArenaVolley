import { View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt } from './Txt';
import { LOGO_AVT, OPPONENT_LOGOS } from '@/data/assets';
import { TEAM_BADGES, US } from '@/constants';
import { initials, slugify } from '@/lib/format';
import { brandGradient } from '@/theme/colors';
import type { ImgSrc } from '@/types';

interface Props {
  name: string;
  size?: number;
  logo?: ImgSrc | null;
}

/** Stemma squadra: il nostro logo, il logo dell'avversaria se c'è, altrimenti sigla colorata */
export function TeamBadge({ name, size = 44, logo: logoProp }: Props) {
  const logo = logoProp || OPPONENT_LOGOS[slugify(name)];
  const r = Math.round(size * 0.32);
  if (name === US || name.startsWith('Smapiù')) {
    return (
      <LinearGradient
        colors={brandGradient}
        style={{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(242,184,0,0.65)' }}
        accessibilityLabel={name}
      >
        <Image source={LOGO_AVT} style={{ width: size * 0.7, height: size * 0.76 }} contentFit="contain" />
      </LinearGradient>
    );
  }
  if (logo) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} accessibilityLabel={name}>
        <Image source={logo} style={{ width: size * 0.82, height: size * 0.82 }} contentFit="contain" />
      </View>
    );
  }
  const [abbr, color] = TEAM_BADGES[name] ?? [initials(name, 3), '#475B8F'];
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} accessibilityLabel={name}>
      <Txt w={800} size={Math.round(size * 0.27)} color="#fff">
        {abbr}
      </Txt>
    </View>
  );
}
