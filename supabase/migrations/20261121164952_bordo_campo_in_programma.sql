-- BORDO CAMPO: anche le gare della giornata non ancora iniziate.
--
-- Finora la striscia mostrava solo le gare con almeno un punteggio letto dall'agente: con la finestra aperta
-- ma prima del fischio d'inizio restava vuota. Ora ogni gara elencata in finestra_aperta.dettagli.gare
-- senza ancora un tabellone compare come "Casa - Ospite · inizia alle 18:00" (squadre e orario da partite);
-- passato l'orario senza punteggi, "inizio previsto alle 18:00". Al primo punteggio scritto dall'agente
-- la riga in programma lascia il posto al punteggio (stessa gara, stesse colonne).
-- Ordine: la nostra, poi le gare in corso, poi quelle in programma (la prima a iniziare per prima), poi le concluse.
-- Le colonne restituite non cambiano: basta "create or replace".

create or replace function public.bordo_campo()
returns table (
  numero_gara integer,
  partita_id uuid,
  casa text,
  ospite text,
  nostra boolean,
  stato text,
  set_casa integer,
  set_ospite integer,
  parziali jsonb,
  testo text,
  aggiornato_il timestamptz,
  giornata integer,
  girone text
)
language sql
stable
security definer
set search_path = public
as $$
  with ultimo as (
    select distinct on (l.agente) l.agente, l.evento, l.dettagli
      from public.log_agente l
     where l.evento in ('avvio', 'finestra_aperta', 'finestra_chiusa', 'stop')
       and l.creato_il > now() - interval '12 hours'
     order by l.agente, l.creato_il desc, l.id desc
  ),
  gare as (
    select distinct (g.value)::int as numero_gara
      from ultimo u
      cross join lateral jsonb_array_elements_text(coalesce(u.dettagli->'gare', '[]'::jsonb)) g
     where u.evento = 'finestra_aperta'
       and exists (select 1 from public.log_agente b
                    where b.agente = u.agente and b.creato_il > now() - interval '15 minutes')
  ),
  -- ultimo punteggio letto dall'agente per ogni gara della finestra
  punteggi as (
    select distinct on (l.numero_gara)
      l.numero_gara                                              as g_numero,
      l.partita_id                                               as g_partita,
      l.dettagli->'tabellone'->>'casa'                           as g_casa,
      l.dettagli->'tabellone'->>'ospite'                         as g_ospite,
      coalesce((l.dettagli->'tabellone'->>'nostra')::boolean, false) as g_nostra,
      l.dettagli->'tabellone'->>'stato'                          as g_stato,
      coalesce((l.dettagli->'tabellone'->>'set_casa')::int, 0)   as g_set_casa,
      coalesce((l.dettagli->'tabellone'->>'set_ospite')::int, 0) as g_set_ospite,
      coalesce(l.dettagli->'tabellone'->'parziali', '[]'::jsonb) as g_parziali,
      public.tabellone_testo(l.dettagli->'tabellone')            as g_testo,
      l.creato_il                                                as g_quando,
      p.giornata                                                 as g_giornata,
      p.girone::text                                             as g_girone
    from public.log_agente l
    join gare g on g.numero_gara = l.numero_gara
    left join public.partite p on p.id = l.partita_id
    where l.evento in ('aggiornamento', 'correzione')
      and l.dettagli ? 'tabellone'
      and l.creato_il > now() - interval '12 hours'
    order by l.numero_gara, l.creato_il desc, l.id desc
  ),
  -- gare della finestra senza ancora un punteggio: la partita in calendario più vicina a oggi con quel numero
  in_programma as (
    select g.numero_gara as g_numero, p.*
      from gare g
      cross join lateral (
        select p.id, p.data_partita, p.giornata, p.girone::text as girone, p.nostra_partita,
               case when p.nostra_partita
                    then case when p.casa_trasferta = 'casa' then n.nome else p.avversario end
                    else sc.nome end as nome_casa,
               case when p.nostra_partita
                    then case when p.casa_trasferta = 'casa' then p.avversario else n.nome end
                    else so.nome end as nome_ospite
          from public.partite p
          left join public.squadre sc on sc.id = p.squadra_casa_id
          left join public.squadre so on so.id = p.squadra_ospite_id
          left join lateral (select s.nome from public.squadre s where s.nostra_squadra order by s.creato_il limit 1) n on true
         where p.numero_gara = g.numero_gara
           and p.data_partita between now() - interval '1 day' and now() + interval '1 day'
         order by abs(extract(epoch from p.data_partita - now()))
         limit 1
      ) p
     where not exists (select 1 from punteggi s where s.g_numero = g.numero_gara)
  )
  select * from (
    select * from punteggi
    union all
    select
      i.g_numero,
      i.id,
      i.nome_casa,
      i.nome_ospite,
      i.nostra_partita,
      'programmata',
      0,
      0,
      '[]'::jsonb,
      format('%s - %s · %s alle %s', i.nome_casa, i.nome_ospite,
             case when now() < i.data_partita then 'inizia' else 'inizio previsto' end,
             to_char(i.data_partita at time zone 'Europe/Rome', 'HH24:MI')),
      i.data_partita,
      i.giornata,
      i.girone
    from in_programma i
  ) t
  order by t.g_nostra desc,
           case t.g_stato when 'conclusa' then 2 when 'programmata' then 1 else 0 end,
           -- in programma: prima quella che inizia prima; le altre: le più recenti prima
           case when t.g_stato = 'programmata' then t.g_quando end asc,
           t.g_quando desc
$$;

revoke all on function public.bordo_campo() from public;
grant execute on function public.bordo_campo() to anon, authenticated;
