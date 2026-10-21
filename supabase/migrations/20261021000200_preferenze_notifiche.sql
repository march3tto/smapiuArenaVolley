-- Preferenze delle notifiche per dispositivo, scelte in Impostazioni: la function invia-notifica manda
-- ogni tipo solo ai dispositivi che l'hanno attivato (prima partivano tutte a tutti i token attivi).
-- notifiche_attive = false: il dispositivo resta registrato ma non riceve nulla.
-- Da eseguire in Supabase > SQL Editor, prima di pubblicare la nuova versione di invia-notifica.

alter table public.push_token
  add column if not exists notifiche_attive boolean not null default true,
  add column if not exists inizio_partita boolean not null default true,
  add column if not exists fine_set boolean not null default true,
  add column if not exists risultato_finale boolean not null default true,
  add column if not exists contenuti boolean not null default true;

comment on column public.push_token.notifiche_attive is 'Interruttore generale di Impostazioni: false = nessuna notifica';
comment on column public.push_token.inizio_partita is 'Promemoria pre-partita e inizio partita';
comment on column public.push_token.fine_set is 'Fine di ogni set (tranne quello decisivo)';
comment on column public.push_token.risultato_finale is 'Set decisivo con il risultato finale';
comment on column public.push_token.contenuti is 'Nuove news, video e podcast';

-- Aggiorna le preferenze del dispositivo (anche senza login): si riconosce dal token, che conosce solo il dispositivo
create or replace function public.preferenze_push_token(
  p_token text, p_attive boolean, p_inizio boolean, p_set boolean, p_finale boolean, p_contenuti boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^\]]{1,200}\]$' then
    raise exception 'Token push non valido';
  end if;
  update public.push_token
     set notifiche_attive = coalesce(p_attive, notifiche_attive),
         inizio_partita = coalesce(p_inizio, inizio_partita),
         fine_set = coalesce(p_set, fine_set),
         risultato_finale = coalesce(p_finale, risultato_finale),
         contenuti = coalesce(p_contenuti, contenuti),
         aggiornato_il = now()
   where token = p_token;
end; $$;

revoke execute on function public.preferenze_push_token(text, boolean, boolean, boolean, boolean, boolean) from public;
grant execute on function public.preferenze_push_token(text, boolean, boolean, boolean, boolean, boolean) to anon, authenticated;
