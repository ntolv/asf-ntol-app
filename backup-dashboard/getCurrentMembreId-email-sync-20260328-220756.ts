import { withTimeout } from "./withTimeout";
import { supabase } from "./supabaseClient";

/**
 * Helper partagé pour récupérer le membre_id de l'utilisateur connecté
 * Synchronisation définitive via téléphone
 */

type SyncUtilisateurByPhoneRow = {
  success: boolean;
  message: string;
  utilisateur_id: string | null;
  membre_id: string | null;
  auth_user_id: string | null;
  telephone_normalise: string | null;
};

function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function extractPhoneFromSessionUser(user: any): string {
  const candidates = [
    user?.phone,
    user?.user_metadata?.telephone,
    user?.user_metadata?.phone,
    user?.user_metadata?.telephone_normalise,
    user?.app_metadata?.telephone,
    user?.app_metadata?.phone,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "";
}

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
    const emailConnexion = user.email ?? null;
    const telephoneNormalise = extractPhoneFromSessionUser(user);

    if (!telephoneNormalise) {
      throw new Error(
        "Aucun téléphone exploitable trouvé dans la session utilisateur. Vérifie que le compte connecté contient bien un numéro de téléphone."
      );
    }

    const { data: syncData, error: syncError } = await withTimeout(
      Promise.resolve(
        supabase.rpc("fn_sync_utilisateur_by_phone", {
          p_auth_user_id: authUserId,
          p_telephone: telephoneNormalise,
          p_email_connexion: emailConnexion,
        })
      ),
      5000
    );

    if (syncError) {
      throw new Error(`Erreur synchronisation utilisateur: ${syncError.message}`);
    }

    const syncRow = ((syncData || [])[0] || null) as SyncUtilisateurByPhoneRow | null;

    if (!syncRow?.success) {
      throw new Error(syncRow?.message || "Synchronisation utilisateur impossible");
    }

    if (!syncRow.membre_id) {
      throw new Error("membre_id introuvable après synchronisation");
    }

    return syncRow.membre_id;
  } catch (error: any) {
    console.error("getCurrentMembreId error:", error);
    throw error;
  }
}
