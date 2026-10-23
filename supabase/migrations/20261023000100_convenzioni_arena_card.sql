-- Convenzioni dell'Arena Volley Card: partner, promozione riservata ai possessori della card e logo.
-- url_logo: percorso "convenzioni/<file>" nel bucket pubblico "convenzioni" (o URL completo).
-- I loghi iniziali sono i .png di supabase/convenzioni/, da caricare nel bucket con lo stesso nome.

begin;

insert into storage.buckets (id, name, public)
values ('convenzioni', 'convenzioni', true)
on conflict (id) do nothing;

create table if not exists public.convenzioni (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  promozione text not null,
  url_logo text,
  url_sito text,
  ordine integer not null default 0,
  attiva boolean not null default true,
  creato_il timestamptz not null default now()
);

alter table public.convenzioni enable row level security;

create policy convenzioni_lettura_pubblica on public.convenzioni for select using (attiva or e_staff());
create policy convenzioni_scrittura_staff on public.convenzioni for all using (e_staff()) with check (e_staff());

-- Convenzioni attuali (fonte: sito ufficiale, pagina Arena Volley Card)
insert into public.convenzioni (nome, promozione, url_logo, url_sito, ordine)
values
  ('Bel Sito Pizzeria', 'Vieni a trovarci e mostra la tua Arena Volley Card per avere un prezzo di favore per pizza + bibita + caffè a soli 15€',
    'convenzioni/pizzeria-bel-sito.png', 'https://arenavolleyteam.it/sponsor_area/bel-sito-pizzeria/', 1),
  ('Ca’ Fontana', 'Sconto 10%', 'convenzioni/ca-fontana.png', 'https://arenavolleyteam.it/sponsor_area/ca-fontana/', 2),
  ('Dolce Sicilia', '10% di sconto su tutto', 'convenzioni/dolce-sicilia.png', 'https://arenavolleyteam.it/sponsor_area/dolce-sicilia/', 3),
  ('ilmur', 'Sconto 15%: Macinati Moka, Caffè in grano, creme spalmabili, capsule compatibili Nespresso, Coffee Pops e Sconto 10%: prodotti Infermentum, liquori Alchimia, Gin della Lessinia',
    'convenzioni/ilmur.png', 'https://arenavolleyteam.it/sponsor_area/ilmur/', 4),
  ('Nutrizionista Elena D’Iseppi', 'Prima visita: 90€ al posto dei 120€ | Visita di controllo 50€ al posto dei 60€',
    'convenzioni/nutrizionista-elena-diseppi.png', 'https://arenavolleyteam.it/sponsor_area/nutrizionista-elena-diseppi/', 5),
  ('Primamano', 'Su pitture e vernici sconti fino al 40% | Su decorazioni e carte da parati 20% | Sopralluogo e Preventivo gratuito',
    'convenzioni/primamano.png', 'https://arenavolleyteam.it/sponsor_area/primamano/', 6),
  ('Primo Round', 'Vieni da noi, mostra la tua Arena Volley Card per poter acquistare la tessera 10 Birre a soli 40€ in promozione.',
    'convenzioni/primo-round.png', 'https://arenavolleyteam.it/sponsor_area/primo-round/', 7),
  ('Studio Hita', 'Sconto 20% su realizzazione siti web, ecommerce, software personalizzati, gestione social e comunicazione aziendale',
    'convenzioni/studio-hita.png', 'https://arenavolleyteam.it/sponsor_area/studio-hita/', 8)
on conflict (nome) do nothing;

commit;
