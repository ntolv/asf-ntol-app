-- =========================================================
-- REALIGNEMENT REGLE SESSION - CORRECTION COMPLETE
-- Nettoyage ancien modèle + recréation propre
-- =========================================================

-- ---------------------------------------------------------
-- 1) INDEX METIER
-- Un membre ne peut gagner qu’un seul lot dans une session
-- ---------------------------------------------------------
create unique index if not exists ux_tontine_gagnants_session_membre
on public.tontine_gagnants (session_id, membre_id);

drop index if exists public.ux_tontine_gagnants_cycle_membre;

-- ---------------------------------------------------------
-- 2) DROP ANCIENNES ET NOUVELLES VUES DANS LE BON ORDRE
-- ---------------------------------------------------------
drop view if exists public.v_tontine_anomalies_gains_multiples_session;
drop view if exists public.v_tontine_anomalies_gains_multiples;
drop view if exists public.v_tontine_resultats_membres_sessions;
drop view if exists public.v_tontine_resultats_membres_cycles;
drop view if exists public.v_tontine_resultats_membres;
drop view if exists public.v_tontine_resultats_cycles;
drop view if exists public.v_tontine_resultats_lots;

-- ---------------------------------------------------------
-- 3) VUE DETAILLEE DES LOTS GAGNES
-- ---------------------------------------------------------
create view public.v_tontine_resultats_lots as
select
  s.cycle_id,
  s.id as session_id,
  s.libelle as session_libelle,
  s.periode_reference,
  s.ordre_session,
  l.id as lot_id,
  l.numero_lot,
  coalesce(l.libelle, 'Lot ' || l.numero_lot::text) as lot_libelle,
  l.statut_lot,
  l.gagnant_membre_id as membre_id,
  m.nom_complet,
  l.montant_depart_enchere,
  l.mise_brute_lot,
  l.montant_total_relances,
  l.gain_reel,
  l.date_ouverture,
  l.date_cloture,
  row_number() over (
    partition by s.id, l.gagnant_membre_id
    order by l.numero_lot asc
  ) as rang_gain_dans_session
from public.tontine_lots l
join public.tontine_sessions s
  on s.id = l.session_id
left join public.membres m
  on m.id = l.gagnant_membre_id
where l.gagnant_membre_id is not null;

-- ---------------------------------------------------------
-- 4) RESULTATS PAR MEMBRE / PAR SESSION
-- ---------------------------------------------------------
create view public.v_tontine_resultats_membres_sessions as
select
  r.cycle_id,
  r.session_id,
  r.session_libelle,
  r.periode_reference,
  r.ordre_session,
  r.membre_id,
  r.nom_complet,
  count(*) as total_lots_gagnes_session,
  sum(coalesce(r.mise_brute_lot, 0)) as mise_brute_totale_gagnee_session,
  sum(coalesce(r.montant_total_relances, 0)) as total_relances_session,
  sum(coalesce(r.gain_reel, 0)) as gain_reel_total_session,
  max(r.date_cloture) as derniere_date_cloture_session
from public.v_tontine_resultats_lots r
group by
  r.cycle_id,
  r.session_id,
  r.session_libelle,
  r.periode_reference,
  r.ordre_session,
  r.membre_id,
  r.nom_complet;

-- ---------------------------------------------------------
-- 5) RESULTATS PAR MEMBRE / PAR CYCLE
-- Vue de synthèse globale, sans imposer la règle au cycle
-- ---------------------------------------------------------
create view public.v_tontine_resultats_membres_cycles as
select
  r.cycle_id,
  r.membre_id,
  r.nom_complet,
  count(*) as total_lots_gagnes_cycle,
  count(distinct r.session_id) as total_sessions_gagnees_cycle,
  sum(coalesce(r.mise_brute_lot, 0)) as mise_brute_totale_gagnee_cycle,
  sum(coalesce(r.montant_total_relances, 0)) as total_relances_cycle,
  sum(coalesce(r.gain_reel, 0)) as gain_reel_total_cycle,
  min(r.ordre_session) as premiere_session_gagnee,
  max(r.ordre_session) as derniere_session_gagnee,
  max(r.date_cloture) as derniere_date_cloture
from public.v_tontine_resultats_lots r
group by
  r.cycle_id,
  r.membre_id,
  r.nom_complet;

-- ---------------------------------------------------------
-- 6) VUE AUDIT : anomalie = plusieurs lots gagnés
-- dans la même session
-- Cette vue doit rester vide
-- ---------------------------------------------------------
create view public.v_tontine_anomalies_gains_multiples_session as
select
  cycle_id,
  session_id,
  session_libelle,
  periode_reference,
  ordre_session,
  membre_id,
  nom_complet,
  total_lots_gagnes_session,
  mise_brute_totale_gagnee_session,
  total_relances_session,
  gain_reel_total_session
from public.v_tontine_resultats_membres_sessions
where total_lots_gagnes_session > 1;

-- ---------------------------------------------------------
-- 7) VUE SYNTHESE PAR CYCLE
-- ---------------------------------------------------------
create view public.v_tontine_resultats_cycles as
select
  s.cycle_id,
  count(distinct s.id) as total_sessions,
  count(distinct l.id) as total_lots,
  count(distinct l.gagnant_membre_id) filter (where l.gagnant_membre_id is not null) as total_gagnants_uniques,
  sum(coalesce(l.mise_brute_lot, 0)) as mise_brute_totale,
  sum(coalesce(l.montant_total_relances, 0)) as relances_totales,
  sum(coalesce(l.gain_reel, 0)) as gains_reels_totaux
from public.tontine_sessions s
left join public.tontine_lots l
  on l.session_id = s.id
group by s.cycle_id;

-- ---------------------------------------------------------
-- 8) FN_ENCHERIR REALIGNEE SESSION
-- ---------------------------------------------------------
create or replace function public.fn_encherir(
  p_lot_id uuid,
  p_membre_id uuid,
  p_montant_relance numeric,
  p_commentaire text default null
)
returns table (
  success boolean,
  message text,
  session_id uuid,
  lot_id uuid,
  membre_id uuid,
  statut_session text,
  statut_lot text,
  montant_depart numeric,
  montant_actuel numeric,
  montant_relance numeric,
  nouveau_montant_total numeric,
  total_relances_lot numeric
)
language plpgsql
security definer
as $fn$
declare
  v_session_id uuid;
  v_cycle_id uuid;
  v_statut_session text;
  v_statut_lot text;
  v_montant_depart numeric := 0;
  v_best numeric := 0;
  v_total numeric := 0;
  v_total_relances_lot numeric := 0;
  v_mise_brute_lot numeric := 0;
  v_lock_key bigint;
begin
  if p_lot_id is null then
    return query
    select false, 'Lot obligatoire', null::uuid, null::uuid, null::uuid, null::text, null::text,
           null::numeric, null::numeric, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  if p_membre_id is null then
    return query
    select false, 'Membre obligatoire', null::uuid, p_lot_id, null::uuid, null::text, null::text,
           null::numeric, null::numeric, null::numeric, null::numeric, null::numeric;
    return;
  end if;

  if p_montant_relance is null or p_montant_relance <= 0 then
    return query
    select false, 'Montant de relance invalide', null::uuid, p_lot_id, p_membre_id, null::text, null::text,
           null::numeric, null::numeric, p_montant_relance, null::numeric, null::numeric;
    return;
  end if;

  if p_montant_relance < 500 then
    return query
    select false, 'Le renchérissement minimum est de 500 FCFA', null::uuid, p_lot_id, p_membre_id, null::text, null::text,
           null::numeric, null::numeric, p_montant_relance, null::numeric, null::numeric;
    return;
  end if;

  v_lock_key := ('x' || substr(md5(p_lot_id::text), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_key);

  select
    l.session_id,
    l.statut_lot,
    coalesce(l.montant_depart_enchere, 0),
    coalesce(l.mise_brute_lot, 0)
  into
    v_session_id,
    v_statut_lot,
    v_montant_depart,
    v_mise_brute_lot
  from public.tontine_lots l
  where l.id = p_lot_id
  for update;

  if not found then
    return query
    select false, 'Lot introuvable', null::uuid, p_lot_id, p_membre_id, null::text, null::text,
           null::numeric, null::numeric, p_montant_relance, null::numeric, null::numeric;
    return;
  end if;

  select
    s.cycle_id,
    s.statut_encheres
  into
    v_cycle_id,
    v_statut_session
  from public.tontine_sessions s
  where s.id = v_session_id
  for update;

  if not found then
    return query
    select false, 'Session introuvable', v_session_id, p_lot_id, p_membre_id, null::text, v_statut_lot,
           v_montant_depart, null::numeric, p_montant_relance, null::numeric, null::numeric;
    return;
  end if;

  if v_statut_session <> 'EN_COURS' then
    return query
    select false, 'Enchères non actives', v_session_id, p_lot_id, p_membre_id, v_statut_session, v_statut_lot,
           v_montant_depart, null::numeric, p_montant_relance, null::numeric, null::numeric;
    return;
  end if;

  if v_statut_lot not in ('OUVERT', 'EN_COURS') then
    return query
    select false, 'Lot non actif', v_session_id, p_lot_id, p_membre_id, v_statut_session, v_statut_lot,
           v_montant_depart, null::numeric, p_montant_relance, null::numeric, null::numeric;
    return;
  end if;

  select coalesce(max(e.montant_total_offert), 0)
  into v_best
  from public.tontine_encheres e
  where e.lot_id = p_lot_id;

  if v_best <= 0 then
    v_best := v_montant_depart;
  end if;

  v_total := v_best + p_montant_relance;
  v_total_relances_lot := greatest(v_total - v_montant_depart, 0);

  insert into public.tontine_encheres (
    lot_id,
    session_id,
    cycle_id,
    membre_id,
    montant_relance,
    montant_total_offert,
    statut_enchere,
    date_enchere
  )
  values (
    p_lot_id,
    v_session_id,
    v_cycle_id,
    p_membre_id,
    p_montant_relance,
    v_total,
    'ACTIVE',
    now()
  );

  perform public.fn_tontine_post_enchere(p_lot_id);

  update public.tontine_sessions
  set
    derniere_enchere_at = now(),
    updated_at = now()
  where id = v_session_id;

  update public.tontine_lots
  set
    montant_total_relances = v_total_relances_lot,
    gain_reel = greatest(v_mise_brute_lot - v_total, 0),
    updated_at = now()
  where id = p_lot_id;

  return query
  select
    true,
    'Enchère acceptée',
    v_session_id,
    p_lot_id,
    p_membre_id,
    v_statut_session,
    v_statut_lot,
    v_montant_depart,
    v_best,
    p_montant_relance,
    v_total,
    v_total_relances_lot;
end;
$fn$;

-- ---------------------------------------------------------
-- 9) CONTROLES
-- ---------------------------------------------------------
-- doit être vide :
-- select * from public.v_tontine_anomalies_gains_multiples_session;

-- résultats par session :
-- select * from public.v_tontine_resultats_membres_sessions
-- order by cycle_id desc, ordre_session asc, nom_complet asc;

-- résultats par cycle :
-- select * from public.v_tontine_resultats_membres_cycles
-- order by cycle_id desc, gain_reel_total_cycle desc;

-- détail lots gagnés :
-- select * from public.v_tontine_resultats_lots
-- order by cycle_id desc, ordre_session asc, numero_lot asc;
