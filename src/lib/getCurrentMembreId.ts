import { supabase } from "@/lib/supabaseClient";

export async function getCurrentMembreId(): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("fn_current_membre_id");

  if (error) {
    console.error(
      "Erreur fn_current_membre_id:",
      error,
      error?.message,
      error?.details,
      error?.hint
    );
    return null;
  }

  if (!data) return null;

  return String(data);
}