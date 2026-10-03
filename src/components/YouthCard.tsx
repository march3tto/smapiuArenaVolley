import type { ReactNode } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { Txt } from './Txt';
import { shortDateTime } from '@/lib/format';
import { brandGradient, palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { YouthTeam } from '@/types';

export function YouthCard({ team: y, following, onToggle }: { team: YouthTeam; following: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const won = y.last ? y.last.our > y.last.opp : false;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <LinearGradient colors={brandGradient} style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Txt w={800} size={17} color={palette.goldHi}>{y.short}</Txt>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Txt w={800} size={19} style={{ letterSpacing: -0.4 }}>{y.name}</Txt>
          <Txt size={13} color="muted">Coach: {y.coach}</Txt>
        </View>
        <IconButton label={following ? `Non seguire più ${y.name}` : `Ricevi notifiche ${y.name}`} onPress={onToggle} active={following}>
          <Bell size={18} color={following ? palette.onGold : c.text} />
        </IconButton>
      </View>
      {y.description ? <Txt size={14} color="muted" style={{ marginTop: 12, marginBottom: 4 }}>{y.description}</Txt> : <View style={{ height: 10 }} />}
      <Row label="Prossima">
        {y.next ? (
          <>
            <Txt w={600} size={14}>{y.next.opponent}</Txt>
            <Txt size={12.5} color="muted">{shortDateTime(y.next.date)}, {y.next.home ? 'in casa' : 'in trasferta'}</Txt>
          </>
        ) : <Txt size={14} color="muted">Da definire</Txt>}
      </Row>
      <Row label="Ultima">
        {y.last ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Txt w={600} size={14}>{y.last.our}–{y.last.opp} contro {y.last.opponent}</Txt>
            <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: won ? 'rgba(61,220,151,0.18)' : 'rgba(255,122,136,0.18)' }}>
              <Txt w={800} size={11} color={won ? 'ok' : 'danger'}>{won ? 'V' : 'P'}</Txt>
            </View>
          </View>
        ) : <Txt w={600} size={14}>Stagione appena iniziata</Txt>}
      </Row>
      {y.training ? (
        <Row label="Allenamenti">
          <Txt w={600} size={14}>{y.training}</Txt>
          {y.gym ? <Txt size={12.5} color="muted">{y.gym}</Txt> : null}
        </Row>
      ) : null}
    </Card>
  );

  function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
      <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: c.line }}>
        <Txt size={13} color="muted" style={{ width: 92 }}>{label}</Txt>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }
}
