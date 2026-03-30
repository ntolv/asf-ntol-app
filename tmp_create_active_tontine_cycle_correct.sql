-- 1) Désactiver les cycles actifs existants
update public.tontine_cycles
set actif = false,
    updated_at = now()
where actif = true;

-- 2) Créer un cycle actif correct
insert into public.tontine_cycles (
  id,
  code,
  libelle,
  date_debut,
  date_fin,
  annee_reference,
  nb_sessions_prevues,
  statut_cycle,
  actif
)
values (
  gen_random_uuid(),
  'TONTINE-2026',
  'Cycle Tontine 2026',
  '2026-01-01',
  '2026-12-31',
  2026,
  12,
  'ACTIF',
  true
);

-- 3) Vérification
select
  id,
  code,
  libelle,
  statut_cycle,
  actif
from public.tontine_cycles
order by created_at desc
limit 5;
