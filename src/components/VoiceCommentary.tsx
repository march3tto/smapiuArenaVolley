export interface VoiceCommentaryProps {
  /** Testo della bozza confermato dall'admin: diventa una riga di cronaca */
  onPublish: (text: string) => void;
  /** Nomi di squadre e giocatrici, per trascriverli giusti */
  context: string;
  /** Pubblicazione sospesa (es. durante un timeout): la bozza resta */
  disabled?: boolean;
}

/** Nell'app nativa l'audio del video (WebView YouTube) non si può catturare: la cronaca dal video è solo nel browser da computer */
export function VoiceCommentary(_: VoiceCommentaryProps) {
  return null;
}
