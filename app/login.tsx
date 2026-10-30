import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Check, Eye, EyeOff, Mail, User } from 'lucide-react-native';
import { Arches } from '@/components/Arches';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { FacebookIcon } from '@/components/FacebookIcon';
import { GoogleIcon } from '@/components/GoogleIcon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { LOGO_AVT } from '@/data/assets';
import { AccessoAnnullato, PROVIDER_LABEL, providerDisponibili, type SocialProvider } from '@/lib/auth';
import { apriInformativa } from '@/lib/privacy';
import { useApp } from '@/store/AppProvider';
import { blue, FONT, palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'login' | 'register';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function strength(p: string): { lv: number; label: string } {
  if (!p) return { lv: 0, label: 'Almeno 8 caratteri' };
  if (p.length < 8) return { lv: 1, label: 'Troppo corta' };
  let lv = 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) lv++;
  if (/\d/.test(p)) lv++;
  if (/[^A-Za-z0-9]/.test(p)) lv++;
  return { lv, label: ['', 'Debole', 'Discreta', 'Buona', 'Ottima'][lv] };
}

export default function Login() {
  const { c, mode: theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const toast = useToast();
  const { signIn, signUp, signInWithProvider, resetPassword, continueAsGuest } = useApp();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  // registrazione: dichiarazione 14 anni e informativa obbligatorie, marketing facoltativo (mai preselezionato)
  const [eta, setEta] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'pass' | 'consents' | 'form', string>>>({});
  const [busy, setBusy] = useState<null | 'form' | SocialProvider>(null);
  const [socials, setSocials] = useState<SocialProvider[]>([]);
  const [done, setDone] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const st = useMemo(() => strength(pass), [pass]);
  const reg = mode === 'register';

  useEffect(() => {
    providerDisponibili().then(setSocials);
  }, []);

  const doShake = () => {
    shake.setValue(0);
    Animated.sequence([-9, 8, -5, 3, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 70, useNativeDriver: true }))).start();
  };

  const enter = (msg: string) => {
    toast.show(msg);
    router.replace('/');
  };

  const submit = async () => {
    const e: typeof errors = {};
    if (reg && !name.trim()) e.name = 'Scrivi nome e cognome.';
    if (!email.trim()) e.email = "Inserisci l'email.";
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Email non valida: controlla che contenga @ e un dominio.';
    if (!pass) e.pass = 'Inserisci la password.';
    else if (pass.length < (reg ? 8 : 6)) e.pass = reg ? 'La password deve avere almeno 8 caratteri.' : 'Password troppo corta.';
    if (reg && (!eta || !privacy)) e.consents = 'Per registrarti servono le due conferme obbligatorie.';
    setErrors(e);
    if (Object.keys(e).length) return doShake();
    setBusy('form');
    try {
      const u = reg ? await signUp(name.trim(), email.trim(), pass, marketing) : await signIn(email.trim(), pass);
      if (!u) {
        // conferma dell'email attiva: si accede dopo aver aperto il link
        toast.show(`Ti abbiamo inviato un'email a ${email.trim()}: conferma l'indirizzo e poi accedi.`, Mail);
        setMode('login');
        setPass('');
        return;
      }
      setDone(true);
      setTimeout(() => enter(reg ? `Account creato. Ciao ${u.name}, sei in squadra!` : `Ciao ${u.name}!`), 500);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Operazione non riuscita.' });
      doShake();
    } finally {
      setBusy(null);
    }
  };

  const provider = async (p: SocialProvider) => {
    if (busy) return;
    setBusy(p);
    try {
      await signInWithProvider(p);
      enter(`Accesso effettuato con ${PROVIDER_LABEL[p]}.`);
    } catch (err) {
      if (!(err instanceof AccessoAnnullato)) toast.show(err instanceof Error ? err.message : 'Accesso non riuscito.');
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: 'Inserisci la tua email per ricevere il link di recupero.' });
      return doShake();
    }
    try {
      await resetPassword(email.trim());
      toast.show(`Link per reimpostare la password inviato a ${email.trim()}.`, Mail);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Invio non riuscito.');
    }
  };

  const guest = () => {
    continueAsGuest();
    enter('Puoi accedere quando vuoi dalle impostazioni in alto.');
  };

  const wide = width >= 900;
  // su telefono la schermata deve stare tutta nello schermo, senza scorrere: sugli schermi bassi si compatta ancora
  const short = !wide && height < 760;
  // altezza dei pulsanti social, uguale a quella di Button (sm 38, md 46)
  const socialH = short ? 38 : 46;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, flexDirection: wide ? 'row' : 'column' }} keyboardShouldPersistTaps="handled">
        <View
          style={{ backgroundColor: blue[900], paddingTop: insets.top + (wide ? space.lg : space.md), paddingHorizontal: space.lg, paddingBottom: wide ? space.xxl : short ? 80 : 88, borderBottomLeftRadius: wide ? 0 : 34, borderBottomRightRadius: 34, borderTopRightRadius: wide ? 34 : 0, overflow: 'hidden', flex: wide ? 1.1 : undefined, justifyContent: 'space-between', gap: wide ? space.lg : space.md }}>
          <Arches width={wide ? width * 0.55 : width} height={wide ? 240 : 130} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: wide ? 56 : 44, height: wide ? 56 : 44, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,213,3,0.6)', backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <Image source={LOGO_AVT} style={{ width: wide ? 40 : 30, height: wide ? 43 : 32 }} contentFit="contain" />
            </View>
            <View>
              <Txt w={800} size={15} color="#fff">Smapiù Arena</Txt>
              <Txt size={12} color="rgba(255,255,255,0.75)">Volley Team, Serie A3</Txt>
            </View>
          </View>
          <View>
            <Txt w={900} size={wide ? 72 : 32} color="#fff" style={{ letterSpacing: wide ? -3 : -1.2, lineHeight: wide ? 72 : 34 }}>
              Ogni punto,{'\n'}in diretta.
            </Txt>
            {short ? null : (
              <Txt size={wide ? 15 : 13} color="rgba(255,255,255,0.82)" style={{ marginTop: wide ? space.md : space.sm, maxWidth: 420 }}>
                Accedi per seguire i match, salvare le giocatrici preferite e ricevere una notifica quando la squadra segna.
              </Txt>
            )}
          </View>
        </View>

        <View style={{ flex: wide ? 1 : undefined, alignItems: 'center', justifyContent: wide ? 'center' : 'flex-start', padding: space.md, paddingBottom: insets.bottom + (wide ? space.lg : space.md), marginTop: wide ? 0 : short ? -56 : -64 }}>
          <Animated.View style={{ width: '100%', maxWidth: 430, transform: [{ translateX: shake }] }}>
            <View style={{ backgroundColor: c.card, borderRadius: 28, padding: wide ? space.lg : space.md, borderWidth: 1.5, borderColor: 'rgba(255,213,3,0.5)', gap: wide ? space.md : short ? space.sm : space.sm }}>
              <SegmentedControl stretch options={[{ value: 'login', label: 'Accedi' }, { value: 'register', label: 'Registrati' }]} value={mode} onChange={(m) => { setMode(m); setErrors({}); }} />
              {/* su telefono il titolo ripeterebbe il selettore Accedi/Registrati: si omette per guadagnare spazio */}
              {wide ? <View>
                <Txt w={900} size={28} style={{ letterSpacing: -0.8 }}>{reg ? 'Crea il tuo account' : 'Accedi'}</Txt>
                <Txt size={14} color="muted" style={{ marginTop: space.xs }}>{reg ? 'Bastano pochi secondi, ed è gratis.' : 'Inserisci email e password.'}</Txt>
              </View> : null}

              {reg ? <Field label="Nome e cognome" value={name} onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }} error={errors.name} compact={!wide} autoComplete="name" right={<User size={18} color={c.muted} />} /> : null}
              <Field label="Email" value={email} onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }} error={errors.email} compact={!wide} keyboardType="email-address" autoCapitalize="none" autoComplete="email" right={<Mail size={18} color={c.muted} />} />
              <Field label="Password" value={pass} onChangeText={(t) => { setPass(t); setErrors((e) => ({ ...e, pass: undefined })); }} error={errors.pass} compact={!wide} secureTextEntry={!show} autoCapitalize="none" autoComplete={reg ? 'new-password' : 'current-password'}
                right={<Pressable onPress={() => setShow((s) => !s)} hitSlop={10} accessibilityLabel={show ? 'Nascondi password' : 'Mostra password'}>{show ? <EyeOff size={18} color={c.muted} /> : <Eye size={18} color={c.muted} />}</Pressable>} />

              {reg ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <View style={{ flex: 1, flexDirection: 'row', gap: space.xs }}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= st.lv ? [c.danger, c.danger, '#F2994A', palette.gold, c.ok][st.lv] : c.fill2 }} />
                    ))}
                  </View>
                  <Txt size={12} color="muted">{st.label}</Txt>
                </View>
              ) : (
                <Pressable onPress={forgot} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
                  <Txt w={700} size={14} color="accent">Password dimenticata?</Txt>
                </Pressable>
              )}

              {reg ? (
                <View style={{ gap: space.sm }}>
                  <Checkbox checked={eta} onChange={(v) => { setEta(v); setErrors((e) => ({ ...e, consents: undefined })); }} error={!!errors.consents && !eta}>
                    <Txt size={13} style={{ lineHeight: 18 }}>Dichiaro di avere almeno 14 anni</Txt>
                  </Checkbox>
                  <Checkbox checked={privacy} onChange={(v) => { setPrivacy(v); setErrors((e) => ({ ...e, consents: undefined })); }} error={!!errors.consents && !privacy}>
                    <Txt size={13} style={{ lineHeight: 18 }}>
                      Ho letto l’<Txt size={13} w={700} color="cobalt" style={{ textDecorationLine: 'underline' }} onPress={apriInformativa} accessibilityRole="link">informativa privacy</Txt>
                    </Txt>
                  </Checkbox>
                  <Checkbox checked={marketing} onChange={setMarketing}>
                    <Txt size={13} style={{ lineHeight: 18 }}>Acconsento a ricevere comunicazioni promozionali della società e dei suoi sponsor (facoltativo)</Txt>
                  </Checkbox>
                  {errors.consents ? <Txt size={12.5} color="danger">{errors.consents}</Txt> : null}
                </View>
              ) : null}

              {errors.form ? <Txt size={13} color="danger">{errors.form}</Txt> : null}

              <Button label={done ? 'Fatto' : reg ? 'Crea account' : 'Accedi'} variant={done ? 'ok' : 'gold'} size={wide ? 'lg' : 'md'} loading={busy === 'form'} onPress={submit}
                icon={done ? <Check size={18} color="#fff" /> : undefined} />

              {socials.length ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
                    <Txt size={13} color="muted">oppure</Txt>
                    <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
                  </View>
                  {/* stessa misura ed evidenza per tutti i provider (App Store, guideline 4.8) */}
                  <View style={{ gap: space.sm }}>
                    {socials.map((p) => p === 'apple' ? (
                      <AppleAuthentication.AppleAuthenticationButton key={p}
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                        buttonStyle={theme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={socialH / 2} style={{ width: '100%', height: socialH, opacity: busy && busy !== p ? 0.5 : 1 }} onPress={() => provider(p)} />
                    ) : (
                      <Button key={p} label={`Continua con ${PROVIDER_LABEL[p]}`} size={short ? 'sm' : 'md'} loading={busy === p} disabled={!!busy && busy !== p} onPress={() => provider(p)}
                        icon={p === 'google' ? <GoogleIcon size={17} /> : <FacebookIcon size={18} color={c.text} />} />
                    ))}
                  </View>
                  <Txt size={12} color="muted" center style={{ lineHeight: 17 }}>
                    Continuando accetti l’<Txt size={12} w={700} color="cobalt" style={{ textDecorationLine: 'underline' }} onPress={apriInformativa} accessibilityRole="link">informativa privacy</Txt>
                  </Txt>
                </>
              ) : null}
              <Pressable onPress={guest} style={{ alignSelf: 'center', paddingVertical: wide ? space.xs : space.xs }} hitSlop={8}>
                <Txt w={600} size={14} color="muted">Continua senza account</Txt>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, right, compact, ...input }: TextInputProps & { label: string; error?: string; right?: ReactNode; compact?: boolean }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height: compact ? 52 : 58, borderRadius: 16, borderWidth: 1, borderColor: error ? c.danger : focus ? palette.gold : c.lineStrong, backgroundColor: c.fill, paddingHorizontal: space.md, justifyContent: 'center' }}>
        <Txt w={600} size={compact ? 11 : 12} color={error ? 'danger' : focus || input.value ? 'accent' : 'muted'}>{label}</Txt>
        <TextInput
          {...input}
          onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
          placeholderTextColor={c.muted}
          style={{ fontFamily: FONT[500], fontSize: 16, color: c.text, paddingVertical: space.xs, paddingRight: space.xl }}
        />
        {right ? <View style={{ position: 'absolute', right: 14, top: compact ? 17 : 20 }}>{right}</View> : null}
      </View>
      {error ? <Txt size={12.5} color="danger">{error}</Txt> : null}
    </View>
  );
}
