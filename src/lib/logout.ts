import { supabase } from "@/lib/supabaseClient";

export async function logout(router:any) {
  await supabase.auth.signOut();
  router.push("/login");
}