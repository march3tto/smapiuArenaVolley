-- Punteggio automatico ovunque: il punteggio delle nostre partite (casa e trasferta) lo scrive l'agente a3live
-- su set_partita; il + dell'admin aggiunge solo righe di cronaca, senza punti né azioni (azioni_punto).
-- La riga di cronaca non cambia più il punteggio: la squadra a cui si riferisce va salvata, non dedotta.
alter table public.eventi_live
  add column if not exists squadra text check (squadra in ('nostra', 'avversaria'));

comment on column public.eventi_live.squadra is 'Squadra a cui si riferisce la riga di cronaca (null nelle righe vecchie: si deduce dal punteggio)';

-- Voto MVP con finestra temporale: si apre dal 3° set (almeno due set conclusi) e resta aperto a partita finita
create or replace function public.voto_mvp_valido(p_partita uuid, p_giocatrice uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.formazioni_partita f
    join public.partite p on p.id = f.partita_id
    where f.partita_id = p_partita and f.giocatrice_id = p_giocatrice
      and (p.stato = 'conclusa'
        or (p.stato = 'live'
          and (select count(*) from public.set_partita s where s.partita_id = p.id and s.completato) >= 2))
  );
$$;
