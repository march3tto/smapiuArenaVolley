-- SmapiuArenaVolley: profilo automatico alla registrazione + ruolo modificabile solo da admin
-- Da incollare in Supabase > SQL Editor ed eseguire una volta.

create or replace function public.e_staff()
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo in ('staff','admin'));
$$;

create or replace function public.e_admin()
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.profili where id = auth.uid() and ruolo = 'admin');
$$;

-- 1. Creazione automatica del profilo alla registrazione
create or replace function public.crea_profilo_nuovo_utente()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profili (id, nome_completo, ruolo)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), 'pubblico')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_crea_profilo on auth.users;
create trigger trg_crea_profilo
  after insert on auth.users
  for each row execute function public.crea_profilo_nuovo_utente();

-- 2. Il ruolo lo cambia solo un admin (dal SQL Editor auth.uid() e' null, quindi e' consentito)
create or replace function public.blocca_cambio_ruolo()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if new.ruolo is distinct from old.ruolo
     and auth.uid() is not null
     and not public.e_admin() then
    raise exception 'Solo un admin puo'' modificare il ruolo'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_blocca_cambio_ruolo on public.profili;
create trigger trg_blocca_cambio_ruolo
  before update on public.profili
  for each row execute function public.blocca_cambio_ruolo();

-- 3. Policy di update: ognuno il proprio profilo, l'admin tutti
drop policy if exists profili_scrittura_self on public.profili;
create policy profili_scrittura_self on public.profili
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profili_scrittura_admin on public.profili;
create policy profili_scrittura_admin on public.profili
  for update using (public.e_admin()) with check (public.e_admin());

revoke execute on function public.crea_profilo_nuovo_utente() from public, anon, authenticated;
revoke execute on function public.blocca_cambio_ruolo() from public, anon, authenticated;
