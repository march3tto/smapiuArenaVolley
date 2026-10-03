import { Alert, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Moon, Settings, Sun, User } from 'lucide-react-native';
import { IconButton } from './IconButton';
import { Txt } from './Txt';
import { useToast } from './Toast';
import { LOGO_AVT } from '@/data/assets';
import { initials } from '@/lib/format';
import { useApp } from '@/store/AppProvider';
import { brandGradient, palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const { c, mode, toggle } = useTheme();
  const { user, prefs, signOut } = useApp();
  const router = useRouter();
  const toast = useToast();

  const onAccount = () => {
    if (!user) return router.push('/login');
    const out = async () => {
      await signOut();
      toast.show("Sei uscito dall'account.");
      router.replace('/login');
    };
    if (Platform.OS === 'web') return void out();
    Alert.alert(user.name, user.email, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: out },
    ]);
  };

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 14, paddingBottom: 8, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1120, alignSelf: 'center', backgroundColor: c.card, borderRadius: 999, borderWidth: 1, borderColor: c.line, padding: 6, paddingRight: 8 }}>
        <Pressable onPress={() => router.navigate('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="button" accessibilityLabel="Home">
          <LinearGradient colors={brandGradient} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(242,184,0,0.6)' }}>
            <Image source={LOGO_AVT} style={{ width: 28, height: 30 }} contentFit="contain" />
          </LinearGradient>
          <View>
            <Txt w={800} size={14} style={{ letterSpacing: -0.2 }}>
              Smapiù Arena
            </Txt>
            <Txt size={11} color="muted">
              Volley Team, Serie A3
            </Txt>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <IconButton label={user ? `Account di ${user.name}` : 'Accedi'} onPress={onAccount} active={!!user}>
            {user ? (
              <Txt w={800} size={13} color={palette.onGold}>
                {initials(user.name)}
              </Txt>
            ) : (
              <User size={18} color={c.text} />
            )}
          </IconButton>
          <IconButton label="Cambia tema" onPress={toggle}>
            {mode === 'dark' ? <Sun size={18} color={c.text} /> : <Moon size={18} color={c.text} />}
          </IconButton>
          <IconButton label="Impostazioni notifiche" onPress={() => router.push('/settings')} dot={prefs.enabled}>
            <Settings size={18} color={c.text} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}
