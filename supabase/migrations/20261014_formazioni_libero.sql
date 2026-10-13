-- Libero della partita: giocatrice della panchina scelta come libero (una per squadra).
-- Non può essere anche nello Starting Six.

begin;

alter table public.formazioni_partita add column if not exists libero boolean not null default false;

alter table public.formazioni_partita drop constraint if exists formazioni_libero_in_panchina;
alter table public.formazioni_partita add constraint formazioni_libero_in_panchina check (not libero or zona is null);

create unique index if not exists formazioni_partita_libero_key on public.formazioni_partita (partita_id, squadra) where libero;

commit;
