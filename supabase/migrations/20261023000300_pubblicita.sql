-- Pubblicità mostrata al centro dello schermo (vedi src/components/AdPopup.tsx).
-- La frequenza di ogni pubblicità è in frequenza_minuti (migrazione 20261023000400_pubblicita_frequenza).
-- Gli utenti registrati possono eliminarla dalle Impostazioni.
-- url_immagine: percorso "pubblicita/<file>" nel bucket pubblico "pubblicita" (o URL completo).
-- L'immagine iniziale è supabase/pubblicita/libro-finalmente-in-serie-a.jpg, da caricare nel bucket con lo stesso nome.

begin;

insert into storage.buckets (id, name, public)
values ('pubblicita', 'pubblicita', true)
on conflict (id) do nothing;

create table if not exists public.pubblicita (
  id uuid primary key default gen_random_uuid(),
  titolo text not null unique,
  sottotitolo text,
  testo text,
  url_immagine text,
  url_link text,
  etichetta_link text,
  ordine integer not null default 0,
  attiva boolean not null default true,
  creato_il timestamptz not null default now()
);

alter table public.pubblicita enable row level security;

create policy pubblicita_lettura_pubblica on public.pubblicita for select using (attiva or e_staff());
create policy pubblicita_scrittura_staff on public.pubblicita for all using (e_staff()) with check (e_staff());

-- Fonte: sito ufficiale, sezione in fondo alla home
insert into public.pubblicita (titolo, sottotitolo, testo, url_immagine, url_link, etichetta_link, ordine)
values (
  'Finalmente in Serie A!',
  'Il nuovo libro di Marco Carta',
  'Come una squadra di provincia e una piccola impresa hanno imparato a giocare ad alti livelli: la storia di sport e impresa che ha legato Smapiù all’Arena Volley Team, fino alla promozione in Serie A.',
  'pubblicita/libro-finalmente-in-serie-a.jpg',
  'https://www.amazon.it/dp/B0HGP4Q5GD',
  'Disponibile su Amazon e Kindle',
  1
)
on conflict (titolo) do nothing;

commit;
