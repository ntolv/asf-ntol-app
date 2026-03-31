import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase côté navigateur utilisant le pattern officiel @supabase/ssr
 * Ce fichier sert de wrapper pour maintenir la compatibilité avec l'existant
 * tout en basculant vers le socle SSR officiel
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export par défaut pour compatibilité avec l'existant
export const supabase = createClient()