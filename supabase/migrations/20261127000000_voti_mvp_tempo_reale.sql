-- Voti MVP in tempo reale.
-- voti_mvp è leggibile solo riga per riga dal proprio autore (voti_mvp_lettura_propri): Realtime non può quindi
-- avvisare gli altri utenti dei voti nuovi. Qui un trigger tiene il totale per partita e giocatrice in una tabella
-- pubblica (gli stessi numeri che già restituisce voti_mvp_partita), pubblicata su Realtime: l'app riceve ogni
-- variazione del conteggio senza ricaricare.

create table public.voti_mvp_conteggi (
  partita_id uuid not null references public.partite(id) on delete cascade,
  giocatrice_id uuid not null references public.giocatrici(id) on delete cascade,
  voti integer not null default 0 check (voti >= 0),
  primary key (partita_id, giocatrice_id)
);

alter table public.voti_mvp_conteggi enable row level security;

-- solo lettura per tutti: si scrive soltanto dal trigger (security definer)
create policy voti_mvp_conteggi_lettura on public.voti_mvp_conteggi for select to anon, authenticated using (true);
grant select on public.voti_mvp_conteggi to anon, authenticated;

create function public.voti_mvp_aggiorna_conteggi() returns trigger
  language plpgsql security definer
  set search_path to ''
  as $$
begin
  -- voto tolto o spostato: -1 alla giocatrice di prima (le righe restano a 0, così Realtime manda sempre un UPDATE)
  if tg_op in ('DELETE', 'UPDATE') then
    update public.voti_mvp_conteggi
      set voti = greatest(voti - 1, 0)
      where partita_id = old.partita_id and giocatrice_id = old.giocatrice_id;
  end if;
  -- voto nuovo o spostato: +1 alla giocatrice scelta (atomico anche con voti contemporanei)
  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.voti_mvp_conteggi (partita_id, giocatrice_id, voti)
      values (new.partita_id, new.giocatrice_id, 1)
      on conflict (partita_id, giocatrice_id) do update set voti = public.voti_mvp_conteggi.voti + 1;
  end if;
  return null;
end;
$$;

revoke all on function public.voti_mvp_aggiorna_conteggi() from public, anon, authenticated;

-- un UPDATE che non cambia giocatrice (es. solo aggiornato_il) non tocca i conteggi
create trigger voti_mvp_conteggi_ins after insert on public.voti_mvp
  for each row execute function public.voti_mvp_aggiorna_conteggi();
create trigger voti_mvp_conteggi_upd after update of partita_id, giocatrice_id on public.voti_mvp
  for each row when (old.partita_id is distinct from new.partita_id or old.giocatrice_id is distinct from new.giocatrice_id)
  execute function public.voti_mvp_aggiorna_conteggi();
create trigger voti_mvp_conteggi_del after delete on public.voti_mvp
  for each row execute function public.voti_mvp_aggiorna_conteggi();

-- conteggi dei voti già espressi
insert into public.voti_mvp_conteggi (partita_id, giocatrice_id, voti)
  select partita_id, giocatrice_id, count(*) from public.voti_mvp group by partita_id, giocatrice_id;

alter publication supabase_realtime add table public.voti_mvp_conteggi;
