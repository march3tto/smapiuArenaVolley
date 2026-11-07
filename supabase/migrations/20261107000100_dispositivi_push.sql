-- Dispositivi per le notifiche push: solo utenti con accesso, attivate a mano da Impostazioni.
-- Sostituisce push_token come sorgente dei destinatari di invia-notifica (che va ripubblicata DOPO questa migration).
-- push_token resta per le versioni dell'app già installate (registrano ancora lì, anche senza login),
-- ma la function non la legge più: quei dispositivi non ricevono nulla finché l'utente non accede e attiva le notifiche.
--
-- Oltre ai campi base, la tabella tiene le scelte per tipo di Impostazioni e la categoria giovanile dei genitori,
-- che invia-notifica usa già per filtrare i destinatari (prima stavano su push_token).
-- Da eseguire in Supabase > SQL Editor.

create table if not exists public.dispositivi_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique check (token ~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$'),
  piattaforma text not null check (piattaforma in ('ios', 'android')),
  attive boolean not null default true,
  -- scelte per tipo di Impostazioni (stesse colonne e significato di push_token)
  game_day boolean not null default true,
  inizio_partita boolean not null default true,
  voto_mvp boolean not null default true,
  fine_set boolean not null default true,
  risultato_finale boolean not null default true,
  contenuti boolean not null default true,
  -- genitori: partite giovanili della propria categoria
  categoria_giovanile_id uuid references public.categorie_giovanili on delete set null,
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

comment on table public.dispositivi_push is 'Token Expo dei dispositivi degli utenti con accesso; invia-notifica legge solo le righe con attive = true';
comment on column public.dispositivi_push.attive is 'Interruttore Notifiche di Impostazioni per questo dispositivo';

create index if not exists dispositivi_push_user_id_idx on public.dispositivi_push (user_id);
create index if not exists dispositivi_push_attive_idx on public.dispositivi_push (attive);

-- ---------- sicurezza: ogni utente vede e modifica solo i propri dispositivi, nessun accesso per anon ----------

alter table public.dispositivi_push enable row level security;

revoke all on table public.dispositivi_push from anon;
grant select, insert, update, delete on table public.dispositivi_push to authenticated;

drop policy if exists dispositivi_push_select on public.dispositivi_push;
create policy dispositivi_push_select on public.dispositivi_push
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists dispositivi_push_insert on public.dispositivi_push;
create policy dispositivi_push_insert on public.dispositivi_push
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists dispositivi_push_update on public.dispositivi_push;
create policy dispositivi_push_update on public.dispositivi_push
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists dispositivi_push_delete on public.dispositivi_push;
create policy dispositivi_push_delete on public.dispositivi_push
  for delete to authenticated using (user_id = (select auth.uid()));

-- Lo stesso telefono passa a un altro account senza logout (es. sessione scaduta): la riga del token appartiene
-- ancora al vecchio utente e la RLS blocca l'upsert. L'app chiama questa funzione e riprova: elimina il token
-- solo se è di un ALTRO utente. Il token lo conosce solo il dispositivo che lo ha generato.
create or replace function public.libera_dispositivo_push(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$' then
    raise exception 'Token push non valido';
  end if;
  delete from public.dispositivi_push where token = p_token and user_id <> auth.uid();
end; $$;

revoke execute on function public.libera_dispositivo_push(text) from public, anon;
grant execute on function public.libera_dispositivo_push(text) to authenticated;

-- ---------- dati esistenti ----------

-- I dispositivi già collegati a un utente in push_token hanno già concesso il permesso: si portano qui con le loro
-- scelte, così chi riceveva le notifiche continua a riceverle. I token anonimi (senza login) non si copiano.
insert into public.dispositivi_push (
  user_id, token, piattaforma, attive, game_day, inizio_partita, voto_mvp, fine_set, risultato_finale, contenuti, categoria_giovanile_id
)
select utente_id, token, piattaforma, notifiche_attive, game_day, inizio_partita, voto_mvp, fine_set, risultato_finale, contenuti, categoria_giovanile_id
  from public.push_token
 where utente_id is not null
   and attivo
   and piattaforma in ('ios', 'android')
on conflict (token) do nothing;
