import { withTimeout } from "./withTimeout";
import { supabase } from "./supabaseClient";

/**
 * Helper partagé pour récupérer le membre_id de l'utilisateur connecté
 * Avec timeout et gestion d'erreurs explicites
 */

export async function getCurrentMembreId(): Promise<string> {
  try {
    // 1. Récupérer la session avec timeout
    const { data: sessionData, error: sessionError } = await withTimeout(
      supabase.auth.getSession(),
      5000 // 5 secondes pour la session
    );

    if (sessionError) {
      throw new Error(`Erreur session: ${sessionError.message}`);
    }

    if (!sessionData?.session?.user?.id) {
      throw new Error("Aucune session utilisateur active");
    }

    const authUserId = sessionData.session.user.id;

    // 2. Récupérer le membre_id depuis la table utilisateurs avec timeout
    const { data: utilisateurData, error: utilisateurError } = await withTimeout(
      supabase
        .from("utilisateurs")
        .select("id, membre_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle(),
      3000 // 3 secondes pour la recherche utilisateur
    );

    if (utilisateurError) {
      throw new Error(`Erreur recherche utilisateur: ${utilisateurError.message}`);
    }

    if (!utilisateurData?.membre_id) {
      throw new Error("Membre non trouvé pour cet utilisateur");
    }

    return utilisateurData.membre_id;

  } catch (error: any) {
    console.error("getCurrentMembreId error:", error);
    throw error;
  }
}
