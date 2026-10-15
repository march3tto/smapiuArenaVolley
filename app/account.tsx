import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, ExternalLink, Trash2, UserRound, X } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Txt } from '@/components/Txt';
import { useToast } from '@/components/Toast';
import { newsDate } from '@/lib/format';
import { PROVIDER_LABEL } from '@/lib/auth';
import { apriInformativa, PRIVACY_POLICY_VERSION, type TipoConsenso } from '@/lib/privacy';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const RUOLO_LABEL = { public: 'Tifoso', parent: 'Genitore', staff: 'Staff', admin: 'Amministratore' } as const;

const CONSENSI: { tipo: TipoConsenso; label: string; si: string; no: string }[] = [
  { tipo: 'informativa_privacy', label: 'Informativa privacy', si: 'Letta', no: 'Non accettata' },
  { tipo: 'eta_14_anni', label: 'Almeno 14 anni', si: 'Dichiarato', no: 'Non dichiarato' },
  { tipo: 'marketing', label: 'Comunicazioni promozionali', si: 'Acconsentito', no: 'Non acconsentito' },
];

/** Impostazioni > Account e privacy: profilo, metodo di accesso, consensi, eliminazione account */
export default function Account() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, consents, setMarketing, setYouthCategory } = useApp();
  const { youth } = useData();
  const [busy, setBusy] = useState<null | 'marketing' | 'categoria'>(null);

  const run = async (k: 'marketing' | 'categoria', fn: () => Promise<void>, ok: string) => {
    setBusy(k);
    try {
      await fn();
      toast.show(ok);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Salvataggio non riuscito.');
    } finally {
      setBusy(null);
    }
  };

  const marketing = consents.marketing?.concesso === true;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: Platform.OS === 'ios' ? 22 : insets.top + 16, paddingBottom: insets.bottom + 30, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy }}>
            <UserRound size={20} color={palette.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt w={800} size={22} style={{ letterSpacing: -0.4 }}>Account e privacy</Txt>
            <Txt size={13} color="muted">I tuoi dati e le tue scelte</Txt>
          </View>
          <IconButton label="Chiudi" onPress={() => router.back()}>
            <X size={18} color={c.text} />
          </IconButton>
        </View>

        {!user ? (
          <Card style={{ gap: 12 }}>
            <Txt size={15} color="muted">Non hai effettuato l’accesso.</Txt>
            <Button label="Accedi o registrati" variant="gold" onPress={() => router.replace('/login')} />
            <Row label="Informativa privacy" onPress={apriInformativa} icon={<ExternalLink size={16} color={c.muted} />} />
          </Card>
        ) : (
          <>
            <Section title="Account">
              <Info label="Nome" value={user.name} />
              <Info label="Email" value={user.email || '—'} />
              <Info label="Accesso con" value={(user.providers?.length ? user.providers : ['email' as const]).map((p) => PROVIDER_LABEL[p]).join(', ')} />
              <Info label="Profilo" value={RUOLO_LABEL[user.role ?? 'public']} />
            </Section>

            <Section title="Categoria giovanile di interesse">
              <Txt size={13} color="muted" style={{ lineHeight: 18 }}>
                Per i genitori: scegli la squadra di tua figlia. Il profilo “Genitore” lo attiva la società.
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, opacity: busy === 'categoria' ? 0.5 : 1 }}>
                {[{ id: null as string | null, name: 'Nessuna' }, ...youth.map((y) => ({ id: y.id as string | null, name: y.name }))].map((y) => {
                  const on = (user.youthCategoryId ?? null) === y.id;
                  return (
                    <Pressable key={y.id ?? 'nessuna'} disabled={busy !== null || on} accessibilityRole="radio" accessibilityState={{ selected: on }}
                      onPress={() => run('categoria', () => setYouthCategory(y.id), y.id ? `Categoria: ${y.name}.` : 'Nessuna categoria selezionata.')}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: on ? palette.gold : c.line, backgroundColor: on ? palette.gold : c.fill }}>
                      <Txt w={600} size={13} color={on ? palette.onGold : 'text'}>{y.name}</Txt>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Section title="Privacy">
              <Row label="Informativa privacy" sub={`Versione ${PRIVACY_POLICY_VERSION}`} onPress={apriInformativa} icon={<ExternalLink size={16} color={c.muted} />} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
                <View style={{ flex: 1 }}>
                  <Txt w={600} size={14}>Comunicazioni promozionali</Txt>
                  <Txt size={12} color="muted">Della società e dei suoi sponsor. Puoi cambiare idea quando vuoi.</Txt>
                </View>
                <Switch value={marketing} disabled={busy !== null}
                  onValueChange={(v) => run('marketing', () => setMarketing(v), v ? 'Consenso marketing attivato.' : 'Consenso marketing revocato.')}
                  trackColor={{ true: palette.gold, false: c.fill2 }} thumbColor="#fff" />
              </View>
              <Txt w={700} size={11.5} color="muted" style={{ marginTop: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>Consensi registrati</Txt>
              {CONSENSI.map(({ tipo, label, si, no }) => {
                const r = consents[tipo];
                return (
                  <View key={tipo} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                      <Txt w={600} size={14}>{label}</Txt>
                      <Txt w={700} size={13} color={r?.concesso ? 'ok' : 'muted'}>{r ? (r.concesso ? si : no) : '—'}</Txt>
                    </View>
                    {r ? (
                      <Txt size={12} color="muted">
                        {newsDate(r.data)} · versione {r.versione}{r.provider ? ` · accesso con ${PROVIDER_LABEL[r.provider]}` : ''}
                      </Txt>
                    ) : null}
                  </View>
                );
              })}
            </Section>

            <Card padded={false} style={{ overflow: 'hidden' }}>
              <Pressable onPress={() => router.push('/elimina-account')} accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 16 }}>
                <Trash2 size={18} color={c.danger} />
                <View style={{ flex: 1 }}>
                  <Txt w={700} size={15} color="danger">Elimina account</Txt>
                  <Txt size={12} color="muted">Cancella definitivamente account e dati collegati</Txt>
                </View>
                <ChevronRight size={18} color={c.muted} />
              </Pressable>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ gap: 6 }}>
      <Txt w={700} size={11.5} color="muted" style={{ letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>{title}</Txt>
      {children}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: c.line }}>
      <Txt size={14} color="muted">{label}</Txt>
      <Txt w={600} size={14} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Txt>
    </View>
  );
}

function Row({ label, sub, onPress, icon }: { label: string; sub?: string; onPress: () => void; icon: ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <Txt w={600} size={14}>{label}</Txt>
        {sub ? <Txt size={12} color="muted">{sub}</Txt> : null}
      </View>
      {icon}
    </Pressable>
  );
}
