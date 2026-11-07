import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Eye, EyeOff, Mail, Settings, User } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { AuthField as Field } from '@/components/AuthField';
import { Checkbox } from '@/components/Checkbox';
import { FacebookIcon } from '@/components/FacebookIcon';
import { GoogleIcon } from '@/components/GoogleIcon';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { LOGIN_PHOTO, LOGO_BRAND } from '@/data/assets';
import { AccessoAnnullato, PROVIDER_LABEL, providerDisponibili, type SocialProvider } from '@/lib/auth';
import { passwordStrength as strength } from '@/lib/password';
import { apriInformativa } from '@/lib/privacy';
import { useApp } from '@/store/AppProvider';
import { blue, palette, radius, space } from '@/theme/colors';
import { DarkTheme, useTheme } from '@/theme/ThemeProvider';

type Mode = 'login' | 'register';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Fondo sotto la foto (mentre si carica) e velatura del cielo dietro i testi */
const LOGIN_NAVY = '#0E2240';

// la schermata sta sopra una foto scura: sempre colori scuri, anche col tema chiaro
export default function Login() {
  return <DarkTheme><LoginScreen /></DarkTheme>;
}

function LoginScreen() {
  const { c } = useTheme();
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
  const gutter = wide ? space.xl : space.lg;

  const tab = (m: Mode, label: string) => (
    <Pressable onPress={() => { setMode(m); setErrors({}); }} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}
      style={{ flex: 1, height: short ? 40 : 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? palette.gold : 'transparent' }}>
      <Txt w={800} size={16} display color={mode === m ? palette.onGold : '#fff'}>{label}</Txt>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: LOGIN_NAVY }}>
      {/* foto dell'Arena a tutto schermo, velata in alto per leggere i testi */}
      <Image source={LOGIN_PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" />
      <LinearGradient colors={['rgba(14,34,64,0.75)', 'rgba(14,34,64,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * 0.4 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', gap: space.xl, paddingBottom: insets.bottom + space.xxl + space.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: insets.top + space.lg, paddingHorizontal: gutter, paddingBottom: space.lg, gap: short ? space.md : space.lg, alignItems: wide ? 'center' : 'stretch' }}>
            <View style={{ width: '100%', maxWidth: wide ? 640 : undefined }}>
              <Image source={LOGO_BRAND} style={{ width: wide ? 200 : 150, height: wide ? 78 : 58 }} contentFit="contain" contentPosition="left" accessibilityLabel="Arena Volley Team e Smapiù" />
            </View>
            <View style={{ width: '100%', maxWidth: wide ? 640 : undefined }}>
              <Txt w={900} size={wide ? 56 : short ? 34 : 40} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}>
                Qui sei di casa
              </Txt>
              <Txt w={700} size={wide ? 18 : 16} color="#fff" style={{ marginTop: space.xs }}>La Smapiù Arena si vive insieme.</Txt>
              <Txt size={wide ? 17 : 15} color="rgba(255,255,255,0.88)" style={{ lineHeight: wide ? 24 : 21 }}>
                Segui le partite, sostieni le tue giocatrici e vivi la tua squadra, sempre e ovunque.
              </Txt>
            </View>
          </View>

          <View style={{ alignItems: 'center', paddingHorizontal: gutter }}>
            <Animated.View style={{ width: '100%', maxWidth: 430, transform: [{ translateX: shake }] }}>
              <View style={{ backgroundColor: blue[800], borderRadius: radius.xl, padding: wide ? space.lg : space.md, borderWidth: 2, borderColor: palette.gold, gap: short ? space.sm : space.md, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}>
                <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: space.xs, padding: space.xs, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  {tab('login', 'Accedi')}
                  {tab('register', 'Registrati')}
                </View>

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
                ) : null}

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

                {reg ? null : (
                  <Pressable onPress={forgot} style={{ alignSelf: 'center' }} hitSlop={8}>
                    <Txt w={500} size={15} color="rgba(255,255,255,0.85)">Password dimenticata?</Txt>
                  </Pressable>
                )}

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
                          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
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
                <Pressable onPress={guest} style={{ alignSelf: 'center', paddingVertical: space.xs }} hitSlop={8}>
                  <Txt w={600} size={14} color="muted">Continua senza account</Txt>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Impostazioni"
        style={{ position: 'absolute', right: gutter, bottom: insets.bottom + space.md }}>
        <Settings size={30} color={palette.gold} fill={palette.gold} strokeWidth={1.6} />
      </Pressable>
    </View>
  );
}
