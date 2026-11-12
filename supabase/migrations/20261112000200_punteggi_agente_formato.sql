-- Nuovo formato del punteggio: "Zero5 Castellana Grotte 4-1 V&V Modena · 2° set (1-0)"
-- (punti del set in corso, tra parentesi i set vinti) e senza "[gara N]" nei messaggi del log.
create or replace function public.tabellone_testo(t jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when t->>'stato' = 'conclusa' then
      format('%s %s-%s %s · finale (%s)', t->>'casa', t->>'set_casa', t->>'set_ospite', t->>'ospite',
             (select string_agg(format('%s-%s', x->>'casa', x->>'ospite'), ' ' order by (x->>'set')::int)
                from jsonb_array_elements(coalesce(t->'parziali', '[]')) x))
    when jsonb_array_length(coalesce(t->'parziali', '[]')) = 0 then
      format('%s - %s · in corso', t->>'casa', t->>'ospite')
    else (
      select format('%s %s-%s %s · %s° set (%s-%s)', t->>'casa', u->>'casa', u->>'ospite', t->>'ospite',
                    u->>'set', t->>'set_casa', t->>'set_ospite')
        from jsonb_array_elements(t->'parziali') u
       order by (u->>'set')::int desc limit 1)
  end
$$;

update public.log_agente
   set messaggio = public.tabellone_testo(dettagli->'tabellone')
 where evento in ('aggiornamento', 'correzione')
   and dettagli ? 'tabellone';
