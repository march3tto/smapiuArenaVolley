-- Validazione dei risultati delle gare di campionato (partite con campionato o girone) e gestione della rinuncia.
-- Le amichevoli non sono controllate. Gira dopo trg_partite_allinea_casa_ospite (i trigger BEFORE vanno in ordine alfabetico).

begin;

-- Set valido: vince chi arriva a 25 (15 nel 5° set) con 2 punti di scarto; ai vantaggi si chiude esattamente a +2
create or replace function public.set_valido(p_numero integer, p_casa integer, p_ospite integer)
returns boolean
language sql
immutable
as $$
  select p_casa >= 0 and p_ospite >= 0
     and greatest(p_casa, p_ospite) = greatest(case when p_numero = 5 then 15 else 25 end, least(p_casa, p_ospite) + 2);
$$;

create or replace function public.valida_risultato_partita()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_set record;
  v_n integer;
  v_vinti_casa integer := 0;
  v_vinti_ospite integer := 0;
  v_ultimo_casa boolean;
begin
  if new.campionato_id is null and new.girone is null then
    return new;
  end if;

  -- rinuncia: gara persa 0-3 con parziali 0-25, la penalizzazione la applica la classifica
  if new.rinuncia is not null then
    new.stato := 'conclusa';
    new.set_casa := case when new.rinuncia = 'casa' then 0 else 3 end;
    new.set_ospite := case when new.rinuncia = 'casa' then 3 else 0 end;
    new.parziali := (
      select jsonb_agg(jsonb_build_object('set', i,
        'casa', case when new.rinuncia = 'casa' then 0 else 25 end,
        'ospite', case when new.rinuncia = 'casa' then 25 else 0 end) order by i)
      from generate_series(1, 3) i
    );
    if new.nostra_partita and new.casa_trasferta is not null then
      new.nostri_set_vinti := case when new.casa_trasferta = 'casa' then new.set_casa else new.set_ospite end;
      new.set_vinti_avversario := case when new.casa_trasferta = 'casa' then new.set_ospite else new.set_casa end;
    end if;
    return new;
  end if;

  if new.stato <> 'conclusa' then
    return new;
  end if;

  if new.set_casa is null or new.set_ospite is null
     or greatest(new.set_casa, new.set_ospite) <> 3 or least(new.set_casa, new.set_ospite) > 2 then
    raise exception 'Risultato non valido: %-% (ammessi 3-0, 3-1, 3-2 e inversi)', new.set_casa, new.set_ospite
      using errcode = 'check_violation';
  end if;

  -- parziali facoltativi; se ci sono devono essere coerenti con il risultato
  if new.parziali is null or jsonb_array_length(new.parziali) = 0 then
    return new;
  end if;
  v_n := jsonb_array_length(new.parziali);
  if v_n <> new.set_casa + new.set_ospite then
    raise exception 'Parziali non coerenti: % set per un risultato %-%', v_n, new.set_casa, new.set_ospite
      using errcode = 'check_violation';
  end if;

  for v_set in
    select (e->>'set')::int as numero, (e->>'casa')::int as casa, (e->>'ospite')::int as ospite,
           row_number() over (order by (e->>'set')::int) as ordine
      from jsonb_array_elements(new.parziali) e
  loop
    if v_set.numero is distinct from v_set.ordine::int or v_set.casa is null or v_set.ospite is null
       or not set_valido(v_set.numero, v_set.casa, v_set.ospite) then
      raise exception 'Set % non valido: %-%', coalesce(v_set.numero, v_set.ordine::int), v_set.casa, v_set.ospite
        using errcode = 'check_violation';
    end if;
    if v_set.casa > v_set.ospite then v_vinti_casa := v_vinti_casa + 1; else v_vinti_ospite := v_vinti_ospite + 1; end if;
    v_ultimo_casa := v_set.casa > v_set.ospite;
  end loop;

  -- i set vinti devono tornare e l'ultimo set lo vince chi vince la partita
  if v_vinti_casa <> new.set_casa or v_vinti_ospite <> new.set_ospite or v_ultimo_casa <> (new.set_casa = 3) then
    raise exception 'Parziali non coerenti con il risultato %-%', new.set_casa, new.set_ospite
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

create trigger trg_partite_valida_risultato
  before insert or update on public.partite
  for each row execute function public.valida_risultato_partita();

commit;
