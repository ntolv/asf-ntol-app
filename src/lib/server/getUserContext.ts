import { createClient } from "@supabase/supabase-js";

type AuthUserLike = {
  id?: string;
  email?: string | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables Supabase manquantes");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserContext(user: AuthUserLike | null) {
  if (!user?.id) {
    return {
      success: false,
      message: "Utilisateur non connecté",
      user: null,
      utilisateur: null,
      member: null,
      role: null,
    };
  }

  const supabase = getAdminClient();

  let utilisateur: any = null;
  let utilisateurError: any = null;

  const byAuthUser = await supabase
    .from("utilisateurs")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  utilisateur = byAuthUser.data ?? null;
  utilisateurError = byAuthUser.error ?? null;

  if (!utilisateur && user.email) {
    const byEmail = await supabase
      .from("utilisateurs")
      .select("*")
      .ilike("email_connexion", user.email)
      .maybeSingle();

    utilisateur = byEmail.data ?? null;
    utilisateurError = byEmail.error ?? null;

    if (utilisateur?.id && utilisateur.auth_user_id !== user.id) {
      await supabase
        .from("utilisateurs")
        .update({
          auth_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", utilisateur.id);

      utilisateur.auth_user_id = user.id;
    }
  }

  if (utilisateurError) {
    return {
      success: false,
      message: utilisateurError.message || "Erreur chargement utilisateur",
      user,
      utilisateur: null,
      member: null,
      role: null,
    };
  }

  if (!utilisateur) {
    return {
      success: false,
      message: "Aucun utilisateur lié à l'utilisateur connecté",
      user,
      utilisateur: null,
      member: null,
      role: null,
    };
  }

  if (!utilisateur.membre_id) {
    return {
      success: false,
      message: "Aucun membre lié à l'utilisateur connecté",
      user,
      utilisateur,
      member: null,
      role: null,
    };
  }

  const memberResult = await supabase
    .from("membres")
    .select("*")
    .eq("id", utilisateur.membre_id)
    .maybeSingle();

  if (memberResult.error || !memberResult.data) {
    return {
      success: false,
      message: memberResult.error?.message || "Membre introuvable pour l'utilisateur connecté",
      user,
      utilisateur,
      member: null,
      role: null,
    };
  }

  const roleResult = await supabase
    .from("v_utilisateurs_roles_principaux")
    .select("*")
    .eq("utilisateur_id", utilisateur.id)
    .eq("principal", true)
    .maybeSingle();

  const role = roleResult.data
    ? {
        id: roleResult.data.role_id ?? null,
        code: roleResult.data.role_code ?? null,
        libelle: roleResult.data.role_libelle ?? null,
      }
    : null;

  const member = {
    ...memberResult.data,
    role: role?.libelle ?? null,
    role_code: role?.code ?? null,
  };

  return {
    success: true,
    message: "Contexte utilisateur chargé",
    user,
    utilisateur,
    member,
    role,
  };
}