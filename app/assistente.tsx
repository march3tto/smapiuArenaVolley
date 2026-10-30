import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RotateCcw, SendHorizontal, Sparkles, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Pressy } from '@/components/Pressy';
import { Txt } from '@/components/Txt';
import { askAssistant, type AssistantMessage } from '@/lib/api';
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
  const { user } = useApp();
  // lo storico resta solo in memoria: non viene salvato né sul dispositivo né sul database
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const list = useRef<FlatList<AssistantMessage>>(null);

  const send = async (history: AssistantMessage[]) => {
    setMessages(history);
    setError(null);
    setLoading(true);
    try {
      const { reply, limitReached } = await askAssistant(history);
      setMessages([...history, { role: 'assistant', content: reply }]);
      if (limitReached) setBlocked(true);
    } catch {
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
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
            <Sparkles size={20} color={palette.gold} />
          </View>
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

function Bubble({ message }: { message: AssistantMessage }) {
  const { c } = useTheme();
  const mine = message.role === 'user';
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '86%', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md,
      borderBottomRightRadius: mine ? 6 : radius.md, borderBottomLeftRadius: mine ? radius.md : 6,
      backgroundColor: mine ? palette.gold : c.card, borderWidth: mine ? 0 : 1, borderColor: c.line }}>
      <Txt size={15} color={mine ? palette.onGold : c.text} selectable>{message.content}</Txt>
    </View>
  );
}

/** Domande pronte quando la chat è vuota */
function Suggestions({ onPick }: { onPick: (q: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', gap: space.md, paddingBottom: space.sm }}>
      <Txt size={15} color="muted">Ciao! Chiedimi delle partite, dei risultati, della classifica, della rosa o delle news. Posso anche spiegarti le regole della pallavolo.</Txt>
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
    <View accessibilityLabel="L’assistente sta scrivendo" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md,
      borderRadius: radius.md, borderBottomLeftRadius: 6, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {dots.map((d, i) => <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.gold, opacity: d }} />)}
      </View>
      <Txt size={13} color="muted">sta scrivendo…</Txt>
    </View>
  );
}
