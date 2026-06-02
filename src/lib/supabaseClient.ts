import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur utilisant le pattern officiel @supabase/ssr.
 * Il écrit la session dans les cookies afin que les routes serveur puissent lire l'utilisateur connecté.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const supabase = createClient();
