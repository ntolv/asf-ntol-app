import { withTimeout } from "./withTimeout";
import { supabase } from "./supabaseClient";

/**
 * Helper partagé pour récupérer le membre_id de l'utilisateur connecté
 * Logique définitive :
 * - reconnaissance initiale via téléphone à la préinscription
 * - liaison durable via auth_user_id / email_connexion dans utilisateurs
 */

export async function getCurrentMembreId(): Promise<string> {
  try {
    const { data: sessionData, error: sessionError } = await withTimeout(
      supabase.auth.getSession(),
      5000
    );

    if (sessionError) {
      throw new Error(`Erreur session: ${sessionError.message}`);
    }

    const user = sessionData?.session?.user;

    if (!user?.id) {
      throw new Error("Aucune session utilisateur active");
    }

    const authUserId = user.id;

    const { data: utilisateurData, error: utilisateurError } = await withTimeout(
      Promise.resolve(
        supabase
          .from("utilisateurs")
          .select("id, membre_id, auth_user_id, email_connexion, actif")
          .eq("auth_user_id", authUserId)
          .maybeSingle()
      ),
      5000
    );

    if (utilisateurError) {
      throw new Error(`Erreur recherche utilisateur: ${utilisateurError.message}`);
    }

    if (!utilisateurData?.membre_id) {
      throw new Error(
        "Utilisateur applicatif introuvable pour cette session. La préinscription n’a probablement pas été finalisée correctement."
      );
    }

    return utilisateurData.membre_id;
  } catch (error: any) {
    console.error("getCurrentMembreId error:", error);
    throw error;
  }
}
