-- Retiramos a Breve conservando sus referencias históricas y estadísticas.
update public.players
set status = 'INACTIVE', updated_at = now()
where lower(trim(name)) = 'breve';
