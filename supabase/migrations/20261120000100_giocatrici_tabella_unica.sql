-- Una sola tabella per le giocatrici: giocatrici leggibile da tutti (voto MVP, rose, formazioni) senza la vista
-- giocatrici_pubbliche. Le liberatorie restano rispettate:
--  * foto e bio si possono salvare solo con la liberatoria (vincolo): nella tabella non c'è nulla da nascondere;
--  * data di nascita completa e dati della liberatoria (data e note) restano nella tabella ma il pubblico e gli utenti
--    non possono leggerli (privilegi per colonna): si vedono e si modificano dalla dashboard Supabase;
--  * anno_nascita è pubblico e si ricava da solo dalla data di nascita.
-- Con i privilegi per colonna select('*') non funziona più: chi legge deve elencare le colonne.
-- La scrittura resta allo staff (policy giocatrici_scrittura_staff).

-- ---------- liberatoria: foto e bio solo con consenso ----------

alter table public.giocatrici
  add constraint giocatrici_foto_bio_solo_con_consenso
  check (consenso_foto or (foto_url is null and bio is null));

comment on column public.giocatrici.consenso_foto is
  'Liberatoria per foto e bio (dei genitori per le minorenni). Senza consenso foto_url e bio devono essere vuote '
  '(vincolo giocatrici_foto_bio_solo_con_consenso): per revocarla svuotare prima foto e bio.';

-- ---------- anno di nascita pubblico, ricavato dalla data ----------

create or replace function public.giocatrici_anno_nascita()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.data_nascita is not null then
    new.anno_nascita := extract(year from new.data_nascita)::smallint;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_giocatrici_anno_nascita on public.giocatrici;
create trigger trg_giocatrici_anno_nascita
  before insert or update of data_nascita, anno_nascita on public.giocatrici
  for each row execute function public.giocatrici_anno_nascita();

update public.giocatrici
set anno_nascita = extract(year from data_nascita)::smallint
where data_nascita is not null
  and anno_nascita is distinct from extract(year from data_nascita)::smallint;

-- ---------- lettura pubblica, colonne riservate escluse ----------

drop policy if exists giocatrici_lettura_staff on public.giocatrici;
drop policy if exists giocatrici_lettura_pubblica on public.giocatrici;
create policy giocatrici_lettura_pubblica on public.giocatrici
  for select using (true);

revoke select on public.giocatrici from anon, authenticated;
grant select (
  id, stagione_id, squadra_id, livello_squadra, categoria_giovanile_id,
  nome, cognome, numero_maglia, ruolo, capitana, attiva, ordine,
  foto_url, bio, consenso_foto,
  anno_nascita, altezza_cm, punti, ace, muri
) on public.giocatrici to anon, authenticated;
-- escluse: data_nascita, consenso_foto_data, consenso_foto_note

-- ---------- la vista non serve più ----------

drop view if exists public.giocatrici_pubbliche;
