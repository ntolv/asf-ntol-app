select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conname = 'tontine_cycles_statut_check';
