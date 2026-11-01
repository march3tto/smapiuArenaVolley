-- Nuove azioni del punto: parallela, mani fuori, fast (solo la centrale, controllato nell'app) e battuta out.
-- Da eseguire in Supabase > SQL Editor.

begin;

alter table public.azioni_punto drop constraint if exists azioni_punto_azione_check;
alter table public.azioni_punto add constraint azioni_punto_azione_check check (azione in (
  'schiacciata', 'parallela', 'mani_fuori', 'pipe', 'primo_tempo', 'fast', 'pallonetto',
  'ace', 'muro', 'battuta_out', 'errore_avversario'
));

-- la battuta out è in fase di difesa: non conta tra gli attacchi della vista punti_giocatrici_partita
commit;
