ALTER TABLE public.tontine_sessions
ADD COLUMN IF NOT EXISTS date_debut_encheres timestamptz;

ALTER TABLE public.tontine_sessions
ADD COLUMN IF NOT EXISTS duree_par_lot_minutes integer;

ALTER TABLE public.tontine_sessions
ADD COLUMN IF NOT EXISTS lot_en_cours_index integer DEFAULT 1;

ALTER TABLE public.tontine_sessions
ADD COLUMN IF NOT EXISTS statut_encheres text DEFAULT 'NON_DEMARRE';
