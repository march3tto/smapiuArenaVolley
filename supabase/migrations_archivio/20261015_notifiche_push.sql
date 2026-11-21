-- Notifiche push (Expo): token dei dispositivi, registro degli invii, trigger e cron che chiamano la Edge Function invia-notifica.
--
-- Prima di applicare: salvare nel Vault il segreto condiviso con la function (lo stesso valore di NOTIFICHE_SEGRETO tra i secrets):
--   select vault.create_secret('<segreto>', 'notifiche_segreto');
-- Senza segreto i trigger non falliscono: registrano un warning e non inviano nulla.
--
-- Perché trigger con pg_net e non i Database Webhook del pannello: i webhook partono a ogni insert/update della tabella,
-- senza condizione WHEN, quindi chiamerebbero la function a ogni punto del set; qui il trigger scatta solo quando
-- completato / pubblicata passa a true, e tutto resta versionato in questa migration.

create extension if not exists pg_net;

-- ---------- token dei dispositivi ----------

create table if not exists public.push_token (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  utente_id uuid references auth.users on delete cascade,
  categoria_giovanile_id uuid references public.categorie_giovanili on delete set null,
  piattaforma text,
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create index if not exists push_token_categoria_idx on public.push_token (categoria_giovanile_id) where attivo;

alter table public.push_token enable row level security;

-- nessuna lettura pubblica: solo staff e admin; le scritture passano dalla RPC o dalla function (service role)
drop policy if exists push_token_lettura_staff on public.push_token;
create policy push_token_lettura_staff on public.push_token for select using (public.e_staff());

-- Registra (o aggiorna) il token del dispositivo; funziona anche senza login. Collega l'utente se c'è una sessione.
create or replace function public.registra_push_token(p_token text, p_piattaforma text default null, p_categoria_giovanile_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$' then
    raise exception 'Token push non valido';
  end if;

  insert into push_token (token, utente_id, categoria_giovanile_id, piattaforma)
  values (p_token, auth.uid(), p_categoria_giovanile_id, left(p_piattaforma, 20))
  on conflict (token) do update
     set utente_id = excluded.utente_id,
         categoria_giovanile_id = excluded.categoria_giovanile_id,
         piattaforma = excluded.piattaforma,
         attivo = true,
         aggiornato_il = now();
end; $$;

revoke execute on function public.registra_push_token(text, text, uuid) from public;
grant execute on function public.registra_push_token(text, text, uuid) to anon, authenticated;

-- ---------- registro degli invii (deduplica) ----------

create table if not exists public.notifiche_inviate (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('prepartita', 'fine_set', 'notizia', 'video', 'podcast')),
  riferimento_id uuid,
  -- es. prepartita:<partita_id>:<data_partita in secondi>, fine_set:<partita_id>:<numero_set>, notizia:<id>
  chiave text not null unique,
  destinatari integer,
  inviata_il timestamptz not null default now()
);

alter table public.notifiche_inviate enable row level security;

drop policy if exists notifiche_inviate_lettura_staff on public.notifiche_inviate;
create policy notifiche_inviate_lettura_staff on public.notifiche_inviate for select using (public.e_staff());

-- ---------- chiamata alla Edge Function ----------

-- Accoda la chiamata HTTP (pg_net la esegue dopo il commit, quindi la function legge i dati già salvati)
create or replace function public.invia_notifica_push(p_tipo text, p_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_segreto text;
begin
  select decrypted_secret into v_segreto from vault.decrypted_secrets where name = 'notifiche_segreto';
  if v_segreto is null then
    raise warning 'notifiche push: segreto notifiche_segreto mancante nel Vault, % % non inviata', p_tipo, p_id;
    return null;
  end if;

  return net.http_post(
    url := 'https://ruqwpjxpmebiejdndoxd.supabase.co/functions/v1/invia-notifica',
    body := jsonb_build_object('tipo', p_tipo, 'id', p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notifiche-segreto', v_segreto),
    timeout_milliseconds := 15000
  );
end; $$;

-- Trigger: set chiuso, notizia pubblicata, video/podcast pubblicato. TG_ARGV[0] è il tipo (per media si usa la colonna tipo).
create or replace function public.trg_notifica_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text := tg_argv[0];
begin
  if tg_table_name = 'media' then
    v_tipo := new.tipo::text;
  end if;
  perform invia_notifica_push(v_tipo, new.id);
  return null;
end; $$;

-- Pre-partita: partite programmate che iniziano tra 25 e 35 minuti (la function scarta quelle già notificate)
create or replace function public.notifica_prepartite()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id from partite
     where stato = 'programmata'
       and data_partita between now() + interval '25 minutes' and now() + interval '35 minutes'
  loop
    perform invia_notifica_push('prepartita', r.id);
    n := n + 1;
  end loop;
  return n;
end; $$;

-- funzioni interne: non richiamabili dall'app
revoke execute on function public.invia_notifica_push(text, uuid) from public, anon, authenticated;
revoke execute on function public.trg_notifica_push() from public, anon, authenticated;
revoke execute on function public.notifica_prepartite() from public, anon, authenticated;

-- set_partita: completato diventa true (insert già chiuso, oppure update da false a true)
drop trigger if exists trg_set_partita_notifica_ins on public.set_partita;
create trigger trg_set_partita_notifica_ins after insert on public.set_partita
  for each row when (new.completato) execute function public.trg_notifica_push('fine_set');
drop trigger if exists trg_set_partita_notifica_upd on public.set_partita;
create trigger trg_set_partita_notifica_upd after update of completato on public.set_partita
  for each row when (new.completato and not old.completato) execute function public.trg_notifica_push('fine_set');

-- notizie: pubblicata diventa true
drop trigger if exists trg_notizie_notifica_ins on public.notizie;
create trigger trg_notizie_notifica_ins after insert on public.notizie
  for each row when (new.pubblicata) execute function public.trg_notifica_push('notizia');
drop trigger if exists trg_notizie_notifica_upd on public.notizie;
create trigger trg_notizie_notifica_upd after update of pubblicata on public.notizie
  for each row when (new.pubblicata and not old.pubblicata) execute function public.trg_notifica_push('notizia');

-- media: pubblicato diventa true (tipo video o podcast dalla riga)
drop trigger if exists trg_media_notifica_ins on public.media;
create trigger trg_media_notifica_ins after insert on public.media
  for each row when (new.pubblicato) execute function public.trg_notifica_push('media');
drop trigger if exists trg_media_notifica_upd on public.media;
create trigger trg_media_notifica_upd after update of pubblicato on public.media
  for each row when (new.pubblicato and not old.pubblicato) execute function public.trg_notifica_push('media');

-- ogni 5 minuti (cron.schedule con lo stesso nome aggiorna il job esistente)
select cron.schedule('notifiche-prepartita', '*/5 * * * *', 'select public.notifica_prepartite();');
