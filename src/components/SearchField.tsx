import { Pressable, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { FONT, radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

/** Campo di ricerca a pillola con lente e tasto per cancellare (pannelli Formazioni e Vota MVP) */
export function SearchField({ value, onChange, placeholder, label, editable = true }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string; editable?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line }}>
      <Search size={16} color={c.muted} strokeWidth={2.25} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.muted} editable={editable}
        autoCorrect={false} returnKeyType="search" accessibilityLabel={label}
        style={{ flex: 1, fontFamily: FONT[500], fontSize: 14, color: c.text, paddingVertical: 0 }} />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancella la ricerca">
          <X size={16} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Ricerca di una giocatrice per nome (anche parziale) o numero di maglia esatto */
export const matchesPlayer = (p: { name: string; number: number | null }, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || p.name.toLowerCase().includes(q) || String(p.number ?? '') === q;
};
