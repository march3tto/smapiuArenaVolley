-- Profili e ruoli: nessuno può ottenere staff o admin registrandosi o modificando il proprio profilo.
--
-- Prima di questa migration:
--   - non c'era nessun trigger su auth.users: i profili non nascevano da soli;
--   - anon e authenticated avevano tutti i privilegi su profili e la policy profili_scrittura_self
--     permetteva a chiunque di fare "update profili set ruolo = 'admin' where id = auth.uid()";
--   - is_staff() puntava a una tabella "profiles" che non esiste.
--
-- Regole dopo questa migration:
--   - ogni nuovo utente nasce con ruolo 'pubblico' (fisso, mai letto dai metadata);
--   - dall'app il ruolo cambia solo con la RPC imposta_ruolo_utente:
--       staff → solo pubblico ↔ genitore, su altri utenti;
--       admin → pubblico, genitore, staff, su altri utenti non admin;
--       'admin' non si assegna mai dall'app: solo da SQL Editor (auth.uid() nullo), vedi docs/gdpr/README.md;
--   - nessuno può cambiare il proprio ruolo; l'ultimo admin non può essere declassato né eliminato.
-- Sostituisce la bozza "src/Claude outputs/profili_auto_creazione_e_blocco_ruolo.sql", mai applicata.

begin;

-- ---------- funzioni di ruolo ----------

create or replace function public.e_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo in ('staff', 'admin'));
$$;

create or replace function public.e_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo = 'admin');
$$;

-- nomi del vecchio schema in inglese: restano come alias, così nessuna policy o query che li usa si rompe
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_staff();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.e_admin();
$$;

-- ---------- profilo creato alla registrazione (email, Apple, Google, Facebook) ----------

create or replace function public.crea_profilo_nuovo_utente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- il ruolo è fisso: raw_user_meta_data arriva dal client e non va mai usato per il ruolo
  insert into public.profili (id, nome_completo, ruolo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), '')),
    'pubblico'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_crea_profilo on auth.users;
create trigger trg_crea_profilo
  after insert on auth.users
  for each row execute function public.crea_profilo_nuovo_utente();

-- ---------- difesa sul ruolo (vale anche per service role e RPC) ----------

create or replace function public.proteggi_ruolo_profilo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.ruolo is distinct from 'pubblico' then
      raise exception 'Un profilo nasce sempre con ruolo pubblico' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.ruolo = 'admin' and not exists (select 1 from profili where ruolo = 'admin' and id <> old.id) then
      raise exception 'Impossibile eliminare l''ultimo admin' using errcode = '42501';
    end if;
    return old;
  end if;

  -- UPDATE
  if new.id is distinct from old.id then
    raise exception 'L''id del profilo non si può modificare' using errcode = '42501';
  end if;
  if new.ruolo is not distinct from old.ruolo then
    return new;
  end if;

  -- con un utente collegato (app, RPC, API): regole dell'app. Senza auth.uid() (SQL Editor, service role) è consentito.
  if v_uid is not null then
    if new.id = v_uid then
      raise exception 'Non puoi modificare il tuo ruolo' using errcode = '42501';
    end if;
    if new.ruolo = 'admin' then
      raise exception 'Il ruolo admin si assegna solo dal pannello Supabase' using errcode = '42501';
    end if;
    if old.ruolo = 'admin' then
      raise exception 'Il ruolo di un admin si modifica solo dal pannello Supabase' using errcode = '42501';
    end if;
    if public.e_admin() then
      null; -- pubblico, genitore, staff
    elsif public.e_staff() then
      if old.ruolo not in ('pubblico', 'genitore') or new.ruolo not in ('pubblico', 'genitore') then
        raise exception 'Lo staff può assegnare solo i ruoli pubblico e genitore' using errcode = '42501';
      end if;
    else
      raise exception 'Non autorizzato a modificare i ruoli' using errcode = '42501';
    end if;
  end if;

  if old.ruolo = 'admin' and not exists (select 1 from profili where ruolo = 'admin' and id <> old.id) then
    raise exception 'Impossibile declassare l''ultimo admin' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteggi_ruolo on public.profili;
create trigger trg_proteggi_ruolo
  before insert or update or delete on public.profili
  for each row execute function public.proteggi_ruolo_profilo();

-- ---------- RPC: unico modo per cambiare un ruolo dall'app ----------

create or replace function public.imposta_ruolo_utente(p_utente uuid, p_ruolo public.ruolo_utente)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;
  if not public.e_staff() then
    raise exception 'Solo staff e admin possono modificare i ruoli' using errcode = '42501';
  end if;
  -- le regole su chi può assegnare cosa sono in proteggi_ruolo_profilo (auth.uid() resta quello del chiamante)
  update profili set ruolo = p_ruolo where id = p_utente;
  if not found then
    raise exception 'Utente non trovato' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.imposta_ruolo_utente(uuid, public.ruolo_utente) from public, anon;
grant execute on function public.imposta_ruolo_utente(uuid, public.ruolo_utente) to authenticated;
revoke execute on function public.crea_profilo_nuovo_utente() from public, anon, authenticated;
revoke execute on function public.proteggi_ruolo_profilo() from public, anon, authenticated;

-- ---------- privilegi e policy su profili ----------

-- niente insert/delete dal client (i profili nascono dal trigger, spariscono con l'utente);
-- in update solo nome e categoria giovanile di interesse, mai ruolo o id
revoke insert, update, delete, truncate, references, trigger on public.profili from anon, authenticated;
grant update (nome_completo, categoria_giovanile_id) on public.profili to authenticated;

drop policy if exists profili_scrittura_self on public.profili;
create policy profili_scrittura_self on public.profili
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- utenti già registrati senza profilo (nessun trigger fino a oggi)
insert into public.profili (id, nome_completo, ruolo)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), '')), 'pubblico'
from auth.users u
where not exists (select 1 from public.profili p where p.id = u.id);

commit;
