-- Sestetto di partenza per set: zone I-VI e libero di ciascuna squadra, set per set.
-- formazioni_partita resta il referto della partita (giocatrici, numero, ruolo, capitana);
-- le sue colonne zona e libero si copiano qui nel set 1 e si eliminano in una migrazione successiva,
-- dopo la pubblicazione dell'app che legge i sestetti (la PWA già installata le usa ancora).
-- Insieme: la diretta (punti, set, azioni, formazioni) la scrive solo l'admin, non più lo staff.

begin;

create table if not exists public.sestetti_set (
  id uuid primary key default gen_random_uuid(),
  partita_id uuid not null references public.partite(id) on delete cascade,
  numero_set smallint not null check (numero_set between 1 and 5),
  squadra text not null check (squadra in ('nostra', 'avversaria')),
  -- posizione di partenza (1 = al servizio); null = libero del set
  zona smallint check (zona between 1 and 6),
  convocata_id uuid not null references public.formazioni_partita(id) on delete cascade,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

comment on table public.sestetti_set is
  'Sestetto di partenza per set e squadra: una riga per titolare (zona 1-6) o libero (zona null), dal referto in formazioni_partita.';

create index if not exists sestetti_set_partita_idx on public.sestetti_set (partita_id, numero_set);
-- una titolare per zona e una riga per giocatrice, per set e squadra
create unique index if not exists sestetti_set_zona_key on public.sestetti_set (partita_id, numero_set, squadra, zona) where zona is not null;
create unique index if not exists sestetti_set_convocata_key on public.sestetti_set (partita_id, numero_set, squadra, convocata_id);

-- Controlli che un vincolo non sa fare: giocatrice dello stesso referto, libero solo con ruolo Libero e mai in zona,
-- al massimo 2 liberi per set e squadra
create or replace function public.sestetti_set_controlla()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  c record;
begin
  select partita_id, squadra, ruolo into c from formazioni_partita where id = new.convocata_id;
  if c.partita_id is distinct from new.partita_id or c.squadra is distinct from new.squadra then
    raise exception 'La giocatrice non è a referto per questa partita e squadra' using errcode = '23514';
  end if;
  if new.zona is not null and c.ruolo = 'libero' then
    raise exception 'Il libero non può far parte del sestetto (zone I-VI)' using errcode = '23514';
  end if;
  if new.zona is null then
    if c.ruolo is distinct from 'libero' then
      raise exception 'Come libero si possono scegliere solo le giocatrici con ruolo Libero' using errcode = '23514';
    end if;
    if (select count(*) from sestetti_set s
        where s.partita_id = new.partita_id and s.numero_set = new.numero_set and s.squadra = new.squadra
          and s.zona is null and s.id <> new.id) >= 2 then
      raise exception 'Al massimo 2 liberi per set e squadra' using errcode = '23514';
    end if;
  end if;
  new.aggiornato_il := now();
  return new;
end;
$$;

drop trigger if exists sestetti_set_controlla on public.sestetti_set;
create trigger sestetti_set_controlla
  before insert or update on public.sestetti_set
  for each row execute function public.sestetti_set_controlla();

-- Salvataggio del sestetto di un set e di una squadra in un colpo solo (tutto o niente), come lo mostra l'app:
-- p_righe = [{"zona": 1..6 | null, "convocata_id": "..."}]. Gli scambi di zona non passano da stati intermedi
-- (una titolare senza zona sarebbe un libero). Con i permessi di chi chiama: scrive solo l'admin.
create or replace function public.salva_sestetto(p_partita uuid, p_set smallint, p_squadra text, p_righe jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from sestetti_set where partita_id = p_partita and numero_set = p_set and squadra = p_squadra;
  insert into sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
  select p_partita, p_set, p_squadra, (r->>'zona')::smallint, (r->>'convocata_id')::uuid
  from jsonb_array_elements(coalesce(p_righe, '[]'::jsonb)) r;
end;
$$;

revoke all on function public.salva_sestetto(uuid, smallint, text, jsonb) from public, anon;
grant execute on function public.salva_sestetto(uuid, smallint, text, jsonb) to authenticated;

alter table public.sestetti_set enable row level security;

drop policy if exists sestetti_set_lettura_pubblica on public.sestetti_set;
create policy sestetti_set_lettura_pubblica on public.sestetti_set
  for select using (true);

drop policy if exists sestetti_set_scrittura_admin on public.sestetti_set;
create policy sestetti_set_scrittura_admin on public.sestetti_set
  for all using (public.e_admin()) with check (public.e_admin());

-- Zone e libero già salvati nel referto diventano il sestetto del set 1
insert into public.sestetti_set (partita_id, numero_set, squadra, zona, convocata_id)
select f.partita_id, 1, f.squadra, f.zona, f.id
from public.formazioni_partita f
where f.zona is not null or (f.libero and f.ruolo = 'libero')
on conflict do nothing;

-- Diretta: solo l'admin assegna punti, chiude i set, registra le azioni e modifica le formazioni
drop policy if exists eventi_live_scrittura_staff on public.eventi_live;
drop policy if exists eventi_live_scrittura_admin on public.eventi_live;
create policy eventi_live_scrittura_admin on public.eventi_live
  for all using (public.e_admin()) with check (public.e_admin());

drop policy if exists set_partita_scrittura_staff on public.set_partita;
drop policy if exists set_partita_scrittura_admin on public.set_partita;
create policy set_partita_scrittura_admin on public.set_partita
  for all using (public.e_admin()) with check (public.e_admin());

drop policy if exists azioni_punto_scrittura_staff on public.azioni_punto;
drop policy if exists azioni_punto_scrittura_admin on public.azioni_punto;
create policy azioni_punto_scrittura_admin on public.azioni_punto
  for all using (public.e_admin()) with check (public.e_admin());

drop policy if exists formazioni_partita_scrittura_staff on public.formazioni_partita;
drop policy if exists formazioni_partita_scrittura_admin on public.formazioni_partita;
create policy formazioni_partita_scrittura_admin on public.formazioni_partita
  for all using (public.e_admin()) with check (public.e_admin());

-- diretta in tempo reale
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sestetti_set'
  ) then
    alter publication supabase_realtime add table public.sestetti_set;
  end if;
end $$;

commit;
