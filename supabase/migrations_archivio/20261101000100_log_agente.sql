-- Log dell'agente livescore (a3live): eventi leggibili da staff/admin nell'app.
-- Scrive solo l'agente con la chiave service_role (bypassa la RLS).
create table if not exists public.log_agente (
  id bigint generated always as identity primary key,
  creato_il timestamptz not null default now(),
  agente text not null,
  livello text not null default 'info' check (livello in ('info', 'avviso', 'errore')),
  evento text not null,
  partita_id uuid references public.partite(id) on delete set null,
  numero_gara integer,
  messaggio text not null,
  dettagli jsonb
);

comment on table public.log_agente is 'Eventi dell''agente livescore a3live (mac, zima): avvio, finestra aperta/chiusa, aggiornamenti scritti, battito, feed fermo, errori. Pulizia automatica dopo 60 giorni.';
comment on column public.log_agente.evento is 'avvio, stop, attesa, finestra_aperta, finestra_chiusa, aggiornamento, correzione, battito, feed_fermo, feed_ripartito, feed_mancante, errore';

create index if not exists log_agente_creato_il_idx on public.log_agente (creato_il desc);
create index if not exists log_agente_partita_idx on public.log_agente (partita_id, creato_il desc) where partita_id is not null;

alter table public.log_agente enable row level security;

drop policy if exists log_agente_lettura_staff on public.log_agente;
create policy log_agente_lettura_staff on public.log_agente
  for select to authenticated using (public.e_staff());

revoke insert, update, delete on public.log_agente from anon, authenticated;
grant select on public.log_agente to authenticated;

-- Stato sintetico: ultimo segnale di ogni agente
create or replace view public.stato_agenti with (security_invoker = on) as
select distinct on (agente)
  agente,
  creato_il as ultimo_segnale,
  evento    as ultimo_evento,
  livello   as ultimo_livello,
  messaggio as ultimo_messaggio
from public.log_agente
order by agente, creato_il desc;

revoke all on public.stato_agenti from anon;
grant select on public.stato_agenti to authenticated;

-- Realtime per la schermata admin
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'log_agente'
  ) then
    alter publication supabase_realtime add table public.log_agente;
  end if;
end $$;

-- Pulizia giornaliera dei log oltre i 60 giorni
select cron.unschedule('pulizia-log-agente') where exists (select 1 from cron.job where jobname = 'pulizia-log-agente');
select cron.schedule('pulizia-log-agente', '30 3 * * *', $c$delete from public.log_agente where creato_il < now() - interval '60 days'$c$);
