-- Reconcile legacy protection dates with the actual acquisition timestamp.
update public.fantasy_roster_players
set clause_protected_until = acquired_at + interval '7 days'
where acquired_at is not null;
