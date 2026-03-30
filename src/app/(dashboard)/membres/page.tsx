"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";
import { getCurrentMembreId } from "@/lib/getCurrentMembreId";

type MembreData = {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string | null;
  statut_associatif: string;
  est_tontineur_defaut: boolean;
  categorie: string | null;
  actif: boolean;
  created_at: string;
  photo_url?: string | null;
  photo_storage_path?: string | null;
};

export default function MembresPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [membres, setMembres] = useState<MembreData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMembreId, setUploadingMembreId] = useState<string | null>(null);
  const [previewPhotos, setPreviewPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadMembresData() {
      try {
        setLoading(true);
        setError(null);

                const membreId = await withTimeout(
          getCurrentMembreId(),
          5000
        );

        if (!membreId || membreId === "null") {
          throw new Error("Aucun membre lié à l'utilisateur connecté");
        }

        const membresResult = await withTimeout(
          Promise.resolve(
            supabase
              .from("v_membres")
              .select(`
                id,
                nom_complet,
                email,
                categorie,
                telephone,
                statut_associatif,
                est_tontineur_defaut,
                actif,
                created_at,
                date_adhesion,
                photo_url,
                photo_storage_path
              `)
              .order("nom_complet", { ascending: true })
          ),
          5000
        );

        const { data: membresData, error: membresError } = membresResult;

        if (membresError) throw membresError;
        
        console.log('📊 DIAGNOSTIC: Membres chargés:', membresData?.length || 0);
        console.log('📊 DIAGNOSTIC: Détail membres avec photos:', membresData?.filter(m => m.photo_url).map(m => ({ id: m.id, nom: m.nom_complet, photo_url: m.photo_url })));
        
        setMembres(membresData || []);

      } catch (err: any) {
        console.error("Erreur membres:", JSON.stringify(err, null, 2), err);
        setError(err?.message || "Erreur lors du chargement des membres");
      } finally {
        setLoading(false);
      }
    }

    loadMembresData();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getStatutColor = (actif: boolean) => {
    if (actif) {
      return "text-green-700 bg-green-50";
    } else {
      return "text-red-700 bg-red-50";
    }
  };

  const getInitials = (nom: string) => {
    return nom
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, membreId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🔍 DIAGNOSTIC: Fichier sélectionné:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    try {
      setUploadingMembreId(membreId);
      console.log('🚀 DIAGNOSTIC: Début upload pour membre:', membreId);

      // Validation du fichier
      if (!file.type.startsWith('image/')) {
        console.log('❌ DIAGNOSTIC: Type fichier invalide:', file.type);
        alert('Veuillez sélectionner une image valide');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        console.log('❌ DIAGNOSTIC: Fichier trop volumineux:', file.size);
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }

      // ÉTAPE 1: Créer la preview locale IMMÉDIATEMENT
      console.log('🖼️ DIAGNOSTIC: Création preview locale...');
      const previewUrl = URL.createObjectURL(file);
      setPreviewPhotos(prev => ({
        ...prev,
        [membreId]: previewUrl
      }));
      console.log('✅ DIAGNOSTIC: Preview locale créée:', previewUrl);

      // Upload vers Supabase Storage (si bucket existe)
      // Nettoyer le nom du fichier : espaces, accents, caractères spéciaux
      const cleanFileName = file.name
        .replace(/\s+/g, '-')                    // Espaces → tirets
        .replace(/[àáâäåãā]/g, 'a')          // Accents A → a
        .replace(/[éêëè]/g, 'e')              // Accents E → e
        .replace(/[ìíïî]/g, 'i')              // Accents I → i
        .replace(/[óôöòø]/g, 'o')              // Accents O → o
        .replace(/[ùúûü]/g, 'u')              // Accents U → u
        .replace(/[ýÿ]/g, 'y')                // Accents Y → y
        .replace(/[ç]/g, 'c')                    // C cédille → c
        .replace(/[ñ]/g, 'n')                    // N tilde → n
        .replace(/[^a-zA-Z0-9.-]/g, '')        // Garder alphanumérique, tirets, points
        .toLowerCase();
      
      const storagePath = `${membreId}/${Date.now()}-${cleanFileName}`;
      console.log('📁 DIAGNOSTIC: Storage path généré:', storagePath);
      console.log('📁 DIAGNOSTIC: Nom original:', file.name);
      console.log('📁 DIAGNOSTIC: Nom nettoyé:', cleanFileName);
      
      try {
        // TENTATIVE D'UPLOAD VERS SUPABASE STORAGE
        console.log('☁️ DIAGNOSTIC: Tentative upload Supabase Storage...');
        console.log('📦 DIAGNOSTIC: Bucket utilisé:', 'membres-photos');
        console.log('📂 DIAGNOSTIC: Path complet:', storagePath);
        console.log('📄 DIAGNOSTIC: Type fichier:', file.type);
        console.log('📏 DIAGNOSTIC: Taille fichier:', file.size);
        console.log('👤 DIAGNOSTIC: Membre ID:', membreId);
        
        // DIAGNOSTIC: Afficher l'URL Supabase utilisée
        console.log('🌐 DIAGNOSTIC: URL Supabase utilisée:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        
        // Vérifier la session avant upload
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('🔑 DIAGNOSTIC: Session active:', !!sessionData.session);
        
        // ÉTAPE PRÉALABLE: Nettoyer les anciennes photos du membre
        console.log('🧹 DIAGNOSTIC: Nettoyage anciennes photos pour:', membreId);
        const { data: existingFiles } = await supabase.storage
          .from('membres-photos')
          .list(membreId + '/');
        
        if (existingFiles && existingFiles.length > 0) {
          console.log('🗑️ DIAGNOSTIC: Anciens fichiers trouvés:', existingFiles.map(f => f.name));
          const { error: deleteError } = await supabase.storage
            .from('membres-photos')
            .remove(existingFiles.map(f => f.name));
          
          if (deleteError) {
            console.error('❌ DIAGNOSTIC: Erreur suppression anciens fichiers:', deleteError);
          } else {
            console.log('✅ DIAGNOSTIC: Anciens fichiers supprimés:', existingFiles.length);
          }
        }
        
        // Lancer l'upload directement sans pré-contrôle getBucket
        console.log('📤 DIAGNOSTIC: Lancement upload direct...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('membres-photos')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        console.log('📤 DIAGNOSTIC: Résultat upload brut:', { uploadData, uploadError });

        if (uploadError) {
          console.error('❌ DIAGNOSTIC: Erreur upload Supabase:', {
            message: uploadError.message,
            statusCode: (uploadError as any).statusCode,
            error: uploadError
          });
          
          // Analyse spécifique de l'erreur
          if (uploadError.message.includes('Bucket not found')) {
            console.error('🪣 DIAGNOSTIC: Bucket "membres-photos" inexistant dans Supabase Storage');
            console.log('💡 DIAGNOSTIC: Solution: Créer le bucket "membres-photos" dans Supabase Dashboard');
          } else if (uploadError.message.includes('permission')) {
            console.error('🔒 DIAGNOSTIC: Permission refusée pour le bucket');
            console.log('💡 DIAGNOSTIC: Solution: Configurer les policies RLS pour le bucket');
          } else if (uploadError.message.includes('duplicate')) {
            console.error('📋 DIAGNOSTIC: Fichier déjà existant');
            console.log('💡 DIAGNOSTIC: Solution: Utiliser upsert: true ou générer un nom unique');
          }
          
          throw uploadError;
        }

        console.log('✅ DIAGNOSTIC: Upload Supabase réussi:', uploadData);

        // VALIDATION CRITIQUE: Vérifier que uploadData contient bien le chemin réel
        if (!uploadData?.path) {
          console.error('❌ DIAGNOSTIC: UploadData invalide - pas de path trouvé');
          throw new Error('Upload invalide : path manquant');
        }

        console.log('📁 DIAGNOSTIC: Path réel du fichier uploadé:', uploadData.path);

        // ÉTAPE 2: Récupérer l'URL publique UNIQUEMENT depuis uploadData.path
        console.log('🔗 DIAGNOSTIC: Récupération URL publique depuis path réel...');
        const { data: urlData } = supabase.storage
          .from('membres-photos')
          .getPublicUrl(uploadData.path);

        console.log('🔗 DIAGNOSTIC: Données URL brutes:', urlData);

        if (!urlData?.publicUrl) {
          console.error('❌ DIAGNOSTIC: URL publique non générée');
          throw new Error('URL publique non disponible');
        }

        console.log('✅ DIAGNOSTIC: URL publique générée depuis path réel:', urlData.publicUrl);

        // ÉTAPE 3: Mettre à jour la table membres
        console.log('💾 DIAGNOSTIC: Mise à jour table membres...');
        console.log('📊 DIAGNOSTIC: Champs à mettre à jour:', {
          photo_url: urlData.publicUrl,
          photo_storage_path: uploadData.path,
          membre_id: membreId
        });

        // DIAGNOSTIC CRITIQUE: Vérifier la session Supabase avant l'update
        const { data: updateSessionData } = await supabase.auth.getSession();
        console.log('🔑 DIAGNOSTIC: Session avant update membres:', {
          sessionExistante: !!updateSessionData.session,
          userId: updateSessionData.session?.user?.id,
          userEmail: updateSessionData.session?.user?.email,
          role: updateSessionData.session?.user?.role
        });

        if (!updateSessionData.session) {
          console.error('💥 DIAGNOSTIC: Aucune session authentifiée Supabase pour l\'update');
          console.error('💥 DIAGNOSTIC: Client agit probablement en rôle anon au lieu de authenticated');
          throw new Error('Aucune session authentifiée Supabase - impossible de mettre à jour la table membres');
        }

        const { data: updateData, error: updateError } = await supabase
          .from('membres')
          .update({ 
            photo_url: urlData.publicUrl,
            photo_storage_path: uploadData.path 
          })
          .eq('id', membreId)
          .select();

        console.log('📊 DIAGNOSTIC: Résultat update brut:', { updateData, updateError });

        if (updateError) {
          console.error('❌ DIAGNOSTIC: Erreur mise à jour base:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          });
          
          // Analyse spécifique de l'erreur DB
          if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
            console.error('🗄️ DIAGNOSTIC: Colonne manquante dans table membres');
            console.log('💡 DIAGNOSTIC: Solution: Ajouter les colonnes photo_url et photo_storage_path');
          } else if (updateError.message.includes('permission')) {
            console.error('🔒 DIAGNOSTIC: Permission refusée pour table membres');
            console.log('💡 DIAGNOSTIC: Solution: Configurer les policies RLS pour la table');
          }
          
          throw updateError;
        }

        // VALIDATION CRITIQUE: Vérifier que l'update a bien touché une ligne
        if (!updateData || updateData.length === 0) {
          console.error('💥 DIAGNOSTIC: Aucune ligne mise à jour dans la table membres');
          console.error('💥 DIAGNOSTIC: membreId utilisé pour update:', membreId);
          console.error('💥 DIAGNOSTIC: Requête UPDATE exécutée:', {
            table: 'membres',
            where: `id = '${membreId}'`,
            set: {
              photo_url: urlData.publicUrl,
              photo_storage_path: uploadData.path
            }
          });
          throw new Error(`Aucune ligne mise à jour — membreId "${membreId}" incorrect ou inexistant`);
        }

        console.log('✅ DIAGNOSTIC: Base de données mise à jour:', updateData);
        console.log('✅ DIAGNOSTIC: Nombre de lignes affectées:', updateData.length);

        // Mettre à jour l'état local avec la vraie URL SEULEMENT si update réussi
        console.log('🔄 DIAGNOSTIC: Mise à jour état local avec URL:', urlData.publicUrl);
        setMembres(prev => {
          const updatedMembres = prev.map(m => 
            m.id === membreId 
              ? { ...m, photo_url: urlData.publicUrl }
              : m
          );
          console.log('📊 DIAGNOSTIC: Nouvel état membres:', updatedMembres.find(m => m.id === membreId));
          return updatedMembres;
        });

        // Nettoyer la preview locale UNIQUEMENT si update réussi
        setPreviewPhotos(prev => {
          const newPreviews = { ...prev };
          delete newPreviews[membreId];
          console.log('🧹 DIAGNOSTIC: Preview locale nettoyée pour', membreId);
          return newPreviews;
        });

        console.log('🎉 DIAGNOSTIC: Flux upload terminé avec succès COMPLET');
        alert('Photo mise à jour avec succès !');

      } catch (storageError: any) {
        console.error('💥 DIAGNOSTIC: Erreur complète upload:', storageError);
        
        // CONSERVATION DE LA PREVIEW LOCALE SI UPLOAD ÉCHOUE
        console.log('🔄 DIAGNOSTIC: Upload échoué, conservation preview locale...');
        
        // Mettre à jour l'état local avec la preview (temporaire)
        setMembres(prev => prev.map(m => 
          m.id === membreId 
            ? { ...m, photo_url: previewUrl }
            : m
        ));

        console.log('🎭 DIAGNOSTIC: Preview locale conservée (upload échoué)');
        
        // Message d'erreur détaillé pour l'utilisateur
        const errorMessage = storageError.message || 'Erreur inconnue';
        alert(`Photo affichée localement\n\nErreur upload: ${errorMessage}`);
      }

    } catch (error) {
      console.error('💥 DIAGNOSTIC: Erreur générale upload:', error);
      alert('Erreur lors du téléchargement de la photo: ' + (error as Error).message);
    } finally {
      setUploadingMembreId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCameraCapture = async (membreId: string) => {
    try {
      // Vérifier si l'appareil photo est disponible
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!hasCamera) {
        alert('Aucun appareil photo détecté sur cet appareil');
        return;
      }

      // Créer un input file avec capture="camera"
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Appareil photo principal
      input.onchange = (e) => {
        const event = e as any;
        handleFileUpload(event, membreId);
      };
      input.click();

    } catch (error) {
      console.error('Erreur camera:', error);
      alert('Impossible d\'accéder à l\'appareil photo');
    }
  };

  // Fonction utilitaire pour obtenir l'URL d'affichage avec priorité
  const getDisplayPhotoUrl = (membre: MembreData) => {
    // Priorité 1: Preview locale (immédiate)
    if (previewPhotos[membre.id]) {
      console.log('🖼️ AFFICHAGE: Utilisation preview locale pour', membre.id, previewPhotos[membre.id]);
      return previewPhotos[membre.id];
    }
    
    // Priorité 2: Photo_url de la base (persistée)
    if (membre.photo_url) {
      console.log('🖼️ AFFICHAGE: Utilisation photo_url pour', membre.id, membre.photo_url);
      return membre.photo_url;
    }
    
    // Priorité 3: Pas de photo (avatar)
    console.log('🖼️ AFFICHAGE: Aucune photo pour', membre.id, '→ avatar');
    return null;
  };

  if (loading) {
    return (
      <main className="p-4 md:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Chargement des membres...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-4 md:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="font-semibold">Erreur lors du chargement des données</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-slate-900">Membres</h1>
          <p className="mt-2 text-slate-600">
            Consultez la liste complète des membres de l'association.
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Liste des membres ({membres.length})
            </h2>
          </div>

          {membres.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucun membre trouvé.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {membres.map((membre) => (
                <div 
                  key={membre.id} 
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Zone Photo/Avatar */}
                  <div className="mb-4 flex flex-col items-center">
                    <div className="relative">
                      {getDisplayPhotoUrl(membre) ? (
                        <img
                          src={getDisplayPhotoUrl(membre)!}
                          alt={`${membre.nom_complet}`}
                          className="h-24 w-24 rounded-full object-cover border-4 border-slate-100 shadow-md"
                          onLoad={() => console.log('🖼️ AFFICHAGE: Image chargée avec succès pour', membre.id)}
                          onError={() => console.error('❌ AFFICHAGE: Erreur chargement image pour', membre.id, getDisplayPhotoUrl(membre))}
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 text-3xl font-bold text-white shadow-md">
                          {getInitials(membre.nom_complet)}
                        </div>
                      )}
                      
                      {/* Bouton upload photo */}
                      <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <button
                          onClick={() => {
                            // Stocker l'ID du membre pour l'upload
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute('data-membre-id', membre.id);
                            }
                            fileInputRef.current?.click();
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white shadow-md transition-colors hover:bg-green-700"
                          title="Importer une photo"
                        >
                          📷
                        </button>
                        <button
                          onClick={() => handleCameraCapture(membre.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700"
                          title="Prendre une photo"
                        >
                          📱
                        </button>
                      </div>
                    </div>

                    {/* Indicateur de chargement upload */}
                    {uploadingMembreId === membre.id && (
                      <div className="mt-2 text-xs text-green-600">
                        Téléchargement en cours...
                      </div>
                    )}
                  </div>

                  {/* Informations du membre */}
                  <div className="space-y-3">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {membre.nom_complet}
                      </h3>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatutColor(membre.actif)}`}>
                        {membre.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-slate-400">📧</span>
                        <span className="truncate">{membre.email}</span>
                      </div>
                      
                      {membre.telephone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-slate-400">📞</span>
                          <span>{membre.telephone}</span>
                        </div>
                      )}
                      
                      {membre.categorie && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="text-slate-400">🏷️</span>
                          <span>{membre.categorie}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-slate-400">📅</span>
                        <span>Membre</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Input file caché pour l'upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const targetMembreId = e.target.getAttribute('data-membre-id');
          if (targetMembreId) {
            handleFileUpload(e, targetMembreId);
          }
        }}
        className="hidden"
      />
    </main>
  );
}

