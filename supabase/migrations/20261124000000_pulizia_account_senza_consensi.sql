--
-- Pulizia degli account mai completati.
--
-- Chi entra con Apple (o Google/Facebook) viene creato da Supabase al primo accesso, prima dell'onboarding consensi.
-- Se chiude l'app senza accettare, l'account resta con email e nome ma senza consensi e non può usare l'app.
-- Lo stesso vale per chi si registra con email e non conferma mai l'indirizzo.
--
-- Regola: ogni notte si eliminano gli account creati da più di 7 giorni che non hanno MAI accettato l'informativa
-- (nessuna riga informativa_privacy con concesso = true, in qualsiasi versione). Chi l'aveva accettata in una versione
-- precedente è un utente vero in attesa di rivedere l'informativa aggiornata e non viene toccato.
-- Staff e admin non vengono mai eliminati.
--
-- Come elimina-account: delete da auth.users (a cascata identità, profili, consensi_utente, push_token, ...) e una
-- riga anonima in account_eliminati con origine 'automatica'. Nessun file nello Storage da eliminare (vedi
-- _shared/eliminazione-account.ts). La revoca Sign in with Apple non è possibile: serve un codice che solo l'app
-- può ottenere; l'utente la vede ancora in Impostazioni > Accedi con Apple e può rimuoverla da lì.
--

alter table public.account_eliminati drop constraint account_eliminati_origine_check;
alter table public.account_eliminati add constraint account_eliminati_origine_check
  check (origine = any (array['app'::text, 'facebook_callback'::text, 'staff'::text, 'automatica'::text]));

create or replace function public.elimina_account_senza_consensi(giorni integer default 7)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
  eliminati integer := 0;
begin
  for u in
    select au.id,
      coalesce((select array_agg(distinct i.provider order by i.provider) from auth.identities i where i.user_id = au.id), '{}') as provider
    from auth.users au
    left join public.profili p on p.id = au.id
    where au.created_at < now() - make_interval(days => giorni)
      and coalesce(p.ruolo, 'pubblico') = 'pubblico'
      and not exists (
        select 1 from public.consensi_utente c
        where c.utente_id = au.id and c.tipo = 'informativa_privacy' and c.concesso
      )
  loop
    -- un account che non si riesce a eliminare non blocca gli altri
    begin
      delete from auth.users where id = u.id;
      insert into public.account_eliminati (utente_eliminato_id, provider, origine, codice_conferma)
      values (u.id, u.provider, 'automatica', upper(encode(extensions.gen_random_bytes(8), 'hex')));
      eliminati := eliminati + 1;
    exception when others then
      raise warning 'elimina_account_senza_consensi: account % non eliminato: %', u.id, sqlerrm;
    end;
  end loop;
  return eliminati;
end;
$$;

comment on function public.elimina_account_senza_consensi(integer) is
  'Elimina gli account pubblici creati da più di N giorni che non hanno mai accettato l''informativa (job pulizia-account-senza-consensi)';

revoke all on function public.elimina_account_senza_consensi(integer) from public, anon, authenticated;

select cron.schedule('pulizia-account-senza-consensi', '0 3 * * *', 'select public.elimina_account_senza_consensi();');
