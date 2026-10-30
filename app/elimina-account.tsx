import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { DeleteAccountPanel } from '@/components/DeleteAccountPanel';
import { IconButton } from '@/components/IconButton';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { useApp } from '@/store/AppProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/colors';

/** Impostazioni > Account e privacy > Elimina account */
export default function EliminaAccount() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useApp();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.md, paddingTop: Platform.OS === 'ios' ? space.lg : insets.top + space.md, paddingBottom: insets.bottom + space.xl, gap: space.md, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ alignItems: 'flex-end' }}>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={18} color={c.text} />
          </IconButton>
        </View>
        {user ? (
          <DeleteAccountPanel
            onCancel={() => router.back()}
            onDeleted={(codice) => {
              toast.show(codice ? `Account eliminato (codice ${codice}).` : 'Account eliminato.');
              if (router.canDismiss()) router.dismissAll();
              router.replace('/');
            }}
          />
        ) : (
          <View style={{ gap: space.md }}>
            <Txt size={15} color="muted">Accedi per eliminare il tuo account.</Txt>
            <Button label="Accedi" variant="gold" onPress={() => router.replace('/login')} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
