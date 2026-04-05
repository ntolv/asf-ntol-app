import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Créer un client Supabase pour le middleware
  const supabase = createMiddlewareClient(
    {
      req,
      res,
    },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    }
  )

  // Rafraîchir la session si elle existe
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Si la session existe, la synchroniser dans les cookies
  if (session) {
    // La session est automatiquement synchronisée via createMiddlewareClient
    // Pas besoin de manipulation manuelle des cookies
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
