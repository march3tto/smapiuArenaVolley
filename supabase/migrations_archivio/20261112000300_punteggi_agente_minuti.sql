-- La striscia ULTIME NOTIZIE mostra solo i punteggi recenti: finestra in minuti (default 5),
-- non più in ore. Ogni gara compare con il suo ultimo aggiornamento degli ultimi p_minuti.
drop function if exists public.punteggi_agente(integer);

create or replace function public.punteggi_agente(p_minuti integer default 5)
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
    where l.evento in ('aggiornamento', 'correzione')
      and l.dettagli ? 'tabellone'
      and l.numero_gara is not null
      and l.creato_il > now() - make_interval(mins => least(greatest(coalesce(p_minuti, 5), 1), 720))
    order by l.numero_gara, l.creato_il desc, l.id desc
  ) t
  order by t.g_nostra desc, (t.g_stato = 'conclusa'), t.g_quando desc
$$;

revoke all on function public.punteggi_agente(integer) from public;
grant execute on function public.punteggi_agente(integer) to anon, authenticated;
