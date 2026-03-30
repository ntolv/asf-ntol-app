# Migration Structure Supabase - ASF-NTOL

## Constat
Le frontend ASF-NTOL est fonctionnel mais pointe vers un projet Supabase qui n'a pas la structure attendue.
Erreur actuelle : `Could not find the table 'public.utilisateurs' in the schema cache`

## Tables requises par le frontend

### 1. Table `utilisateurs**
```sql
CREATE TABLE public.utilisateurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id),
  membre_id UUID NOT NULL REFERENCES public.membres(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 2. Table `membres`
```sql
CREATE TABLE public.membres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_complet TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  statut_associatif TEXT NOT NULL DEFAULT 'actif',
  categorie TEXT,
  date_adhesion DATE,
  statut TEXT NOT NULL DEFAULT 'actif',
  photo_url TEXT,
  photo_storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 3. Table `contributions`
```sql
CREATE TABLE public.contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  membre_id UUID NOT NULL REFERENCES public.membres(id),
  rubrique TEXT NOT NULL,
  periode DATE NOT NULL,
  montant_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_paye DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_restant DECIMAL(15,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  date_paiement DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 4. Table `montants_attente`
```sql
CREATE TABLE public.montants_attente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  membre_id UUID NOT NULL REFERENCES public.membres(id),
  rubrique TEXT NOT NULL,
  montant_initial DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_restant DECIMAL(15,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 5. Table `retards`
```sql
CREATE TABLE public.retards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  membre_id UUID NOT NULL REFERENCES public.membres(id),
  rubrique TEXT NOT NULL,
  periode DATE NOT NULL,
  montant_attendu DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_paye DECIMAL(15,2) NOT NULL DEFAULT 0,
  reste_a_payer DECIMAL(15,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_retard',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 6. Table `rubriques`
```sql
CREATE TABLE public.rubriques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 7. Table `notifications`
```sql
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  membre_id UUID REFERENCES public.membres(id),
  statut_notification TEXT NOT NULL DEFAULT 'non_lue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 8. Table `documents`
```sql
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  fichier_url TEXT,
  fichier_path TEXT,
  type_fichier TEXT,
  taille_fichier BIGINT,
  dossier_general BOOLEAN DEFAULT false,
  membre_id UUID REFERENCES public.membres(id),
  date_creation DATE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Vues requises par le frontend

### 1. Vue `v_membres`
```sql
CREATE VIEW public.v_membres AS
SELECT 
  m.id,
  m.nom_complet,
  m.email,
  m.telephone,
  m.statut_associatif,
  m.categorie,
  m.date_adhesion,
  m.statut,
  m.photo_url,
  m.photo_storage_path,
  m.created_at,
  m.updated_at
FROM public.membres m
ORDER BY m.nom_complet;
```

### 2. Vue `v_contributions`
```sql
CREATE VIEW public.v_contributions AS
SELECT 
  c.id,
  c.membre_id,
  c.rubrique,
  c.periode,
  c.montant_total,
  c.montant_paye,
  c.montant_restant,
  c.statut,
  c.date_paiement,
  c.created_at,
  c.updated_at
FROM public.contributions c
ORDER BY c.periode DESC;
```

### 3. Vue `v_montants_attente`
```sql
CREATE VIEW public.v_montants_attente AS
SELECT 
  ma.id,
  ma.membre_id,
  ma.rubrique,
  ma.montant_initial,
  ma.montant_restant,
  ma.statut,
  ma.date,
  ma.created_at,
  ma.updated_at
FROM public.montants_attente ma
ORDER BY ma.date DESC;
```

### 4. Vue `v_retards`
```sql
CREATE VIEW public.v_retards AS
SELECT 
  r.id,
  r.membre_id,
  r.rubrique,
  r.periode,
  r.montant_attendu,
  r.montant_paye,
  r.reste_a_payer,
  r.statut,
  r.created_at,
  r.updated_at
FROM public.retards r
ORDER BY r.periode DESC;
```

### 5. Vue `v_documents`
```sql
CREATE VIEW public.v_documents AS
SELECT 
  d.id,
  d.titre,
  d.description,
  d.fichier_url,
  d.fichier_path,
  d.type_fichier,
  d.taille_fichier,
  d.dossier_general,
  d.membre_id,
  d.date_creation,
  d.created_at,
  d.updated_at
FROM public.documents d
ORDER BY d.date_creation DESC;
```

## Buckets Storage requis

### 1. Bucket `membres-photos`
- **Type** : Public
- **Usage** : Stockage des photos de profil des membres
- **Structure** : `{membre_id}/{timestamp}-{filename}`
- **Permissions** : Upload public pour les utilisateurs authentifiés

## Policies RLS requises

### 1. Table `utilisateurs`
```sql
-- Users can read their own record
CREATE POLICY "Users can view own utilisateur" ON public.utilisateurs
FOR SELECT USING (auth.uid() = auth_user_id);

-- Users can update their own record
CREATE POLICY "Users can update own utilisateur" ON public.utilisateurs
FOR UPDATE USING (auth.uid() = auth_user_id);
```

### 2. Table `membres`
```sql
-- All authenticated users can read membres
CREATE POLICY "Authenticated users can view membres" ON public.membres
FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own photo
CREATE POLICY "Users can update own photo" ON public.membres
FOR UPDATE USING (auth.uid() IN (
  SELECT auth_user_id FROM public.utilisateurs WHERE membre_id = id
));
```

### 3. Tables `contributions`, `montants_attente`, `retards`
```sql
-- Users can read their own data
CREATE POLICY "Users can view own data" ON public.contributions
FOR SELECT USING (membre_id IN (
  SELECT id FROM public.membres WHERE auth.uid() IN (
    SELECT auth_user_id FROM public.utilisateurs WHERE membre_id = id
  )
));

-- Similar policies for montants_attente and retards
```

### 4. Bucket `membres-photos`
```sql
-- Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'membres-photos' AND 
  auth.role() = 'authenticated'
);

-- Public access to photos
CREATE POLICY "Public photos access" ON storage.objects
FOR SELECT USING (bucket_id = 'membres-photos');
```

## Plan de migration

### Étape 1 : Création des tables
1. Exécuter les scripts SQL des tables ci-dessus
2. Vérifier que toutes les tables sont créées

### Étape 2 : Création des vues
1. Exécuter les scripts SQL des vues ci-dessus
2. Vérifier que toutes les vues fonctionnent

### Étape 3 : Configuration RLS
1. Activer RLS sur toutes les tables
2. Appliquer les policies ci-dessus
3. Tester les permissions

### Étape 4 : Configuration Storage
1. Créer le bucket `membres-photos`
2. Configurer les policies du bucket
3. Tester l'upload

### Étape 5 : Test complet
1. Redémarrer le frontend
2. Tester toutes les pages
3. Vérifier que tout fonctionne

## Données de test

### Rubriques à insérer
```sql
INSERT INTO public.rubriques (nom, description) VALUES
('Tontine', 'Cotisation tontine mensuelle'),
('Épargne', 'Fonds d''épargne personnelle'),
('Solidarité', 'Fonds de solidarité associative'),
('Fonds Développement / Investissement', 'Fonds pour le développement'),
('Fonds Fonctionnement', 'Fonds de fonctionnement de l''association'),
('Bureau', 'Cotisation bureau'),
('AGA', 'Assemblée Générale Annuelle');
```

## Validation finale

Après migration, vérifier :
1. ✅ Page Dashboard fonctionne
2. ✅ Page Membres fonctionne
3. ✅ Upload photo membre fonctionne
4. ✅ Page Contributions fonctionne
5. ✅ Toutes les vues retournent des données
6. ✅ Permissions RLS respectées
