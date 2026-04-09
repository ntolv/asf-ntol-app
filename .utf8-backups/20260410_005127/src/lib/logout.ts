import { supabase } from "@/lib/supabaseClient";

export async function logout(router?: any) {
  if (!supabase?.auth) {
    throw new Error("Client Supabase indisponible");
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  // Nettoyer les storages locaux (compatibilité avec SSR)
  try {
    localStorage.clear();
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  // Redirection immédiate
  if (typeof window !== "undefined") {
    window.location.replace("/login");
    return;
  }

  if (router) {
    router.push("/login");
  }
}
