import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { AuthField } from '@/components/AuthField';
import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { passwordStrength } from '@/lib/password';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/store/AppProvider';
import { blue, palette, radius, space } from '@/theme/colors';
import { DarkTheme, useTheme } from '@/theme/ThemeProvider';

type Params = { code?: string; token_hash?: string; type?: string; error?: string; error_code?: string; error_description?: string };
type Stato = 'verifica' | 'pronto' | 'errore';

// un codice PKCE si scambia una sola volta: evita il secondo tentativo (doppio effetto, rimontaggio della schermata)
const codiciUsati = new Set<string>();

/** Parametri del redirect: in query (PKCE) o nel frammento #... (errori e flusso implicito sul web) */
function leggiParametri(p: Params): Params {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.location.hash) return p;
  const h = Object.fromEntries(new URLSearchParams(window.location.hash.slice(1)));
  return { ...h, ...p };
}

function messaggioLink(p: Params): string {
  if (p.error_code === 'otp_expired' || /expired/i.test(p.error_description ?? '')) return 'Il link è scaduto o è già stato usato.';
  return p.error_description?.replace(/\+/g, ' ') || 'Il link di recupero non è valido.';
}

/**
 * Nuova password dopo il link dell'email di recupero (arenavolley://reset-password?code=… sul nativo,
 * /reset-password?code=… sul web). Lo scambio del codice emette PASSWORD_RECOVERY: da lì basta updateUser({ password }).
 */
export default function ResetPassword() {
  return <DarkTheme><ResetPasswordScreen /></DarkTheme>;
}

function ResetPasswordScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<Params>();
  const { ready, user, recovering, updatePassword, endRecovery, signOut } = useApp();

  const [stato, setStato] = useState<Stato>('verifica');
  const [linkError, setLinkError] = useState('');
  const [pass, setPass] = useState('');
  const [conferma, setConferma] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'pass' | 'conferma' | 'form', string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const st = useMemo(() => passwordStrength(pass), [pass]);
  const avviato = useRef(false);

  useEffect(() => {
    if (!ready || avviato.current) return;
    avviato.current = true;
    const p = leggiParametri(params);
    (async () => {
      if (p.error || p.error_code) {
        setLinkError(messaggioLink(p));
        return setStato('errore');
      }
      if (!supabase) return setStato('pronto');
      try {
        if (p.code && !codiciUsati.has(p.code)) {
          codiciUsati.add(p.code);
          const { error } = await supabase.auth.exchangeCodeForSession(p.code);
          if (error) throw error;
        } else if (p.token_hash && !codiciUsati.has(p.token_hash)) {
          // dal pulsante "Apri nell'app" della pagina web (modello email con {{ .TokenHash }}): verifyOtp emette PASSWORD_RECOVERY
          codiciUsati.add(p.token_hash);
          const { error } = await supabase.auth.verifyOtp({ token_hash: p.token_hash, type: 'recovery' });
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error('missing');
        }
        setStato('pronto');
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        // il verificatore PKCE vive sul dispositivo che ha chiesto il link
        setLinkError(/code verifier|both auth code and code verifier/i.test(msg)
          ? 'Apri il link sullo stesso dispositivo da cui hai chiesto il recupero, oppure richiedine uno nuovo.'
          : 'Il link è scaduto o è già stato usato.');
        setStato('errore');
      }
    })();
  }, [ready, params]);

  const salva = async () => {
    const e: typeof errors = {};
    if (pass.length < 8) e.pass = 'La password deve avere almeno 8 caratteri.';
    if (conferma !== pass) e.conferma = 'Le due password non coincidono.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await updatePassword(pass);
      setDone(true);
      setTimeout(() => {
        toast.show('Password aggiornata.', Check);
        router.replace('/');
      }, 500);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Aggiornamento non riuscito.' });
    } finally {
      setBusy(false);
    }
  };

  const annulla = async () => {
    // la sessione aperta dal link serviva solo a cambiare la password: senza cambio si esce
    endRecovery();
    if (recovering) await signOut().catch(() => {});
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: blue[900] }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.lg, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }} keyboardShouldPersistTaps="handled">
          <View style={{ width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: blue[800], borderRadius: radius.xl, padding: space.lg, borderWidth: 2, borderColor: palette.gold, gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <KeyRound size={24} color={palette.gold} />
              <Txt w={900} size={26} display color="#fff">Nuova password</Txt>
            </View>

            {stato === 'verifica' ? (
              <View style={{ paddingVertical: space.xl, alignItems: 'center', gap: space.md }}>
                <ActivityIndicator color={palette.gold} />
                <Txt color="muted">Verifica del link in corso…</Txt>
              </View>
            ) : stato === 'errore' ? (
              <>
                <Txt size={15} style={{ lineHeight: 21 }}>{linkError}</Txt>
                <Button label="Richiedi un nuovo link" variant="gold" onPress={() => router.replace('/login')} />
              </>
            ) : (
              <>
                <Txt size={15} color="muted" style={{ lineHeight: 21 }}>
                  {user?.email ? `Scegli la nuova password per ${user.email}.` : 'Scegli la nuova password per il tuo account.'}
                </Txt>
                <AuthField label="Nuova password" value={pass} onChangeText={(t) => { setPass(t); setErrors((x) => ({ ...x, pass: undefined, form: undefined })); }} error={errors.pass}
                  secureTextEntry={!show} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" autoFocus
                  right={<Pressable onPress={() => setShow((s) => !s)} hitSlop={10} accessibilityLabel={show ? 'Nascondi password' : 'Mostra password'}>{show ? <EyeOff size={18} color={c.muted} /> : <Eye size={18} color={c.muted} />}</Pressable>} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <View style={{ flex: 1, flexDirection: 'row', gap: space.xs }}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= st.lv ? [c.danger, c.danger, '#F2994A', palette.gold, c.ok][st.lv] : c.fill2 }} />
                    ))}
                  </View>
                  <Txt size={12} color="muted">{st.label}</Txt>
                </View>
                <AuthField label="Conferma password" value={conferma} onChangeText={(t) => { setConferma(t); setErrors((x) => ({ ...x, conferma: undefined, form: undefined })); }} error={errors.conferma}
                  secureTextEntry={!show} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" onSubmitEditing={salva} returnKeyType="done" />
                {errors.form ? <Txt size={13} color="danger">{errors.form}</Txt> : null}
                <Button label={done ? 'Fatto' : 'Salva password'} variant={done ? 'ok' : 'gold'} loading={busy} onPress={salva}
                  icon={done ? <Check size={18} color="#fff" /> : undefined} />
              </>
            )}

            {done ? null : (
              <Pressable onPress={annulla} style={{ alignSelf: 'center', paddingVertical: space.xs }} hitSlop={8}>
                <Txt w={600} size={14} color="muted">Annulla</Txt>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
