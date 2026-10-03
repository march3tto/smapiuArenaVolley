import { Linking, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExternalLink } from 'lucide-react-native';
import { Card } from './Card';
import { InstagramIcon } from './InstagramIcon';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';

export function InstagramStrip() {
  const { c } = useTheme();
  return (
    <Pressy onPress={() => Linking.openURL(INSTAGRAM_URL)} scaleTo={0.98} accessibilityRole="link" accessibilityLabel="Instagram">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
        <LinearGradient colors={['#FDF497', '#FD5949', '#D6249F', '#285AEB']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
          <InstagramIcon size={22} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Txt size={12.5} color="muted">Seguici su Instagram</Txt>
          <Txt w={700} size={16}>{INSTAGRAM_HANDLE}</Txt>
        </View>
        <ExternalLink size={18} color={c.muted} />
      </Card>
    </Pressy>
  );
}
