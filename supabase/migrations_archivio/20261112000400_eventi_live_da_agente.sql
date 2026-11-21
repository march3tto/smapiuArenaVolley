-- Eventi punto per punto scritti dall'agente livescore per le nostre partite:
-- alimentano il grafico "Andamento" e le statistiche della Live. fonte = 'agente' li distingue
-- da quelli inseriti a mano dall'admin (fonte null).
alter table public.eventi_live add column if not exists fonte text;
comment on column public.eventi_live.fonte is 'agente = punto scritto dall''agente livescore; null = inserito dall''app';

-- Ricostruzione dai log per le nostre gare già seguite dall'agente (es. gara 6116 dell'8/11).
-- Il feed si legge ogni 30 s: i punti saltati tra due letture si alternano in proporzione
-- (stessa regola di punti_intermedi() nell'agente), con orari distribuiti tra le due letture.
do $$
declare
  r record;
  prev jsonb := '{}';          -- {"partita_id": {"set": [noi, loro]}}
  prev_t jsonb := '{}';        -- {"partita_id": ultima lettura}
  x jsonb; k text; n0 int; l0 int; n1 int; l1 int; dn int; dl int; fn int; fl int; tot int; i int;
  t0 timestamptz; noi_nome text; loro_nome text; in_casa boolean; chi text;
begin
  for r in
    select l.partita_id, l.creato_il, l.dettagli->'tabellone' as tab, p.casa_trasferta::text as ct
      from public.log_agente l
      join public.partite p on p.id = l.partita_id
     where l.evento in ('aggiornamento', 'correzione')
       and l.agente <> 'replay'
       and (l.dettagli->'tabellone'->>'nostra')::boolean
       and not exists (select 1 from public.eventi_live e where e.partita_id = l.partita_id and e.fonte = 'agente')
     order by l.creato_il, l.id
  loop
    k := r.partita_id::text;
    in_casa := r.ct = 'casa';
    noi_nome  := case when in_casa then r.tab->>'casa' else r.tab->>'ospite' end;
    loro_nome := case when in_casa then r.tab->>'ospite' else r.tab->>'casa' end;
    t0 := coalesce((prev_t->>k)::timestamptz, r.creato_il - interval '30 seconds');

    for x in select * from jsonb_array_elements(coalesce(r.tab->'parziali', '[]')) loop
      n1 := case when in_casa then (x->>'casa')::int else (x->>'ospite')::int end;
      l1 := case when in_casa then (x->>'ospite')::int else (x->>'casa')::int end;
      n0 := coalesce((prev->k->(x->>'set')->>0)::int, 0);
      l0 := coalesce((prev->k->(x->>'set')->>1)::int, 0);
      dn := n1 - n0; dl := l1 - l0;
      if dn >= 0 and dl >= 0 and dn + dl > 0 then
        tot := dn + dl; fn := 0; fl := 0; i := 0;
        while fn < dn or fl < dl loop
          i := i + 1;
          if fl >= dl or (fn < dn and fn * dl <= fl * dn) then
            fn := fn + 1; chi := 'nostra';
          else
            fl := fl + 1; chi := 'avversaria';
          end if;
          insert into public.eventi_live (partita_id, numero_set, punteggio_nostro, punteggio_avversario,
                                          descrizione, squadra, fonte, creato_il)
          values (r.partita_id, (x->>'set')::int, n0 + fn, l0 + fl,
                  format('Punto %s (%s-%s)', case when chi = 'nostra' then noi_nome else loro_nome end, n0 + fn, l0 + fl),
                  chi, 'agente', t0 + (r.creato_il - t0) * i / tot);
        end loop;
      end if;
      prev := jsonb_set(prev, array[k], coalesce(prev->k, '{}') || jsonb_build_object(x->>'set', jsonb_build_array(n1, l1)));
    end loop;
    prev_t := prev_t || jsonb_build_object(k, r.creato_il);
  end loop;
end $$;
