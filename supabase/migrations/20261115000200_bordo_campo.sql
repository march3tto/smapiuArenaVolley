-- Striscia BORDO CAMPO della home (prima ULTIME NOTIZIE dentro la diretta): i punteggi di tutte le gare
-- della giornata di campionato in corso, finché l'agente livescore la sta seguendo.
--
-- "Giornata in corso" = per almeno un agente l'ultimo evento tra avvio/finestra_aperta/finestra_chiusa/stop
-- delle ultime 12 ore è finestra_aperta, e l'agente ha scritto qualcosa negli ultimi 15 minuti
-- (in finestra scrive un battito ogni 5': un agente spento senza "stop" non tiene la striscia accesa).
-- Le gare sono quelle elencate in finestra_aperta.dettagli.gare; per ognuna l'ultimo punteggio letto
-- (live o finale), anche se scritto prima di un riavvio dell'agente.
-- log_agente resta leggibile solo da staff/admin: al pubblico arrivano solo i punteggi.

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
  aggiornato_il timestamptz
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
  )
  select * from (
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
      l.creato_il                                                as g_quando
    from public.log_agente l
    join gare g on g.numero_gara = l.numero_gara
    where l.evento in ('aggiornamento', 'correzione')
      and l.dettagli ? 'tabellone'
      and l.creato_il > now() - interval '12 hours'
    order by l.numero_gara, l.creato_il desc, l.id desc
  ) t
  -- prima la nostra, poi le gare in corso, poi le concluse (le più recenti prima)
  order by t.g_nostra desc, (t.g_stato = 'conclusa'), t.g_quando desc
$$;

revoke all on function public.bordo_campo() from public;
grant execute on function public.bordo_campo() to anon, authenticated;

-- ricerca rapida dell'ultimo evento di finestra per agente
create index if not exists log_agente_finestra_idx on public.log_agente (agente, creato_il desc)
  where evento in ('avvio', 'finestra_aperta', 'finestra_chiusa', 'stop');
