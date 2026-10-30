import { Linking, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { Card } from './Card';
import { InstagramIcon } from './InstagramIcon';
import { Pressy } from './Pressy';
import { Txt } from './Txt';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/colors';

export function InstagramStrip() {
  const { c } = useTheme();
  return (
    <Pressy onPress={() => Linking.openURL(INSTAGRAM_URL)} scaleTo={0.98} accessibilityRole="link" accessibilityLabel="Instagram">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D6249F' }}>
          <InstagramIcon size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={12.5} color="muted">Seguici su Instagram</Txt>
          <Txt w={700} size={16}>{INSTAGRAM_HANDLE}</Txt>
        </View>
        <ExternalLink size={18} color={c.muted} />
      </Card>
    </Pressy>
  );
}
