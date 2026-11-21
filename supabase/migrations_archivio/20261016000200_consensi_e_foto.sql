-- Consensi degli utenti (registro append-only) e tutela di foto e bio delle atlete (le giovanili sono minorenni).
-- Richiede 20261016000100_profili_e_ruoli.sql (e_staff con search_path fisso).

begin;

-- ---------- consensi ----------

create type public.tipo_consenso as enum ('informativa_privacy', 'eta_14_anni', 'marketing');

-- Una riga per ogni scelta: la revoca è una nuova riga con concesso = false, mai un update.
create table public.consensi_utente (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references auth.users (id) on delete cascade,
  tipo public.tipo_consenso not null,
  concesso boolean not null,
  -- versione dell'informativa mostrata (PRIVACY_POLICY_VERSION in app.config.ts)
  versione_informativa text not null check (length(versione_informativa) between 1 and 40),
  -- app = scelta dell'utente; staff = consenso raccolto su carta e registrato dalla segreteria (solo da SQL/service role)
  origine text not null default 'app' check (origine in ('app', 'staff')),
  -- metodo con cui l'utente era collegato quando ha dato il consenso
  provider_accesso text check (provider_accesso in ('email', 'apple', 'google', 'facebook')),
  creato_il timestamptz not null default now()
);

create index consensi_utente_utente_tipo_idx on public.consensi_utente (utente_id, tipo, creato_il desc);

alter table public.consensi_utente enable row level security;

create policy consensi_utente_lettura on public.consensi_utente
  for select to authenticated
  using (utente_id = auth.uid() or public.e_staff());

create policy consensi_utente_inserimento_self on public.consensi_utente
  for insert to authenticated
  with check (utente_id = auth.uid() and origine = 'app');

-- dal client: lettura e inserimento delle sole colonne di scelta (id, origine e data li decide il database)
revoke all on public.consensi_utente from anon, authenticated;
grant select on public.consensi_utente to authenticated;
grant insert (utente_id, tipo, concesso, versione_informativa, provider_accesso) on public.consensi_utente to authenticated;

-- append-only anche per chi bypassa i privilegi (resta possibile la cancellazione a cascata con l'utente)
create or replace function public.blocca_modifica_consensi()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Il registro dei consensi non si modifica: inserire una nuova riga' using errcode = '42501';
end;
$$;

create trigger trg_consensi_append_only
  before update on public.consensi_utente
  for each row execute function public.blocca_modifica_consensi();

revoke execute on function public.blocca_modifica_consensi() from public, anon, authenticated;

-- Stato attuale: ultima scelta per utente e tipo (le policy della tabella valgono anche qui)
create view public.consensi_utente_attuali with (security_invoker = true) as
select distinct on (utente_id, tipo)
  utente_id, tipo, concesso, versione_informativa, origine, provider_accesso, creato_il
from public.consensi_utente
order by utente_id, tipo, creato_il desc, id desc;

revoke all on public.consensi_utente_attuali from anon, authenticated;
grant select on public.consensi_utente_attuali to authenticated;

-- ---------- foto e bio delle giocatrici ----------

alter table public.giocatrici
  add column consenso_foto boolean not null default false,
  add column consenso_foto_data date,
  add column consenso_foto_note text,
  add constraint giocatrici_consenso_foto_con_data check (not consenso_foto or consenso_foto_data is not null);

comment on column public.giocatrici.consenso_foto is
  'Liberatoria per foto e bio (dei genitori per le minorenni). Senza consenso giocatrici_pubbliche restituisce foto_url e bio null.';

-- La tabella completa (note sul consenso comprese) resta allo staff; il pubblico legge la vista.
-- La vista è security definer (security_invoker = false, proprietario postgres) perché deve leggere giocatrici
-- scavalcando la policy riservata allo staff: espone solo le colonne elencate e foto/bio solo con consenso.
-- Non è aggiornabile (join con squadre) e comunque si concede solo select.
drop policy if exists giocatrici_lettura_pubblica on public.giocatrici;
create policy giocatrici_lettura_staff on public.giocatrici
  for select using (public.e_staff());

create view public.giocatrici_pubbliche with (security_invoker = false) as
select
  g.id,
  g.stagione_id,
  g.squadra_id,
  s.nostra_squadra,
  g.livello_squadra,
  g.categoria_giovanile_id,
  g.nome,
  g.cognome,
  g.numero_maglia,
  g.ruolo,
  case when g.consenso_foto then g.foto_url end as foto_url,
  case when g.consenso_foto then g.bio end as bio,
  g.consenso_foto,
  g.attiva,
  g.ordine,
  g.data_nascita,
  g.anno_nascita,
  g.altezza_cm,
  g.punti,
  g.ace,
  g.muri,
  g.capitana
from public.giocatrici g
join public.squadre s on s.id = g.squadra_id;

revoke all on public.giocatrici_pubbliche from anon, authenticated;
grant select on public.giocatrici_pubbliche to anon, authenticated;

-- ---------- album foto ----------

-- Gli album esistenti diventano non pubblicati finché lo staff non verifica le liberatorie.
alter table public.album_foto
  add column pubblicato boolean not null default false,
  add column consenso_verificato boolean not null default false,
  add constraint album_foto_pubblicato_con_consenso check (not pubblicato or consenso_verificato);

drop policy if exists album_foto_lettura_pubblica on public.album_foto;
create policy album_foto_lettura_pubblica on public.album_foto
  for select using (pubblicato or public.e_staff());

-- le foto seguono l'album: senza questa policy si leggerebbero anche quelle degli album non pubblicati
drop policy if exists foto_lettura_pubblica on public.foto;
create policy foto_lettura_pubblica on public.foto
  for select using (
    public.e_staff()
    or exists (select 1 from public.album_foto a where a.id = foto.album_id and a.pubblicato)
  );

commit;
