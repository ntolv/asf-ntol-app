-- VÉRIFICATION ÉTAT ACTUEL DES POLICIES RLS
-- Script de diagnostic pour la table membres

-- 1. Vérifier si RLS est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'membres' AND schemaname = 'public';

-- 2. Lister toutes les policies existantes sur membres
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'membres' AND schemaname = 'public';

-- 3. Vérifier les colonnes de la table membres
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'membres' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Test de permissions pour l'utilisateur actuel
SELECT 
  current_user as utilisateur_actuel,
  has_table_privilege('public', 'membres', 'SELECT') as peut_lire,
  has_table_privilege('public', 'membres', 'UPDATE') as peut_modifier,
  has_table_privilege('public', 'membres', 'INSERT') as peut_inserer;
