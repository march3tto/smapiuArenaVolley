-- Formazioni della partita: rosa di entrambe le squadre e Starting Six.
-- Una riga per giocatrice a referto. La nostra rosa la carica l'app dalle giocatrici attive,
-- quella avversaria la inserisce un admin dalla diretta.
-- zona = posizione di partenza (I-VI del foglio formazione, 1 = al servizio): valorizzata solo per le titolari.

begin;

create table if not exists public.formazioni_partita (
  id uuid primary key default gen_random_uuid(),
  partita_id uuid not null references public.partite(id) on delete cascade,
  squadra text not null check (squadra in ('nostra', 'avversaria')),
  giocatrice_id uuid references public.giocatrici(id) on delete set null,
  numero_maglia integer check (numero_maglia between 0 and 99),
  nome text not null,
  ruolo public.ruolo_giocatrice,
  capitana boolean not null default false,
  zona integer check (zona between 1 and 6),
  ordine integer not null default 0,
  creato_il timestamptz not null default now(),
  -- il libero non può far parte dello Starting Six
  constraint formazioni_libero_non_titolare check (zona is null or ruolo is distinct from 'libero')
);

create index if not exists formazioni_partita_partita_idx on public.formazioni_partita (partita_id);
-- una sola titolare per zona e una sola riga per giocatrice della nostra rosa
create unique index if not exists formazioni_partita_zona_key on public.formazioni_partita (partita_id, squadra, zona) where zona is not null;
create unique index if not exists formazioni_partita_giocatrice_key on public.formazioni_partita (partita_id, giocatrice_id) where giocatrice_id is not null;

alter table public.formazioni_partita enable row level security;

drop policy if exists formazioni_partita_lettura_pubblica on public.formazioni_partita;
create policy formazioni_partita_lettura_pubblica on public.formazioni_partita
  for select using (true);

drop policy if exists formazioni_partita_scrittura_staff on public.formazioni_partita;
create policy formazioni_partita_scrittura_staff on public.formazioni_partita
  for all using (public.e_staff()) with check (public.e_staff());

-- diretta in tempo reale
alter publication supabase_realtime add table public.formazioni_partita;

commit;
