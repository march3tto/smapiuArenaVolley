-- Registro anonimo delle cancellazioni di account (Edge Functions elimina-account e facebook-eliminazione-dati).
-- Nessuna email né nome: solo l'id dell'utente eliminato, i provider collegati e il codice di conferma
-- (mostrato a Meta e all'utente, consultabile con la function stato-eliminazione).

begin;

create table public.account_eliminati (
  id uuid primary key default gen_random_uuid(),
  -- null = richiesta da Facebook per un utente che non aveva un account nell'app (niente da eliminare)
  utente_eliminato_id uuid,
  provider text[] not null default '{}',
  origine text not null check (origine in ('app', 'facebook_callback', 'staff')),
  codice_conferma text not null unique,
  eliminato_il timestamptz not null default now()
);

alter table public.account_eliminati enable row level security;

-- lettura solo staff; nessuna scrittura dal client (le function usano il service role)
create policy account_eliminati_lettura_staff on public.account_eliminati
  for select to authenticated using (public.e_staff());

revoke all on public.account_eliminati from anon, authenticated;
grant select on public.account_eliminati to authenticated;

-- Utente Supabase collegato a un'identità esterna (es. Facebook: provider_id = user_id app-scoped del signed_request).
-- auth.identities non è esposto dalle API: la function lo legge con questa RPC, riservata al service role.
create or replace function public.utente_da_identita(p_provider text, p_provider_id text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from auth.identities where provider = p_provider and provider_id = p_provider_id limit 1;
$$;

revoke execute on function public.utente_da_identita(text, text) from public, anon, authenticated;
grant execute on function public.utente_da_identita(text, text) to service_role;

commit;

-- Conservazione dichiarata nell'informativa (pagine/privacy, punto 8): 3 anni. Ogni notte alle 3:15.
select cron.schedule('pulizia-account-eliminati', '15 3 * * *',
  $$delete from public.account_eliminati where eliminato_il < now() - interval '3 years'$$);
