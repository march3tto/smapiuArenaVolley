-- Voto MVP aperto anche alle giocatrici avversarie: basta che siano a referto nella partita (formazioni_partita)
-- e collegate alla loro scheda in giocatrici (le avversarie inserite a mano, senza giocatrice_id, non si votano).
-- Resta un solo voto per utente e partita, tra le giocatrici di entrambe le squadre.
-- Da eseguire in Supabase > SQL Editor.

create or replace function public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.formazioni_partita f
    join public.partite p on p.id = f.partita_id
    where f.partita_id = p_partita and f.giocatrice_id = p_giocatrice
      and p.stato in ('live', 'conclusa')
  );
$$;
