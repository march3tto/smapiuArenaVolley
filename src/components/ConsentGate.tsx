import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { DeleteAccountPanel } from './DeleteAccountPanel';
import { Txt } from './Txt';
import { useToast } from './Toast';
import { apriInformativa, PRIVACY_POLICY_VERSION } from '@/lib/privacy';
import { useApp } from '@/store/AppProvider';
import { FONT, palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Onboarding consensi, bloccante: copre tutta l'app finché l'utente collegato non dichiara di avere almeno 14 anni
 * e non accetta l'informativa nella versione corrente. Serve soprattutto a chi entra con Apple, Google o Facebook,
 * che non passa dal modulo di registrazione. In alternativa si può uscire o eliminare l'account.
 */
export function ConsentGate() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, consents, acceptConsents, signOut } = useApp();
  // chi aveva già scelto (informativa precedente) ritrova la propria scelta; per i nuovi utenti la casella è vuota
  const [marketing, setMarketing] = useState(consents.marketing?.concesso === true);
  const [eta, setEta] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [nome, setNome] = useState('');
  const [tentato, setTentato] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [elimina, setElimina] = useState(false);

  const chiediNome = !user?.hasName;
  const aggiornamento = !!consents.informativa_privacy && consents.informativa_privacy.versione !== PRIVACY_POLICY_VERSION;
  const nomeOk = !chiediNome || nome.trim().length >= 3;

  const conferma = async () => {
    setTentato(true);
    if (!eta || !privacy || !nomeOk) return;
    setBusy(true);
    setErrore(null);
    try {
      await acceptConsents(marketing, chiediNome ? nome : undefined);
      toast.show('Grazie, sei in squadra!');
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Salvataggio non riuscito, riprova.');
    } finally {
      setBusy(false);
    }
  };

  const esci = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.md, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }}>
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', borderRadius: 28, padding: space.lg, gap: space.md, backgroundColor: c.card, borderWidth: 1.5, borderColor: 'rgba(255,213,3,0.5)' }}>
          {elimina ? (
            <DeleteAccountPanel
              onCancel={() => setElimina(false)}
              onDeleted={() => {
                toast.show('Account eliminato.');
                router.replace('/');
              }}
            />
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.gold }}>
                  <ShieldCheck size={20} color={palette.onGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt w={800} size={20} style={{ letterSpacing: -0.4 }}>{aggiornamento ? 'Informativa aggiornata' : 'Prima di iniziare'}</Txt>
                  <Txt size={13} color="muted">{user?.email}</Txt>
                </View>
              </View>
              <Txt size={14} color="muted" style={{ lineHeight: 20 }}>
                {aggiornamento
                  ? 'Abbiamo aggiornato l’informativa privacy: per continuare a usare il tuo account conferma le scelte qui sotto.'
                  : 'Per usare l’app con il tuo account ci servono alcune conferme.'}
              </Txt>

              {chiediNome ? (
                <View style={{ gap: space.sm }}>
                  <Txt w={600} size={13}>Nome e cognome</Txt>
                  <TextInput value={nome} onChangeText={setNome} autoComplete="name" textContentType="name" placeholder="Es. Giulia Rossi" placeholderTextColor={c.muted}
                    style={{ height: 50, borderRadius: 14, borderWidth: 1, borderColor: tentato && !nomeOk ? c.danger : c.lineStrong, backgroundColor: c.fill, paddingHorizontal: space.md, fontFamily: FONT[500], fontSize: 16, color: c.text }} />
                  {tentato && !nomeOk ? <Txt size={12.5} color="danger">Scrivi nome e cognome.</Txt> : null}
                </View>
              ) : null}

              <Checkbox checked={eta} onChange={setEta} error={tentato && !eta}>
                <Txt size={14} style={{ lineHeight: 20 }}>Dichiaro di avere almeno 14 anni <Txt size={14} color="muted">(obbligatorio)</Txt></Txt>
              </Checkbox>
              <Checkbox checked={privacy} onChange={setPrivacy} error={tentato && !privacy}>
                <Txt size={14} style={{ lineHeight: 20 }}>
                  Ho letto l’<Txt size={14} w={700} color="cobalt" style={{ textDecorationLine: 'underline' }} onPress={apriInformativa} accessibilityRole="link">informativa privacy</Txt>{' '}
                  <Txt size={14} color="muted">(obbligatorio)</Txt>
                </Txt>
              </Checkbox>
              <Checkbox checked={marketing} onChange={setMarketing}>
                <Txt size={14} style={{ lineHeight: 20 }}>
                  Acconsento a ricevere comunicazioni promozionali della società e dei suoi sponsor <Txt size={14} color="muted">(facoltativo)</Txt>
                </Txt>
              </Checkbox>

              {tentato && (!eta || !privacy) ? <Txt size={13} color="danger">Per continuare servono le due conferme obbligatorie.</Txt> : null}
              {errore ? <Txt size={13} color="danger">{errore}</Txt> : null}

              <Button label="Conferma e continua" variant="gold" loading={busy} onPress={conferma} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs }}>
                <Pressable onPress={esci} hitSlop={8} accessibilityRole="button" disabled={busy}>
                  <Txt w={600} size={14} color="muted">Esci</Txt>
                </Pressable>
                <Pressable onPress={() => setElimina(true)} hitSlop={8} accessibilityRole="button" disabled={busy}>
                  <Txt w={600} size={14} color="danger">Elimina account</Txt>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
