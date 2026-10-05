import { Animated, Linking, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, X } from 'lucide-react-native';
import { FacebookIcon } from './FacebookIcon';
import { IconButton } from './IconButton';
import { InstagramIcon } from './InstagramIcon';
import { Txt } from './Txt';
import { FACEBOOK_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL, INSTAGRAM_YOUNG_HANDLE, INSTAGRAM_YOUNG_URL } from '@/constants';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const IG = ['#FDF497', '#FD5949', '#D6249F', '#285AEB'] as const;
const SIZE = 36;
const GAP = 6;

const LINKS = [
  { key: 'ig', label: `Instagram ${INSTAGRAM_HANDLE}`, url: INSTAGRAM_URL },
  { key: 'ig-young', label: `Instagram ${INSTAGRAM_YOUNG_HANDLE}`, url: INSTAGRAM_YOUNG_URL },
  { key: 'fb', label: 'Facebook', url: FACEBOOK_URL },
] as const;

/** Larghezza dei collegamenti quando il menu è aperto */
export const SOCIAL_MENU_W = LINKS.length * (SIZE + GAP);

interface Props {
  /** 0 = chiuso, 1 = aperto (animato dalla TopBar, che sfuma anche il logo) */
  progress: Animated.Value;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pulsante social: al tocco (o al passaggio del mouse sul web) si allarga e mostra i profili */
export function SocialMenu({ progress, open, onOpenChange }: Props) {
  const { c } = useTheme();
  const go = (url: string) => {
    onOpenChange(false);
    Linking.openURL(url);
  };

  return (
    <Pressable onHoverIn={() => onOpenChange(true)} onHoverOut={() => onOpenChange(false)} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton label={open ? 'Chiudi social' : 'Social'} onPress={() => onOpenChange(!open)} style={{ backgroundColor: 'transparent', borderWidth: 0 }}>
        {open ? <X size={18} color={c.text} /> : <Share2 size={18} color={c.text} />}
      </IconButton>
      <Animated.View style={{ width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, SOCIAL_MENU_W] }), opacity: progress, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', gap: GAP, width: SOCIAL_MENU_W, paddingRight: GAP }}>
          {LINKS.map((l) => (
            <IconButton key={l.key} label={l.label} size={SIZE} onPress={() => go(l.url)} style={{ borderWidth: 0, overflow: 'hidden' }}>
              {l.key === 'fb' ? (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1877F2' }} />
              ) : (
                <LinearGradient colors={IG} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
              )}
              {l.key === 'fb' ? <FacebookIcon size={17} /> : <InstagramIcon size={17} />}
              {l.key === 'ig-young' ? (
                <View style={{ position: 'absolute', bottom: 1, right: 1, minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
                  <Txt w={900} size={8.5} color={palette.onGold} style={{ lineHeight: 11 }}>Y</Txt>
                </View>
              ) : null}
            </IconButton>
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}
