-- Fonte della notizia, mostrata come etichetta nell'app: instagram, sito_web (sito della società) o app (scritta per l'app).
-- Facoltativa: le notizie senza fonte non mostrano l'etichetta.
alter table public.notizie add column if not exists fonte text;

alter table public.notizie drop constraint if exists notizie_fonte_check;
alter table public.notizie add constraint notizie_fonte_check check (fonte in ('instagram', 'sito_web', 'app'));

comment on column public.notizie.fonte is 'Da dove viene la notizia: instagram, sito_web o app (null = nessuna etichetta)';
