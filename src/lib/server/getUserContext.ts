import { createClient } from '@/lib/supabase/server'

export type UserContext = {
  authUserId: string;
  membreId: string | null;
  role: string;
  email: string | null;
};

export async function getUserContext(): Promise<UserContext> {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Utilisateur non authentifié");
  }

  const authUserId = userData.user.id;
  const email = userData.user.email ?? null;

  const { data: utilisateurData, error: utilisateurError } = await supabase
    .from("utilisateurs")
    .select("membre_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (utilisateurError) {
    throw new Error(`Erreur récupération utilisateur: ${utilisateurError.message}`);
  }

  const membreId = utilisateurData?.membre_id ?? null;

  let role = "membre";

  const { data: isAdmin } = await supabase.rpc("fn_is_role", { p_code: "admin" });
  if (isAdmin === true) {
    role = "admin";
  } else {
    const { data: isTresorier } = await supabase.rpc("fn_is_role", { p_code: "tresorier" });
    if (isTresorier === true) {
      role = "tresorier";
    } else {
      const { data: isPresident } = await supabase.rpc("fn_is_role", { p_code: "president" });
      if (isPresident === true) {
        role = "president";
      }
    }
  }

  return {
    authUserId,
    membreId,
    role,
    email,
  };
}
