-- Punteggi dell'agente livescore con i nomi delle squadre, per la striscia ULTIME NOTIZIE della home.
-- L'agente scrive in log_agente.dettagli.tabellone:
--   {numero_gara, casa, ospite, nostra, stato, set_casa, set_ospite, parziali:[{set,casa,ospite}]}
-- log_agente resta leggibile solo da staff/admin: al pubblico arriva solo il punteggio,
-- tramite la funzione punteggi_agente().

-- Testo leggibile (stesso formato di testo_punteggio() nell'agente)
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
      select format('%s %s-%s %s · %s° set · set %s-%s', t->>'casa', u->>'casa', u->>'ospite', t->>'ospite',
                    u->>'set', t->>'set_casa', t->>'set_ospite')
        from jsonb_array_elements(t->'parziali') u
       order by (u->>'set')::int desc limit 1)
  end
$$;

-- Ultimo punteggio di ogni gara scritto dall'agente nelle ultime p_ore ore (live e finali)
create or replace function public.punteggi_agente(p_ore integer default 6)
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
      and l.creato_il > now() - make_interval(hours => least(greatest(coalesce(p_ore, 6), 1), 48))
    order by l.numero_gara, l.creato_il desc, l.id desc
  ) t
  -- prima la nostra, poi le gare in corso, poi le più recenti
  order by t.g_nostra desc, (t.g_stato = 'conclusa'), t.g_quando desc
$$;

revoke all on function public.punteggi_agente(integer) from public;
grant execute on function public.punteggi_agente(integer) to anon, authenticated;

create index if not exists log_agente_punteggi_idx on public.log_agente (numero_gara, creato_il desc)
  where evento in ('aggiornamento', 'correzione');

-- Conversione dei log già scritti (formato vecchio senza nomi): aggiunge dettagli.tabellone
-- e riscrive il messaggio con i nomi delle squadre. Per le nostre gare il vecchio log
-- conteneva solo i set cambiati: lo stato completo si ricostruisce riga per riga.
do $$
declare
  r record;
  stato_set jsonb := '{}';   -- {"numero_gara": {"1": {"casa":..,"ospite":..}, ...}}
  g text; s jsonb; pz jsonb; tab jsonb; sc int; so int; casa_n text; osp_n text; in_casa boolean;
begin
  for r in
    select l.id, l.numero_gara, l.dettagli, p.nostra_partita, p.casa_trasferta, p.avversario,
           sq_c.nome as nome_casa, sq_o.nome as nome_ospite
      from public.log_agente l
      join public.partite p on p.id = l.partita_id
      left join public.squadre sq_c on sq_c.id = p.squadra_casa_id
      left join public.squadre sq_o on sq_o.id = p.squadra_ospite_id
     where l.evento in ('aggiornamento', 'correzione')
       and l.dettagli is not null
       and not (l.dettagli ? 'tabellone')
     order by l.id
  loop
    g := r.numero_gara::text;
    in_casa := r.casa_trasferta = 'casa';
    casa_n := coalesce(r.nome_casa, case when r.nostra_partita and in_casa then 'Smapiù Arena Volley Team' else r.avversario end, 'Casa');
    osp_n  := coalesce(r.nome_ospite, case when r.nostra_partita and not in_casa then 'Smapiù Arena Volley Team' else r.avversario end, 'Ospite');

    if r.nostra_partita then
      if not (r.dettagli ? 'set') or jsonb_typeof(r.dettagli->'set') <> 'array' then
        continue;   -- riga "live" senza punteggio
      end if;
      s := coalesce(stato_set->g, '{}');
      for pz in select * from jsonb_array_elements(r.dettagli->'set') loop
        s := s || jsonb_build_object(pz->>'numero_set', jsonb_build_object(
               'casa',   case when in_casa then pz->'punti_nostri' else pz->'punti_avversario' end,
               'ospite', case when in_casa then pz->'punti_avversario' else pz->'punti_nostri' end,
               'fatto',  coalesce(pz->'completato', 'false')));
      end loop;
      stato_set := stato_set || jsonb_build_object(g, s);
      select coalesce(jsonb_agg(jsonb_build_object('set', k::int, 'casa', v->'casa', 'ospite', v->'ospite') order by k::int), '[]'),
             count(*) filter (where (v->>'fatto')::boolean and (v->>'casa')::int > (v->>'ospite')::int),
             count(*) filter (where (v->>'fatto')::boolean and (v->>'ospite')::int > (v->>'casa')::int)
        into pz, sc, so
        from jsonb_each(s) as e(k, v);
      tab := jsonb_build_object('numero_gara', r.numero_gara, 'casa', casa_n, 'ospite', osp_n, 'nostra', true,
               'stato', case when greatest(sc, so) = 3 then 'conclusa' else 'live' end,
               'set_casa', sc, 'set_ospite', so, 'parziali', pz);
    else
      tab := jsonb_build_object('numero_gara', r.numero_gara, 'casa', casa_n, 'ospite', osp_n, 'nostra', false,
               'stato', coalesce(r.dettagli->>'stato', 'live'),
               'set_casa', coalesce((r.dettagli->'set'->>0)::int, 0),
               'set_ospite', coalesce((r.dettagli->'set'->>1)::int, 0),
               'parziali', coalesce(r.dettagli->'parziali', '[]'));
    end if;

    update public.log_agente
       set dettagli = dettagli || jsonb_build_object('tabellone', tab, 'messaggio_originale', messaggio),
           messaggio = format('%s [gara %s%s]', public.tabellone_testo(tab), r.numero_gara,
                              case when r.nostra_partita then ', nostra in ' || coalesce(r.casa_trasferta::text, '?') else '' end)
     where id = r.id;
  end loop;
end $$;
