import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AudioLines, Send, Square, X } from 'lucide-react-native';
import { Button } from './Button';
import { Txt } from './Txt';
import { transcribeAudio } from '@/lib/api';
import { palette, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import type { VoiceCommentaryProps } from './VoiceCommentary';

/** Durata di ogni pezzo d'audio mandato a trascrivere */
const CHUNK_MS = 10000;
/** Sotto questa dimensione il pezzo è (quasi) silenzio: non si manda */
const MIN_BYTES = 3000;

/** Frase trascritta → testo della bozza: spazi puliti, maiuscola iniziale e punto finale */
function tidy(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(s) ? s : `${s}.`;
}

const canCapture = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== 'undefined';

/**
 * Cronaca dal video (admin, browser da computer): si condivide la scheda con la diretta e il suo audio,
 * a pezzi di 10 secondi, viene trascritto con Whisper e corretto dall'AI. Il testo finisce in una bozza che si pubblica con un tocco (o si scarta).
 */
export function VoiceCommentary({ onPublish, context, disabled }: VoiceCommentaryProps) {
  const { c } = useTheme();
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(0);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // trascrizioni una alla volta: il testo arriva nell'ordine in cui è stato detto
  const queue = useRef<Promise<void>>(Promise.resolve());
  // ultimo testo trascritto (anche se la bozza è già stata pubblicata): l'AI ricuce le parole tagliate tra due pezzi
  const lastText = useRef('');
  const ctx = useRef(context);
  useEffect(() => {
    ctx.current = context;
  }, [context]);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setListening(false);
  };

  // uscendo dal pannello la condivisione si chiude
  useEffect(() => stop, []);

  const send = (blob: Blob, type: string) => {
    if (blob.size < MIN_BYTES) return;
    const name = type.includes('mp4') ? 'audio.mp4' : type.includes('ogg') ? 'audio.ogg' : 'audio.webm';
    setBusy((n) => n + 1);
    queue.current = queue.current
      .then(async () => {
        const line = tidy(await transcribeAudio(blob, name, ctx.current, lastText.current.slice(-200)));
        if (line) lastText.current = line;
        if (line) setDraft((d) => (d ? `${d} ${line}` : line));
      })
      .catch((err: unknown) => {
        console.warn('Trascrizione non riuscita', err);
        setError('Un pezzo di audio non è stato trascritto: controlla la connessione.');
      })
      .finally(() => setBusy((n) => n - 1));
  };

  /** Registra un pezzo: ogni registratore produce un file completo, che Whisper legge da solo */
  const record = (audio: MediaStream) => {
    const rec = new MediaRecorder(audio);
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    rec.onstop = () => send(new Blob(parts, { type: rec.mimeType }), rec.mimeType);
    rec.start();
    return rec;
  };

  const start = async () => {
    setError(null);
    if (!canCapture()) {
      setError('Serve Chrome o Edge da computer: questo browser non condivide l\'audio delle schede.');
      return;
    }
    let shared: MediaStream;
    try {
      // il video è obbligatorio nella richiesta, ma serve solo l'audio della scheda
      shared = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false } as MediaTrackConstraints,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
      } as DisplayMediaStreamOptions);
    } catch {
      // finestra di scelta chiusa senza condividere
      return;
    }
    shared.getVideoTracks().forEach((t) => t.stop());
    const tracks = shared.getAudioTracks();
    if (!tracks.length) {
      setError('Nessun audio: scegli la scheda con la diretta e attiva «Condividi anche l\'audio della scheda».');
      return;
    }
    const audio = new MediaStream(tracks);
    stream.current = audio;
    // la condivisione chiusa dalla barra del browser ferma anche l'ascolto
    tracks[0].onended = stop;
    let rec = record(audio);
    timer.current = setInterval(() => {
      rec.stop();
      rec = record(audio);
    }, CHUNK_MS);
    setListening(true);
  };

  const publish = () => {
    const text = tidy(draft);
    if (text) onPublish(text);
    setDraft('');
  };

  return (
    <View style={{ alignItems: 'center', gap: space.sm }}>
      <Button size="sm" variant={listening ? 'gold' : 'ghost'} label={listening ? 'In ascolto del video…' : 'Cronaca dal video'}
        icon={listening ? <Square size={14} color={palette.onGold} fill={palette.onGold} /> : <AudioLines size={16} color={c.text} />}
        accessibilityLabel={listening ? 'Ferma l\'ascolto del video' : 'Ascolta il video e scrivi la cronaca'}
        onPress={listening ? () => stop() : start} />
      {!listening && !draft ? (
        <Txt size={12} color="muted" center>{'Scegli la scheda con la diretta e attiva «Condividi anche l\'audio della scheda».'}</Txt>
      ) : null}
      {listening && !draft ? <Txt size={12} color="muted" center>{busy ? 'Trascrivo…' : 'Ascolto il video: il testo arriva ogni 10 secondi circa.'}</Txt> : null}
      {error ? <Txt size={12} color="live" center>{error}</Txt> : null}
      {draft ? (
        <View style={{ alignSelf: 'stretch', gap: space.sm, padding: space.md, borderRadius: 12, backgroundColor: c.fill }}>
          <Txt size={14}>{draft}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.sm }}>
            {busy ? <Txt size={12} color="muted" style={{ flex: 1 }}>Trascrivo…</Txt> : null}
            <Button size="sm" label="Scarta" icon={<X size={14} color={c.text} />} onPress={() => setDraft('')} />
            <Button size="sm" variant="gold" label="Pubblica" disabled={disabled} icon={<Send size={14} color={palette.onGold} />} onPress={publish} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
