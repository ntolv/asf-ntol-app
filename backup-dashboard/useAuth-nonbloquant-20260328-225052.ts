"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { withTimeout } from "@/lib/withTimeout";

interface MemberData {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string | null;
  statut_associatif: string;
  categorie: string | null;
  est_tontineur_defaut: boolean;
  actif: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  member: MemberData | null;
  loading: boolean;
  error: string | null;
}

function mapFallbackMember(row: any, user: User): MemberData {
  return {
    id: row.id,
    nom_complet: row.nom_complet,
    email: row.email || user.email || "",
    telephone: row.telephone || null,
    statut_associatif: row.statut_associatif || "Non défini",
    categorie: null,
    est_tontineur_defaut: row.est_tontineur_defaut || false,
    actif: row.actif || false,
    created_at: row.created_at || "",
  };
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    member: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const safeSetAuthState = (nextState: AuthState) => {
      if (isMounted) {
        setAuthState(nextState);
      }
    };

    const initializeAuth = async () => {
      try {
        console.log("🔐 Auth initialization started");

        // getSession peut être lent. On laisse plus de marge.
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          10000
        );

        console.log("📱 Session result:", {
          error: sessionResult.error,
          hasSession: !!sessionResult.data?.session,
        });

        if (sessionResult.error) {
          console.error("❌ Session error:", sessionResult.error);
          safeSetAuthState({
            user: null,
            member: null,
            loading: false,
            error: `Erreur de session: ${sessionResult.error.message}`,
          });
          return;
        }

        const session = sessionResult.data?.session;

        if (!session?.user) {
          console.log("👤 No session user found");
          safeSetAuthState({
            user: null,
            member: null,
            loading: false,
            error: null,
          });
          return;
        }

        const user = session.user;
        console.log("✅ Session user found:", user.id);

        const utilisateurResult = await withTimeout(
          Promise.resolve(
            supabase
              .from("utilisateurs")
              .select("id, membre_id")
              .eq("auth_user_id", user.id)
              .maybeSingle()
          ),
          5000
        );

        console.log("👥 Utilisateur result:", {
          error: utilisateurResult.error,
          hasUtilisateur: !!utilisateurResult.data,
        });

        if (utilisateurResult.error) {
          console.error("❌ Utilisateur query error:", utilisateurResult.error);
          safeSetAuthState({
            user,
            member: null,
            loading: false,
            error: `Erreur utilisateur: ${utilisateurResult.error.message}`,
          });
          return;
        }

        if (!utilisateurResult.data?.membre_id) {
          console.error("❌ Utilisateur non trouvé pour auth_user_id:", user.id);
          safeSetAuthState({
            user,
            member: null,
            loading: false,
            error: "Utilisateur non trouvé",
          });
          return;
        }

        const membreId = utilisateurResult.data.membre_id;
        console.log("🎯 Membre ID trouvé:", membreId);

        const memberResult = await withTimeout(
          Promise.resolve(
            supabase
              .from("v_membres")
              .select("id, nom_complet, email, telephone, statut_associatif, categorie, est_tontineur_defaut, actif, created_at")
              .eq("id", membreId)
              .maybeSingle()
          ),
          5000
        );

        console.log("👥 Member result:", {
          error: memberResult.error,
          hasMember: !!memberResult.data,
        });

        if (!memberResult.error && memberResult.data) {
          console.log("✅ Auth success with v_membres");
          safeSetAuthState({
            user,
            member: memberResult.data as MemberData,
            loading: false,
            error: null,
          });
          return;
        }

        console.log("🔄 Trying fallback to membres table");

        const fallbackResult = await withTimeout(
          Promise.resolve(
            supabase
              .from("membres")
              .select("id, nom_complet, email, telephone, statut_associatif, est_tontineur_defaut, actif, created_at")
              .eq("id", membreId)
              .maybeSingle()
          ),
          5000
        );

        console.log("🔄 Fallback result:", {
          error: fallbackResult.error,
          hasFallback: !!fallbackResult.data,
        });

        if (fallbackResult.error || !fallbackResult.data) {
          console.error("❌ No member found in any table");
          safeSetAuthState({
            user,
            member: null,
            loading: false,
            error: "Membre non trouvé",
          });
          return;
        }

        console.log("✅ Auth success with fallback member");
        safeSetAuthState({
          user,
          member: mapFallbackMember(fallbackResult.data, user),
          loading: false,
          error: null,
        });
      } catch (error: any) {
        console.error("💥 Auth initialization error:", error);
        safeSetAuthState({
          user: null,
          member: null,
          loading: false,
          error: error?.message || "Erreur lors du chargement des données",
        });
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state change:", {
          event,
          hasSession: !!session?.user,
        });

        if (!session?.user) {
          console.log("👤 User logged out");
          safeSetAuthState({
            user: null,
            member: null,
            loading: false,
            error: null,
          });
          return;
        }

        console.log("🔄 Reloading auth data");
        await initializeAuth();
      }
    );

    return () => {
      isMounted = false;
      console.log("🔌 Unsubscribing from auth changes");
      subscription.unsubscribe();
    };
  }, []);

  return authState;
}
