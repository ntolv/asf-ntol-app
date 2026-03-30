'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { withTimeout } from '@/lib/withTimeout'

interface MemberData {
  id: string
  nom_complet: string
  email: string
  telephone: string | null
  statut_associatif: string
  categorie: string | null
  est_tontineur_defaut: boolean
  actif: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  member: MemberData | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    member: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Auth initialization started')
        
        // 1. Récupérer la session avec timeout
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          5000 // 5 secondes timeout
        )
        
        console.log('📱 Session result:', { error: sessionResult.error, hasSession: !!sessionResult.data?.session })
        
        if (sessionResult.error) {
          console.error('❌ Session error:', sessionResult.error)
          setAuthState(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Erreur de session: ${sessionResult.error.message}` 
          }))
          return
        }

        if (!sessionResult.data?.session?.user) {
          console.log('👤 No session user found')
          setAuthState(prev => ({ ...prev, loading: false }))
          return
        }

        const session = sessionResult.data.session
        console.log('✅ Session user found:', session.user.id)

        // 2. Récupérer les données du membre avec timeout
        // Suivre la vraie chaîne: utilisateurs -> membre_id -> membres/v_membres
        const utilisateurQuery = supabase
          .from('utilisateurs')
          .select('id, membre_id')
          .eq('auth_user_id', session.user.id)
          .single()

        const utilisateurResult = await withTimeout(
          Promise.resolve(utilisateurQuery),
          3000 // 3 secondes timeout
        )

        console.log('👥 Utilisateur result:', { error: utilisateurResult.error, hasUtilisateur: !!utilisateurResult.data })

        if (utilisateurResult.error || !utilisateurResult.data) {
          console.error('❌ Utilisateur non trouvé pour auth_user_id:', session.user.id)
          setAuthState({
            user: session.user,
            member: null,
            loading: false,
            error: 'Utilisateur non trouvé'
          })
          return
        }

        const membreId = utilisateurResult.data.membre_id
        console.log('🎯 Membre ID trouvé:', membreId)

        // 3. Récupérer le membre depuis v_membres
        const memberQuery = supabase
          .from('v_membres')
          .select('id, nom_complet, email, telephone, statut_associatif, est_tontineur_defaut, categorie, actif, created_at')
          .eq('id', membreId)
          .single()

        const memberResult = await withTimeout(
          Promise.resolve(memberQuery),
          3000 // 3 secondes timeout
        )

        console.log('👥 Member result:', { error: memberResult.error, hasMember: !!memberResult.data })

        if (memberResult.error || !memberResult.data) {
          console.log('🔄 Trying fallback to membres table')
          
          // Si pas de membre dans v_membres, essayer avec la table membres
          const fallbackQuery = supabase
            .from('membres')
            .select('id, nom_complet, email, telephone, statut_associatif, est_tontineur_defaut, categorie, actif, created_at')
            .eq('id', membreId)
            .single()

          const fallbackResult = await withTimeout(
            Promise.resolve(fallbackQuery),
            3000 // 3 secondes timeout
          )

          console.log('🔄 Fallback result:', { error: fallbackResult.error, hasFallback: !!fallbackResult.data })

          if (fallbackResult.error || !fallbackResult.data) {
            console.error('❌ No member found in any table')
            setAuthState({
              user: session.user,
              member: null,
              loading: false,
              error: 'Membre non trouvé'
            })
            return
          }

          const formattedMember: MemberData = {
            id: fallbackResult.data.id,
            nom_complet: fallbackResult.data.nom_complet,
            email: fallbackResult.data.email || session.user.email || '',
            telephone: fallbackResult.data.telephone || null,
            statut_associatif: fallbackResult.data.statut_associatif || 'Non défini',
            categorie: fallbackResult.data.categorie || null,
            est_tontineur_defaut: fallbackResult.data.est_tontineur_defaut || false,
            actif: fallbackResult.data.actif || false,
            created_at: fallbackResult.data.created_at || ''
          }

          console.log('✅ Auth success with fallback member')
          setAuthState({
            user: session.user,
            member: formattedMember,
            loading: false,
            error: null
          })
        } else {
          console.log('✅ Auth success with v_membres')
          setAuthState({
            user: session.user,
            member: memberResult.data,
            loading: false,
            error: null
          })
        }

      } catch (error: any) {
        console.error('💥 Auth initialization error:', error)
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error?.message || 'Erreur lors du chargement des données' 
        }))
      }
    }

    initializeAuth()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', { event, hasSession: !!session?.user })
        
        if (!session?.user) {
          console.log('👤 User logged out')
          setAuthState({
            user: null,
            member: null,
            loading: false,
            error: null
          })
          return
        }

        // Recharger les données du membre
        console.log('🔄 Reloading auth data')
        await initializeAuth()
      }
    )

    return () => {
      console.log('🔌 Unsubscribing from auth changes')
      subscription.unsubscribe()
    }
  }, [])

  return authState
}
