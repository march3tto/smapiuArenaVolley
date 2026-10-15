import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Button } from './Button';
import { Txt } from './Txt';
import { AccessoAnnullato } from '@/lib/auth';
import { useApp } from '@/store/AppProvider';
import { FONT } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const PAROLA = 'ELIMINA';

/** Spiegazione e conferma della cancellazione dell'account (Impostazioni e onboarding consensi) */
export function DeleteAccountPanel({ onDeleted, onCancel }: { onDeleted: (codice: string) => void; onCancel?: () => void }) {
  const { c } = useTheme();
  const { user, deleteAccount } = useApp();
  const [testo, setTesto] = useState('');
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const apple = !!user?.providers?.includes('apple');

  const elimina = async () => {
    setBusy(true);
    setErrore(null);
    try {
      onDeleted(await deleteAccount());
    } catch (e) {
      setErrore(e instanceof AccessoAnnullato ? 'Per eliminare l’account devi confermare con Apple.' : e instanceof Error ? e.message : 'Eliminazione non riuscita.');
    } finally {
      setBusy(false);
    }
  };

  const punti = [
    'l’account e tutti i metodi di accesso collegati (email, Apple, Google, Facebook);',
    'il profilo: nome, ruolo, categoria giovanile di interesse;',
    'lo storico dei consensi privacy e marketing;',
    'il collegamento tra il tuo account e le notifiche push di questo e degli altri dispositivi.',
  ];

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.danger }}>
          <Trash2 size={19} color="#fff" />
        </View>
        <Txt w={800} size={20} style={{ flex: 1, letterSpacing: -0.4 }}>Elimina account</Txt>
      </View>
      <Txt size={14} color="muted" style={{ lineHeight: 20 }}>Vengono eliminati definitivamente:</Txt>
      <View style={{ gap: 4 }}>
        {punti.map((p) => (
          <Txt key={p} size={14} style={{ lineHeight: 20 }}>•  {p}</Txt>
        ))}
      </View>
      <Txt size={14} color="muted" style={{ lineHeight: 20 }}>
        L’operazione è irreversibile. Resta solo un registro anonimo della cancellazione (data e codice di conferma, senza nome né email).
        {apple ? ' Ti chiederemo di confermare con Apple: così revochiamo anche l’accesso con Apple.' : ''}
        {apple && Platform.OS !== 'ios' ? ' Da questo dispositivo la revoca Apple non è possibile: puoi farla da Impostazioni > ID Apple > Accedi con Apple.' : ''}
      </Txt>
      <Txt size={12.5} color="muted" style={{ lineHeight: 18 }}>
        I backup automatici del database possono contenere i tuoi dati ancora per alcuni giorni, poi vengono sovrascritti.
      </Txt>

      <Txt w={600} size={13}>Scrivi {PAROLA} per confermare</Txt>
      <TextInput value={testo} onChangeText={(t) => { setTesto(t); setErrore(null); }} autoCapitalize="characters" autoCorrect={false} placeholder={PAROLA} placeholderTextColor={c.muted}
        accessibilityLabel={`Scrivi ${PAROLA} per confermare`}
        style={{ height: 50, borderRadius: 14, borderWidth: 1, borderColor: testo === PAROLA ? c.danger : c.lineStrong, backgroundColor: c.fill, paddingHorizontal: 14, fontFamily: FONT[600], fontSize: 16, color: c.text, letterSpacing: 1 }} />
      {errore ? <Txt size={13} color="danger">{errore}</Txt> : null}

      <Button label="Elimina definitivamente" variant="danger" loading={busy} disabled={testo.trim() !== PAROLA} onPress={elimina} />
      {onCancel ? <Button label="Annulla" onPress={onCancel} disabled={busy} /> : null}
    </View>
  );
}
