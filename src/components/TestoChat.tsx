import { Fragment } from 'react';
import { View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Txt } from '@/components/Txt';
import { space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

const URL_RE = /(https?:\/\/[^\s)]+[^\s).,;:!?'"»])/g;
const ELENCO_RE = /^\s*(?:[-*•]|\d+[.)])\s+/;
const FONTE_RE = /^\s*\**\s*(font[ei])\s*:\s*\**\s*/i;

const apri = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => undefined);

/** Testo con **grassetto** e URL cliccabili */
function Inline({ testo, size, color }: { testo: string; size: number; color: string }) {
  const { c } = useTheme();
  // i pezzi dispari sono quelli tra ** **
  return testo.split(/\*\*(.+?)\*\*/g).map((pezzo, i) => (
    <Fragment key={i}>
      {pezzo.split(URL_RE).map((p, j) =>
        j % 2 === 1 ? (
          <Txt key={j} size={size} w={600} color={c.cobalt} style={{ textDecorationLine: 'underline' }} onPress={() => apri(p)} accessibilityRole="link">
            {p.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
          </Txt>
        ) : (
          <Txt key={j} size={size} w={i % 2 === 1 ? 700 : 400} color={color}>{p.replace(/\*\*/g, '')}</Txt>
        ),
      )}
    </Fragment>
  ));
}

/**
 * Risposta dell'assistente con il poco markdown che il modello usa: paragrafi, elenchi puntati o numerati,
 * **grassetto**, link e la riga finale "Fonte: <url>" in piccolo.
 */
export function TestoChat({ testo, size = 15, color }: { testo: string; size?: number; color: string }) {
  const { c } = useTheme();
  const righe = testo.replace(/\r/g, '').split('\n');
  const blocchi: React.ReactNode[] = [];
  righe.forEach((riga, i) => {
    if (!riga.trim()) return;
    if (FONTE_RE.test(riga)) {
      blocchi.push(
        <Txt key={i} size={12.5} color="muted" style={{ marginTop: space.xs }}>
          {'Fonte: '}<Inline testo={riga.replace(FONTE_RE, '')} size={12.5} color={c.muted} />
        </Txt>,
      );
      return;
    }
    const elenco = riga.match(ELENCO_RE);
    if (elenco) {
      const numero = elenco[0].trim().match(/^\d+/)?.[0];
      blocchi.push(
        <View key={i} style={{ flexDirection: 'row', gap: space.sm, paddingLeft: 2 }}>
          <Txt size={size} color={numero ? color : c.muted} tnum style={{ minWidth: numero ? 18 : 8 }}>{numero ? `${numero}.` : '•'}</Txt>
          <Txt size={size} color={color} style={{ flex: 1, lineHeight: Math.round(size * 1.4) }} selectable>
            <Inline testo={riga.replace(ELENCO_RE, '')} size={size} color={color} />
          </Txt>
        </View>,
      );
      return;
    }
    blocchi.push(
      <Txt key={i} size={size} color={color} style={{ lineHeight: Math.round(size * 1.4) }} selectable>
        <Inline testo={riga.trim()} size={size} color={color} />
      </Txt>,
    );
  });
  return <View style={{ gap: 6 }}>{blocchi}</View>;
}
