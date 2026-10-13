import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Eye, EyeOff, Mail, User } from 'lucide-react-native';
import { Arches } from '@/components/Arches';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { LOGO_AVT } from '@/data/assets';
import { useApp } from '@/store/AppProvider';
import { brandGradient, FONT, palette } from '@/theme/colors';
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
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'pass' | 'form', string>>>({});
  const [busy, setBusy] = useState<null | 'form' | 'google' | 'apple'>(null);
  const [done, setDone] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const st = useMemo(() => strength(pass), [pass]);
  const reg = mode === 'register';

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
    if (reg && !name.trim()) e.name = 'Scrivi il tuo nome.';
    if (!email.trim()) e.email = "Inserisci l'email.";
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Email non valida: controlla che contenga @ e un dominio.';
    if (!pass) e.pass = 'Inserisci la password.';
    else if (pass.length < (reg ? 8 : 6)) e.pass = reg ? 'La password deve avere almeno 8 caratteri.' : 'Password troppo corta.';
    setErrors(e);
    if (Object.keys(e).length) return doShake();
    setBusy('form');
    try {
      const u = reg ? await signUp(name.trim(), email.trim(), pass) : await signIn(email.trim(), pass);
      setDone(true);
      setTimeout(() => enter(reg ? `Account creato. Ciao ${u.name}, sei in squadra!` : `Ciao ${u.name}!`), 500);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Operazione non riuscita.' });
      doShake();
    } finally {
      setBusy(null);
    }
  };

  const provider = async (p: 'google' | 'apple') => {
    setBusy(p);
    try {
      await signInWithProvider(p);
      enter(`Accesso effettuato con ${p === 'google' ? 'Google' : 'Apple'}.`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Accesso non riuscito.');
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, flexDirection: wide ? 'row' : 'column' }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + (wide ? 22 : 14), paddingHorizontal: 24, paddingBottom: wide ? 40 : short ? 76 : 84, borderBottomLeftRadius: wide ? 0 : 34, borderBottomRightRadius: 34, borderTopRightRadius: wide ? 34 : 0, overflow: 'hidden', flex: wide ? 1.1 : undefined, justifyContent: 'space-between', gap: wide ? 26 : 14 }}>
          <Arches width={wide ? width * 0.55 : width} height={wide ? 240 : 130} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
              <Txt size={wide ? 15 : 13} color="rgba(255,255,255,0.82)" style={{ marginTop: wide ? 14 : 8, maxWidth: 420 }}>
                Accedi per seguire i match, salvare le giocatrici preferite e ricevere una notifica quando la squadra segna.
              </Txt>
            )}
          </View>
        </LinearGradient>

        <View style={{ flex: wide ? 1 : undefined, alignItems: 'center', justifyContent: wide ? 'center' : 'flex-start', padding: 14, paddingBottom: insets.bottom + (wide ? 24 : 12), marginTop: wide ? 0 : short ? -58 : -64 }}>
          <Animated.View style={{ width: '100%', maxWidth: 430, transform: [{ translateX: shake }] }}>
            <LinearGradient colors={[c.card, c.cardAlt]} style={{ borderRadius: 28, padding: wide ? 22 : 18, borderWidth: 1.5, borderColor: 'rgba(255,213,3,0.5)', gap: wide ? 14 : short ? 8 : 10 }}>
              <SegmentedControl stretch options={[{ value: 'login', label: 'Accedi' }, { value: 'register', label: 'Registrati' }]} value={mode} onChange={(m) => { setMode(m); setErrors({}); }} />
              {/* su telefono il titolo ripeterebbe il selettore Accedi/Registrati: si omette per guadagnare spazio */}
              {wide ? <View>
                <Txt w={900} size={28} style={{ letterSpacing: -0.8 }}>{reg ? 'Crea il tuo account' : 'Accedi'}</Txt>
                <Txt size={14} color="muted" style={{ marginTop: 4 }}>{reg ? 'Bastano pochi secondi, ed è gratis.' : 'Inserisci email e password.'}</Txt>
              </View> : null}

              {reg ? <Field label="Nome" value={name} onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }} error={errors.name} compact={!wide} autoComplete="name" right={<User size={18} color={c.muted} />} /> : null}
              <Field label="Email" value={email} onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }} error={errors.email} compact={!wide} keyboardType="email-address" autoCapitalize="none" autoComplete="email" right={<Mail size={18} color={c.muted} />} />
              <Field label="Password" value={pass} onChangeText={(t) => { setPass(t); setErrors((e) => ({ ...e, pass: undefined })); }} error={errors.pass} compact={!wide} secureTextEntry={!show} autoCapitalize="none" autoComplete={reg ? 'new-password' : 'current-password'}
                right={<Pressable onPress={() => setShow((s) => !s)} hitSlop={10} accessibilityLabel={show ? 'Nascondi password' : 'Mostra password'}>{show ? <EyeOff size={18} color={c.muted} /> : <Eye size={18} color={c.muted} />}</Pressable>} />

              {reg ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
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

              {errors.form ? <Txt size={13} color="danger">{errors.form}</Txt> : null}

              <Button label={done ? 'Fatto' : reg ? 'Crea account' : 'Accedi'} variant={done ? 'ok' : 'gold'} size={wide ? 'lg' : 'md'} loading={busy === 'form'} onPress={submit}
                icon={done ? <Check size={18} color="#fff" /> : undefined} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
                <Txt size={13} color="muted">oppure</Txt>
                <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Google" style={{ flex: 1 }} loading={busy === 'google'} onPress={() => provider('google')} />
                <Button label="Apple" style={{ flex: 1 }} loading={busy === 'apple'} onPress={() => provider('apple')} />
              </View>
              <Pressable onPress={guest} style={{ alignSelf: 'center', paddingVertical: wide ? 4 : 2 }} hitSlop={8}>
                <Txt w={600} size={14} color="muted">Continua senza account</Txt>
              </Pressable>
            </LinearGradient>
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
    <View style={{ gap: 6 }}>
      <View style={{ height: compact ? 52 : 58, borderRadius: 16, borderWidth: 1, borderColor: error ? c.danger : focus ? palette.gold : c.lineStrong, backgroundColor: c.fill, paddingHorizontal: 16, justifyContent: 'center' }}>
        <Txt w={600} size={compact ? 11 : 12} color={error ? 'danger' : focus || input.value ? 'accent' : 'muted'}>{label}</Txt>
        <TextInput
          {...input}
          onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
          placeholderTextColor={c.muted}
          style={{ fontFamily: FONT[500], fontSize: 16, color: c.text, paddingVertical: 2, paddingRight: 30 }}
        />
        {right ? <View style={{ position: 'absolute', right: 14, top: compact ? 17 : 20 }}>{right}</View> : null}
      </View>
      {error ? <Txt size={12.5} color="danger">{error}</Txt> : null}
    </View>
  );
}
