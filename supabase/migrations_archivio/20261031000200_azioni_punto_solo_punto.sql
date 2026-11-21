-- "Solo punto" con la giocatrice scelta: azione generica 'punto', conta tra i punti della giocatrice
-- (trigger applica_azione_giocatrice) ma non tra attacchi, ace o muri.
-- Da eseguire in Supabase > SQL Editor.

begin;

alter table public.azioni_punto drop constraint if exists azioni_punto_azione_check;
alter table public.azioni_punto add constraint azioni_punto_azione_check check (azione in (
  'schiacciata', 'parallela', 'mani_fuori', 'pipe', 'primo_tempo', 'fast', 'pallonetto',
  'ace', 'muro', 'battuta_out', 'errore_avversario', 'punto'
));

-- attacchi: solo i fondamentali d'attacco (prima contava ogni azione in fase di attacco tranne l'ace)
create or replace view public.punti_giocatrici_partita with (security_invoker = true) as
select
  partita_id,
  giocatrice_id,
  max(nome_giocatrice) as nome_giocatrice,
  count(*) as punti,
  count(*) filter (where azione = 'ace') as ace,
  count(*) filter (where azione = 'muro') as muri,
  count(*) filter (where azione in ('schiacciata', 'parallela', 'mani_fuori', 'pipe', 'primo_tempo', 'fast', 'pallonetto')) as attacchi
from public.azioni_punto
where squadra = 'nostra' and giocatrice_id is not null
group by partita_id, giocatrice_id;

commit;
