-- POLICIES RLS POUR TABLE MEMBRES - ASF-NTOL
-- Permettre aux utilisateurs authentifiés de mettre à jour leur photo

-- Policy pour UPDATE (modification de photo_url et photo_storage_path)
DROP POLICY IF EXISTS "Allow authenticated update membres" ON public.membres;
CREATE POLICY "Allow authenticated update membres" ON public.membres
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy pour SELECT (lecture des membres)
DROP POLICY IF EXISTS "Allow authenticated select membres" ON public.membres;
CREATE POLICY "Allow authenticated select membres" ON public.membres
FOR SELECT
TO authenticated
USING (true);

-- Vérification des policies existantes
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

-- Activer RLS sur la table si pas déjà fait
ALTER TABLE public.membres ENABLE ROW LEVEL SECURITY;
