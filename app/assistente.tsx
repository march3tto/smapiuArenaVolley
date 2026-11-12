import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ExternalLink, RotateCcw, SendHorizontal, ShieldCheck, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { Txt } from '@/components/Txt';
import { askAssistant, ConsensoAssistenteMancante, type AssistantMessage } from '@/lib/api';
import { useAssistantAvatar } from '@/lib/avatar';
import { apriInformativa } from '@/lib/privacy';
import { useApp } from '@/store/AppProvider';
import { FONT, palette, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const SUGGERIMENTI = ['Prossima partita', 'Ultimo risultato', 'Classifica', 'Chi è la capitana?', 'Rosa Serie D', 'Cos’è il libero?'];
const MAX_CARATTERI = 1000;

/** Assistente AI in chat: partite, risultati, rosa, news della società e pallavolo in generale (solo utenti con account) */
export default function Assistente() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, consents, consentStatus, setAssistantConsent } = useApp();
  // il server ha rifiutato per consenso mancante (es. revocato da un altro dispositivo): si richiede
  const [askConsent, setAskConsent] = useState(false);
  const consentito = consents.assistente_ai?.concesso === true && !askConsent;
  // lo storico resta solo in memoria: non viene salvato né sul dispositivo né sul database
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const list = useRef<FlatList<AssistantMessage>>(null);
  const { name: nomeAvatar } = useAssistantAvatar();
  // benvenuto mostrato come primo messaggio: solo a schermo, non fa parte dello storico inviato al server
  const benvenuto: AssistantMessage = {
    role: 'assistant',
    content: `Ciao! Sono ${nomeAvatar}, chiedimi delle partite, dei risultati, della classifica, della rosa o delle news. Posso anche spiegarti le regole della pallavolo.`,
  };

  const send = async (history: AssistantMessage[]) => {
    setMessages(history);
    setError(null);
    setLoading(true);
    try {
      const { reply, limitReached } = await askAssistant(history);
      setMessages([...history, { role: 'assistant', content: reply }]);
      if (limitReached) setBlocked(true);
    } catch (e) {
      if (e instanceof ConsensoAssistenteMancante) {
        // la domanda non è partita: resta nel campo di testo per quando si accetta
        setMessages(history.slice(0, -1));
        setText(history[history.length - 1]?.content ?? '');
        setAskConsent(true);
        return;
      }
      setError('Connessione non riuscita. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const ask = (q: string) => {
    const t = q.trim();
    if (!t || loading || blocked) return;
    setText('');
    send([...messages, { role: 'user', content: t }]);
  };

  const disabled = loading || blocked;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingTop: Platform.OS === 'ios' ? space.lg : insets.top + space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingBottom: space.md }}>
          <Avatar size={44} />
          <View style={{ flex: 1 }}>
            <Txt w={800} size={22} style={{ letterSpacing: -0.4 }}>Assistente</Txt>
            <Txt size={13} color="muted">Partite, squadra, news e pallavolo</Txt>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={18} color={c.text} />
          </IconButton>
        </View>

        {!user ? (
          <View style={{ padding: space.md }}>
            <Card style={{ gap: space.md }}>
              <Txt w={700} size={17}>Accedi per usare l’assistente</Txt>
              <Txt size={15} color="muted">L’assistente risponde alle domande su partite, risultati, classifica, rosa e news della società, e sulla pallavolo in generale.</Txt>
              <Button label="Accedi o registrati" variant="gold" onPress={() => router.replace('/login')} />
            </Card>
          </View>
        ) : consentStatus === 'caricamento' ? (
          <ActivityIndicator style={{ marginTop: space.xl }} color={c.muted} />
        ) : !consentito ? (
          <ConsensoAi onAccept={async () => { await setAssistantConsent(true); setAskConsent(false); }} onDecline={() => router.back()} />
        ) : (
          <>
            <FlatList
              ref={list}
              data={messages}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ padding: space.md, gap: space.sm, flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => <Bubble message={item} />}
              ListHeaderComponent={<Bubble message={benvenuto} />}
              ListEmptyComponent={<Suggestions onPick={ask} />}
              ListFooterComponent={
                <View style={{ gap: space.sm, marginTop: messages.length ? space.sm : 0 }}>
                  {loading ? <Typing /> : null}
                  {error ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start' }}>
                      <Txt size={14} color="danger">{error}</Txt>
                      <Button label="Riprova" size="sm" icon={<RotateCcw size={14} color={c.text} />} onPress={() => send(messages)} />
                    </View>
                  ) : null}
                </View>
              }
            />

            <View style={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, gap: space.sm, borderTopWidth: 1, borderTopColor: c.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={blocked ? 'Limite di domande raggiunto per oggi' : 'Scrivi una domanda…'}
                  placeholderTextColor={c.muted}
                  editable={!blocked}
                  multiline
                  maxLength={MAX_CARATTERI}
                  submitBehavior="submit"
                  returnKeyType="send"
                  onSubmitEditing={() => ask(text)}
                  accessibilityLabel="Domanda per l’assistente"
                  style={{ flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.fill,
                    paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.md, fontFamily: FONT[500], fontSize: 16, color: c.text, opacity: blocked ? 0.5 : 1 }}
                />
                <IconButton label="Invia" size={46} active={!disabled && !!text.trim()} onPress={() => ask(text)}>
                  {loading ? <ActivityIndicator size="small" color={c.muted} /> : <SendHorizontal size={19} color={!disabled && text.trim() ? palette.onGold : c.muted} />}
                </IconButton>
              </View>
              <Txt size={11.5} color="muted" center>Risposte generate da AI: verifica i dati importanti nel calendario.</Txt>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/** Volto dell'assistente: cerchio oro con l'illustrazione */
function Avatar({ size = 30 }: { size?: number }) {
  const { source } = useAssistantAvatar();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: palette.gold }}>
      <Image source={source} style={{ width: size, height: size }} contentFit="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Le risposte dell'assistente hanno il suo avatar a sinistra, allineato in basso */
function ConAvatar({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, maxWidth: '92%' }}>
      <Avatar />
      <View style={{ flexShrink: 1 }}>{children}</View>
    </View>
  );
}

function Bubble({ message }: { message: AssistantMessage }) {
  const { c } = useTheme();
  const mine = message.role === 'user';
  const bubble = (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: mine ? '86%' : '100%', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md,
      borderBottomRightRadius: mine ? 6 : radius.md, borderBottomLeftRadius: mine ? radius.md : 6,
      backgroundColor: mine ? palette.gold : c.card, borderWidth: mine ? 0 : 1, borderColor: c.line }}>
      <Txt size={15} color={mine ? palette.onGold : c.text} selectable>{message.content}</Txt>
    </View>
  );
  return mine ? bubble : <ConAvatar>{bubble}</ConAvatar>;
}

/** Domande pronte quando la chat è vuota */
function Suggestions({ onPick }: { onPick: (q: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {SUGGERIMENTI.map((s) => (
          <Pressy key={s} onPress={() => onPick(s)} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={s}
            style={{ paddingHorizontal: space.md, height: 36, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1, borderColor: palette.gold, backgroundColor: c.fill }}>
            <Txt w={600} size={13.5}>{s}</Txt>
          </Pressy>
        ))}
      </View>
    </View>
  );
}

/** "Sta scrivendo…" con tre puntini che pulsano */
function Typing() {
  const { c } = useTheme();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));
  useEffect(() => {
    const anim = Animated.loop(Animated.stagger(160, dots.map((d) => Animated.sequence([
      Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0.3, duration: 280, useNativeDriver: true }),
    ]))));
    anim.start();
    return () => anim.stop();
  }, [dots]);
  return (
    <ConAvatar>
    <View accessibilityLabel="L’assistente sta scrivendo" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md,
      borderRadius: radius.md, borderBottomLeftRadius: 6, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {dots.map((d, i) => <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.gold, opacity: d }} />)}
      </View>
      <Txt size={13} color="muted">sta scrivendo…</Txt>
    </View>
    </ConAvatar>
  );
}

/**
 * Consenso esplicito prima del primo uso (App Store 5.1.2, GDPR): a chi vanno le domande, cosa si invia e cosa no.
 * Registrato in consensi_utente (tipo assistente_ai); la funzione assistente rifiuta le domande senza.
 */
function ConsensoAi({ onAccept, onDecline }: { onAccept: () => Promise<void>; onDecline: () => void }) {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await onAccept();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Salvataggio non riuscito. Riprova.');
    } finally {
      setBusy(false);
    }
  };
  const punto = (t: string) => (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Txt size={15} color="muted">•</Txt>
      <Txt size={15} style={{ flex: 1, lineHeight: 21 }}>{t}</Txt>
    </View>
  );
  return (
    <View style={{ padding: space.md }}>
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ShieldCheck size={20} color={c.accent} />
          <Txt w={700} size={17}>Prima di iniziare</Txt>
        </View>
        <Txt size={15} style={{ lineHeight: 21 }}>
          Per rispondere, l’assistente invia le tue domande a <Txt size={15} w={700}>Groq Inc. (Stati Uniti)</Txt>, un servizio di intelligenza artificiale di terze parti.
        </Txt>
        {punto('Inviamo solo il testo delle domande e delle ultime risposte della conversazione: niente nome, email o altri dati del tuo account.')}
        {punto('L’app non conserva le conversazioni. Non scrivere dati personali nelle domande.')}
        {punto('Puoi revocare il consenso quando vuoi da Impostazioni › Account e privacy.')}
        <Pressy onPress={apriInformativa} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start' }}>
          <Txt w={700} size={14} color="cobalt" style={{ textDecorationLine: 'underline' }}>Informativa privacy</Txt>
          <ExternalLink size={14} color={c.cobalt} />
        </Pressy>
        {error ? <Txt size={13} color="danger">{error}</Txt> : null}
        <Button label="Accetto e continua" variant="gold" loading={busy} onPress={accept} />
        <Button label="No, grazie" disabled={busy} onPress={onDecline} />
      </Card>
    </View>
  );
}
