-- Azione tecnica di ogni punto della diretta, separata dalla frase di cronaca (eventi_live.descrizione).
-- Chi conquista il punto lo decide l'app (squadra), la frase può essere scritta dall'AI (frase_ai).
-- Da eseguire in Supabase > SQL Editor.

begin;

create table if not exists public.azioni_punto (
  id uuid primary key default gen_random_uuid(),
  partita_id uuid not null references public.partite (id) on delete cascade,
  -- evento di cronaca con la frase scelta
  evento_id uuid not null unique references public.eventi_live (id) on delete cascade,
  numero_set integer not null,
  -- squadra che ha conquistato il punto
  squadra text not null check (squadra in ('nostra', 'avversaria')),
  azione text not null check (azione in ('schiacciata', 'pipe', 'primo_tempo', 'pallonetto', 'ace', 'muro', 'errore_avversario')),
  fase text not null check (fase in ('attacco', 'difesa')),
  -- posizione in campo I-VI
  zona smallint check (zona between 1 and 6),
  -- riga di formazioni_partita (senza vincolo: la migrazione funziona anche se le formazioni non ci sono ancora)
  formazione_id uuid,
  giocatrice_id uuid references public.giocatrici (id) on delete set null,
  nome_giocatrice text,
  punteggio_nostro integer not null,
  punteggio_avversario integer not null,
  frase_ai boolean not null default false,
  creato_il timestamptz not null default now()
);

create index if not exists azioni_punto_partita_idx on public.azioni_punto (partita_id);
create index if not exists azioni_punto_giocatrice_idx on public.azioni_punto (giocatrice_id);

alter table public.azioni_punto enable row level security;

drop policy if exists azioni_punto_lettura on public.azioni_punto;
create policy azioni_punto_lettura on public.azioni_punto for select using (true);

drop policy if exists azioni_punto_scrittura_staff on public.azioni_punto;
create policy azioni_punto_scrittura_staff on public.azioni_punto
  for all using (public.e_staff()) with check (public.e_staff());

-- Punti di ogni giocatrice della rosa, per partita, contati dalle azioni registrate
create or replace view public.punti_giocatrici_partita with (security_invoker = true) as
select
  partita_id,
  giocatrice_id,
  max(nome_giocatrice) as nome_giocatrice,
  count(*) as punti,
  count(*) filter (where azione = 'ace') as ace,
  count(*) filter (where azione = 'muro') as muri,
  count(*) filter (where fase = 'attacco' and azione <> 'ace') as attacchi
from public.azioni_punto
where squadra = 'nostra' and giocatrice_id is not null
group by partita_id, giocatrice_id;

commit;

-- Diretta in tempo reale: le azioni arrivano subito dopo l'evento di cronaca.
-- Se dà "already member of publication", la tabella è già a posto.
alter publication supabase_realtime add table public.azioni_punto;
