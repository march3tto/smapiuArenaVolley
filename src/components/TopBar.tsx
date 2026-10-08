import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { IconButton } from './IconButton';
import { SocialMenu } from './SocialMenu';
import { LOGO_BRAND, LOGO_BRAND_LIGHT } from '@/data/assets';
import { useApp } from '@/store/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';

const LOGO_RATIO = 428 / 166;
const LOGO_MAX_H = 69;
/** Spazio a destra riservato al pulsante impostazioni (40 + margini) */
const BUTTONS_W = 14 + 40 + 8;

/** Dimensioni del logo: si riduce sugli schermi stretti per non toccare i pulsanti */
function useLogoSize() {
  const { width } = useWindowDimensions();
  // la parte visibile del logo finisce all'85% della larghezza dell'immagine
  const maxW = (Math.min(width, 1120) / 2 - BUTTONS_W) / (0.85 - 0.5);
  const w = Math.min(LOGO_MAX_H * LOGO_RATIO, maxW);
  return { w, h: w / LOGO_RATIO };
}

/** Altezza occupata dalla barra in alto: il contenuto scorre sotto, quindi va lasciato questo spazio */
export function useTopBarHeight() {
  return useSafeAreaInsets().top + 6 + useLogoSize().h + 8;
}

/** Barra trasparente in stile chat WhatsApp: logo al centro e pulsanti in capsule sfocate separate */
export function TopBar() {
  const insets = useSafeAreaInsets();
  const { c, mode } = useTheme();
  const { prefs } = useApp();
  const router = useRouter();
  const logo = useLogoSize();
  const [social, setSocial] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, { toValue: social ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: social ? 6 : 0 }).start();
  }, [social, progress]);

  const glass = mode === 'dark' ? 'rgba(34,77,146,0.45)' : 'rgba(255,255,255,0.55)';
  const blur = Platform.OS === 'android' ? 0 : 40;
  const tint = mode === 'dark' ? 'dark' : 'light';
  const capsule = { borderRadius: 999, overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? c.card : glass, borderWidth: 1, borderColor: c.line } as const;
  const flat = { backgroundColor: 'transparent', borderWidth: 0 };

  return (
    <View pointerEvents="box-none" style={{ paddingTop: insets.top + 6, paddingHorizontal: 14, paddingBottom: 8 }}>
      <LinearGradient pointerEvents="none" colors={[c.bg, mode === 'dark' ? 'rgba(42,90,165,0)' : 'rgba(238,242,250,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View pointerEvents="box-none" style={{ height: logo.h, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
        {/* il logo sfuma quando il menu social si apre e gli passa sopra */}
        <Animated.View pointerEvents={social ? 'none' : 'auto'}
          style={{ position: 'absolute', left: '50%', marginLeft: -logo.w / 2, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <Pressable onPress={() => router.navigate('/')} accessibilityRole="button" accessibilityLabel="Home">
            <Image source={mode === 'dark' ? LOGO_BRAND : LOGO_BRAND_LIGHT} style={{ width: logo.w, height: logo.h }} contentFit="contain" />
          </Pressable>
        </Animated.View>
        <BlurView intensity={blur} tint={tint} style={capsule}>
          <SocialMenu progress={progress} open={social} onOpenChange={setSocial} />
        </BlurView>
        <BlurView intensity={blur} tint={tint} style={capsule}>
          <IconButton label="Impostazioni notifiche" onPress={() => router.push('/settings')} dot={prefs.enabled} style={flat}>
            <Settings size={18} color={c.text} />
          </IconButton>
        </BlurView>
      </View>
    </View>
  );
}
