import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Settings, UserRound } from 'lucide-react-native';
import { Pressy } from './Pressy';
import { SocialMenu } from './SocialMenu';
import { Txt } from './Txt';
import { LOGO_BRAND, LOGO_BRAND_LIGHT } from '@/data/assets';
import { useApp } from '@/store/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/colors';

const LOGO_RATIO = 428 / 166;
const LOGO_MAX_H = 69;
/** Spazio a destra riservato al pulsante impostazioni (40 + margini) */
const BUTTONS_W = 14 + 40 + 8;
/** Larghezza in più del pulsante impostazioni con le iniziali dell'utente o l'icona dell'ospite */
const INITIALS_W = 30;
/** Cerchio dell'ospite (non registrato) a sinistra dell'ingranaggio */
const GUEST_SIZE = 22;

/** Iniziali dell'utente registrato: prima lettera del nome e del cognome (una sola se il nome è di una parola) */
function initialsOf(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
}

/** Iniziali dell'utente registrato, o null per gli ospiti */
function useInitials(): string | null {
  const { user } = useApp();
  return user ? initialsOf(user.name) || null : null;
}

/** Dimensioni del logo: si riduce sugli schermi stretti per non toccare i pulsanti */
function useLogoSize() {
  const { width } = useWindowDimensions();
  // la capsula è sempre larga: iniziali per gli utenti registrati, icona per gli ospiti
  const buttons = BUTTONS_W + INITIALS_W;
  // la parte visibile del logo finisce all'85% della larghezza dell'immagine
  const maxW = (Math.min(width, 1120) / 2 - buttons) / (0.85 - 0.5);
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
  const router = useRouter();
  const logo = useLogoSize();
  const initials = useInitials();
  const [social, setSocial] = useState(false);
  const progress = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.spring(progress, { toValue: social ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: social ? 6 : 0 }).start();
  }, [social, progress]);

  const glass = mode === 'dark' ? 'rgba(34,77,146,0.45)' : 'rgba(255,255,255,0.55)';
  const blur = Platform.OS === 'android' ? 0 : 40;
  const tint = mode === 'dark' ? 'dark' : 'light';
  const capsule = { borderRadius: 999, overflow: 'hidden', backgroundColor: Platform.OS === 'android' ? c.card : glass, borderWidth: 1, borderColor: c.line } as const;

  return (
    <View pointerEvents="box-none" style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.md, paddingBottom: space.sm }}>
      {/* sfumatura dal colore di sfondo al trasparente: scorrendo, il contenuto passa sotto logo e pulsanti */}
      <LinearGradient pointerEvents="none" colors={[c.bg, mode === 'dark' ? 'rgba(6,26,58,0)' : 'rgba(242,245,250,0)']}
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
          {/* utente registrato: le sue iniziali a sinistra dell'ingranaggio, nella stessa capsula */}
          <Pressy onPress={() => router.push('/settings')} scaleTo={0.88} hitSlop={6} accessibilityRole="button"
            accessibilityLabel={initials ? `Impostazioni, account di ${initials}` : 'Impostazioni, non hai effettuato l\'accesso'}
            style={{ height: 40, minWidth: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs,
              paddingLeft: initials ? space.sm + 4 : space.sm, paddingRight: space.sm + 3 }}>
            {initials ? <Txt w={800} size={13} style={{ letterSpacing: 0.4 }}>{initials}</Txt> : (
              // ospite: sagoma generica in un cerchio grigio
              <View style={{ width: GUEST_SIZE, height: GUEST_SIZE, borderRadius: GUEST_SIZE / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: c.muted }}>
                <UserRound size={GUEST_SIZE - 6} color={c.card} fill={c.card} strokeWidth={1.5} style={{ marginTop: 4 }} />
              </View>
            )}
            <Settings size={18} color={c.text} />
          </Pressy>
        </BlurView>
      </View>
    </View>
  );
}
