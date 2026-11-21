-- Assistente AI (Edge Function assistente): contatore delle domande giornaliere per utente.
-- Si salva solo quante domande ha fatto l'utente nel giorno (ora italiana), mai il testo.
-- La riga si cancella con l'account (on delete cascade).

create table if not exists public.uso_assistente (
  utente_id uuid not null references auth.users(id) on delete cascade,
  giorno    date not null default ((now() at time zone 'Europe/Rome')::date),
  domande   integer not null default 0,
  primary key (utente_id, giorno)
);

comment on table public.uso_assistente is
  'Domande fatte all''assistente AI per utente e giorno (ora italiana): base del limite giornaliero. Nessun testo salvato.';

alter table public.uso_assistente enable row level security;

drop policy if exists "uso_assistente: lettura propria" on public.uso_assistente;
create policy "uso_assistente: lettura propria"
  on public.uso_assistente for select
  to authenticated
  using ((select auth.uid()) = utente_id);

-- Incrementa il contatore dell'utente corrente e dice se è ancora entro il limite
create or replace function public.consuma_domanda_assistente(limite integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  n integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into uso_assistente (utente_id, giorno, domande)
  values (auth.uid(), oggi, 1)
  on conflict (utente_id, giorno)
  do update set domande = uso_assistente.domande + 1
  returning domande into n;

  return n <= limite;
end;
$$;

revoke all on function public.consuma_domanda_assistente(integer) from public, anon;
grant execute on function public.consuma_domanda_assistente(integer) to authenticated;
