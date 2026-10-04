-- Campionato di ogni partita (nome, federazione, logo), mostrato nelle card "Prossime partite".
-- logo_url: URL completo o percorso "bucket/file" nello Storage; se vuoto l'app usa il logo incluso
-- (assets/competitions/<slug del nome>.png, es. serie-a3-femminile.png).

begin;

create table if not exists public.campionati (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  federazione text,
  logo_url text,
  creato_il timestamptz not null default now()
);

alter table public.campionati enable row level security;

create policy campionati_lettura_pubblica on public.campionati for select using (true);
create policy campionati_scrittura_staff on public.campionati for all using (e_staff()) with check (e_staff());

alter table public.partite
  add column if not exists campionato_id uuid references public.campionati (id) on delete set null;

insert into public.campionati (nome, federazione)
values ('Serie A3 Femminile', 'FIPAV')
on conflict (nome) do nothing;

-- le partite con girone sono quelle di campionato; le amichevoli restano senza campionato
update public.partite
set campionato_id = (select id from public.campionati where nome = 'Serie A3 Femminile')
where girone is not null and campionato_id is null;

commit;
