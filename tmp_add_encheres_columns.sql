ALTER TABLE tontine_sessions
ADD COLUMN IF NOT EXISTS date_debut_encheres timestamptz;

ALTER TABLE tontine_sessions
ADD COLUMN IF NOT EXISTS duree_par_lot_minutes integer;

ALTER TABLE tontine_sessions
ADD COLUMN IF NOT EXISTS lot_en_cours_index integer DEFAULT 1;

ALTER TABLE tontine_sessions
ADD COLUMN IF NOT EXISTS statut_encheres text DEFAULT 'NON_DEMARRE';

-- sécurité valeur autorisée
ALTER TABLE tontine_sessions
ADD CONSTRAINT IF NOT EXISTS tontine_sessions_statut_encheres_check
CHECK (statut_encheres IN ('NON_DEMARRE','EN_COURS','TERMINE'));
