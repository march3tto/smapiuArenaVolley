-- Base di conoscenza dell'assistente AI (RAG full-text italiano, senza embedding per ora).
--
--   fonti       siti/pdf/testi da cui lo script di ingestione (ingestione/) ricava i blocchi. Solo admin.
--   conoscenza  blocchi di testo (~500 parole) di una fonte, o scritti a mano (fonte_id nullo). Lettura pubblica.
--   faq         domande e risposte curate dall'admin. Lettura pubblica delle sole attive.
--   cerca_conoscenza(query, limite)  ricerca su conoscenza + faq per la Edge Function assistente.
--
-- Scrittura solo admin (e_admin(), lo stesso controllo delle policy della Live).
-- Per gli embedding in futuro: colonna vector su conoscenza/faq e una seconda funzione di ricerca,
-- la firma di cerca_conoscenza può restare uguale (la Edge Function passa da un'unica funzione "recupera").

begin;

-- ---------- aggiornato_il automatico ----------

create or replace function public.imposta_aggiornato_il()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.aggiornato_il := now();
  return new;
end;
$$;

revoke execute on function public.imposta_aggiornato_il() from public, anon, authenticated;

-- ---------- fonti ----------

create table if not exists public.fonti (
  id            uuid primary key default gen_random_uuid(),
  url           text unique check (url ~ '^https?://'),
  nome          text not null check (length(trim(nome)) > 0),
  tipo          text not null default 'sito' check (tipo in ('sito', 'pdf', 'manuale')),
  frequenza_ore integer not null default 24 check (frequenza_ore between 1 and 8760),
  ultimo_fetch  timestamptz,
  ultimo_esito  text,
  attiva        boolean not null default true,
  created_at    timestamptz not null default now(),
  -- i testi manuali non hanno un url da scaricare, siti e pdf sì
  constraint fonti_url_obbligatorio check (tipo = 'manuale' or url is not null)
);

comment on table public.fonti is 'Fonti della base di conoscenza dell''assistente (siti, pdf, testi manuali). Solo admin.';
comment on column public.fonti.frequenza_ore is 'Ogni quante ore lo script di ingestione riscarica la fonte';
comment on column public.fonti.ultimo_esito is 'Esito dell''ultima ingestione (ok / messaggio di errore), scritto dallo script';

-- ---------- conoscenza ----------

create table if not exists public.conoscenza (
  id            uuid primary key default gen_random_uuid(),
  fonte_id      uuid references public.fonti(id) on delete cascade,
  posizione     integer not null default 0,
  titolo        text not null,
  testo         text not null check (length(testo) <= 20000),
  url_origine   text,
  aggiornato_il timestamptz not null default now(),
  -- il titolo pesa più del testo nel ranking
  ricerca       tsvector generated always as (
    setweight(to_tsvector('italian'::regconfig, coalesce(titolo, '')), 'A') ||
    setweight(to_tsvector('italian'::regconfig, coalesce(testo, '')), 'B')
  ) stored
);

comment on table public.conoscenza is 'Blocchi di testo per l''assistente AI: dallo script di ingestione (fonte_id) o scritti a mano (fonte_id nullo)';
comment on column public.conoscenza.posizione is 'Ordine del blocco all''interno della fonte';

create index if not exists conoscenza_ricerca_idx on public.conoscenza using gin (ricerca);
create index if not exists conoscenza_fonte_idx on public.conoscenza (fonte_id, posizione);

drop trigger if exists trg_conoscenza_aggiornato_il on public.conoscenza;
create trigger trg_conoscenza_aggiornato_il
  before update on public.conoscenza
  for each row execute function public.imposta_aggiornato_il();

-- ---------- faq ----------

create table if not exists public.faq (
  id            uuid primary key default gen_random_uuid(),
  domanda       text not null check (length(trim(domanda)) between 3 and 500),
  risposta      text not null check (length(trim(risposta)) between 1 and 5000),
  categoria     text,
  attiva        boolean not null default true,
  ordine        integer not null default 0,
  aggiornato_il timestamptz not null default now(),
  ricerca       tsvector generated always as (
    setweight(to_tsvector('italian'::regconfig, coalesce(domanda, '')), 'A') ||
    setweight(to_tsvector('italian'::regconfig, coalesce(risposta, '')), 'B')
  ) stored
);

comment on table public.faq is 'Domande frequenti curate dall''admin, usate dall''assistente AI';

create index if not exists faq_ricerca_idx on public.faq using gin (ricerca);
create index if not exists faq_ordine_idx on public.faq (ordine);

drop trigger if exists trg_faq_aggiornato_il on public.faq;
create trigger trg_faq_aggiornato_il
  before update on public.faq
  for each row execute function public.imposta_aggiornato_il();

-- ---------- privilegi ----------
-- TRUNCATE non passa dalle RLS: va tolto esplicitamente. Le scritture restano filtrate dalle policy.

revoke all on public.fonti from anon;
revoke truncate, references, trigger on public.fonti from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.conoscenza, public.faq from anon;
revoke truncate, references, trigger on public.conoscenza, public.faq from authenticated;

-- ---------- RLS ----------

alter table public.fonti enable row level security;
alter table public.conoscenza enable row level security;
alter table public.faq enable row level security;

drop policy if exists fonti_admin on public.fonti;
create policy fonti_admin on public.fonti
  for all to authenticated
  using ((select public.e_admin())) with check ((select public.e_admin()));

drop policy if exists conoscenza_lettura on public.conoscenza;
create policy conoscenza_lettura on public.conoscenza
  for select to anon, authenticated
  using (true);

drop policy if exists conoscenza_inserimento_admin on public.conoscenza;
create policy conoscenza_inserimento_admin on public.conoscenza
  for insert to authenticated with check ((select public.e_admin()));
drop policy if exists conoscenza_modifica_admin on public.conoscenza;
create policy conoscenza_modifica_admin on public.conoscenza
  for update to authenticated using ((select public.e_admin())) with check ((select public.e_admin()));
drop policy if exists conoscenza_eliminazione_admin on public.conoscenza;
create policy conoscenza_eliminazione_admin on public.conoscenza
  for delete to authenticated using ((select public.e_admin()));

-- le FAQ disattivate le vede solo l'admin (per riattivarle dalla gestione)
drop policy if exists faq_lettura on public.faq;
create policy faq_lettura on public.faq
  for select to anon, authenticated
  using (attiva or (select public.e_admin()));

drop policy if exists faq_inserimento_admin on public.faq;
create policy faq_inserimento_admin on public.faq
  for insert to authenticated with check ((select public.e_admin()));
drop policy if exists faq_modifica_admin on public.faq;
create policy faq_modifica_admin on public.faq
  for update to authenticated using ((select public.e_admin())) with check ((select public.e_admin()));
drop policy if exists faq_eliminazione_admin on public.faq;
create policy faq_eliminazione_admin on public.faq
  for delete to authenticated using ((select public.e_admin()));

-- ---------- ricerca ----------
-- 1) websearch_to_tsquery (tutte le parole, supporta "frasi" e -esclusioni);
-- 2) se non trova nulla, le stesse parole in OR: le domande in linguaggio naturale raramente contengono tutte
--    le parole di un blocco. ts_rank con normalizzazione 1 (log della lunghezza) per non premiare i blocchi lunghi.
-- security definer: legge fonti (riservata all'admin) solo per escludere i blocchi delle fonti disattivate;
-- restituisce solo dati già pubblici (conoscenza, faq attive).

create or replace function public.cerca_conoscenza(query text, limite integer default 5)
returns table (titolo text, testo text, url_origine text, tipo text, rank real)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q_testo text := left(trim(coalesce(query, '')), 500);
  n integer := least(greatest(coalesce(limite, 5), 1), 10);
  q tsquery;
  q_or tsquery;
  parole text;
begin
  if q_testo = '' then
    return;
  end if;

  q := websearch_to_tsquery('italian'::regconfig, q_testo);

  -- lessemi già normalizzati in italiano, messi in OR (apici e backslash tolti: niente sintassi tsquery dall'utente)
  select string_agg(distinct '''' || regexp_replace(l, '[''\\]', '', 'g') || '''', ' | ')
    into parole
    from unnest(tsvector_to_array(to_tsvector('italian'::regconfig, q_testo))) as l
   where regexp_replace(l, '[''\\]', '', 'g') <> '';
  q_or := case when parole is null then null else parole::tsquery end;

  if q is null or numnode(q) = 0 then
    return;
  end if;

  for pass in 1..2 loop
    return query
      with risultati as (
        select c.titolo, c.testo, c.url_origine, coalesce(f.tipo, 'manuale') as tipo,
               ts_rank(c.ricerca, case when pass = 1 then q else q_or end, 1) as rank
          from conoscenza c
          left join fonti f on f.id = c.fonte_id
         where (c.fonte_id is null or f.attiva)
           and c.ricerca @@ (case when pass = 1 then q else q_or end)
        union all
        select d.domanda, d.risposta, null::text, 'faq',
               -- a parità di pertinenza la FAQ curata vince sul testo del sito
               ts_rank(d.ricerca, case when pass = 1 then q else q_or end, 1) * 1.2
          from faq d
         where d.attiva
           and d.ricerca @@ (case when pass = 1 then q else q_or end)
      )
      select r.titolo, r.testo, r.url_origine, r.tipo, r.rank::real
        from risultati r
       order by r.rank desc
       limit n;

    exit when found or q_or is null;
  end loop;
end;
$$;

comment on function public.cerca_conoscenza(text, integer) is
  'Ricerca full-text italiana su conoscenza e faq attive per l''assistente AI (AND, poi OR se non trova nulla)';

revoke execute on function public.cerca_conoscenza(text, integer) from public;
grant execute on function public.cerca_conoscenza(text, integer) to anon, authenticated, service_role;

commit;
