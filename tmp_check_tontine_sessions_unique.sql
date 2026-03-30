select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conname = 'tontine_sessions_unique';

select
  id,
  cycle_id,
  libelle,
  periode_reference,
  ordre_session,
  statut_session
from public.tontine_sessions
order by created_at desc
limit 20;
