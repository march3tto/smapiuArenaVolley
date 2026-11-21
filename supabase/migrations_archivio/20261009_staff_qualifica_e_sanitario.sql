-- Dicitura mostrata nell'app (es. "Primo Allenatore"); il ruolo resta la categoria generale
alter table public.staff add column if not exists qualifica text;
-- Fisioterapisti, massaggiatori, medici
alter type public.ruolo_staff add value if not exists 'staff_sanitario';
