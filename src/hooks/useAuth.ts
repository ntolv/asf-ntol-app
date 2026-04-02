"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthUser = {
  id: string | null;
  email: string | null;
};

type AuthMember = {
  id?: string | null;
  nom_complet?: string | null;
  email?: string | null;
  telephone?: string | null;
  role?: string | null;
  role_code?: string | null;
  [key: string]: any;
};

type AuthUtilisateur = {
  id?: string | null;
  auth_user_id?: string | null;
  email_connexion?: string | null;
  membre_id?: string | null;
  statut_compte?: string | null;
  actif?: boolean | null;
  [key: string]: any;
};

type AuthContextResponse = {
  success: boolean;
  message?: string;
  user?: any;
  member?: AuthMember | null;
  utilisateur?: AuthUtilisateur | null;
  role?: {
    id?: string | null;
    code?: string | null;
    libelle?: string | null;
  } | null;
};

type UseAuthResult = {
  user: AuthUser | null;
  member: AuthMember | null;
  utilisateur: AuthUtilisateur | null;
  role: string | null;
  roleCode: string | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

function normalizeRole(
  member: AuthMember | null,
  utilisateur: AuthUtilisateur | null,
  payload: AuthContextResponse | null
) {
  const role =
    member?.role ??
    payload?.role?.libelle ??
    null;

  const roleCode =
    member?.role_code ??
    payload?.role?.code ??
    null;

  return { role, roleCode };
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [member, setMember] = useState<AuthMember | null>(null);
  const [utilisateur, setUtilisateur] = useState<AuthUtilisateur | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAuth = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/context", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const rawText = await res.text();

      let payload: AuthContextResponse | null = null;

      try {
        payload = rawText ? (JSON.parse(rawText) as AuthContextResponse) : null;
      } catch {
        payload = {
          success: false,
          message: "Réponse auth invalide (non JSON)",
        };
      }

      if (!res.ok || payload?.success !== true) {
        console.warn("Auth context warning:", {
          status: res.status,
          statusText: res.statusText,
          payload,
          rawText,
        });

        setUser(null);
        setMember(null);
        setUtilisateur(null);
        setRole(null);
        setRoleCode(null);
        setLoading(false);
        return;
      }

      const apiUser = payload.user ?? null;
      const apiMember = payload.member ?? null;
      const apiUtilisateur = payload.utilisateur ?? null;

      setUser({
        id: apiUser?.id ?? null,
        email: apiUser?.email ?? null,
      });

      setMember(apiMember);
      setUtilisateur(apiUtilisateur);

      const normalizedRole = normalizeRole(apiMember, apiUtilisateur, payload);
      setRole(normalizedRole.role);
      setRoleCode(normalizedRole.roleCode);

      setLoading(false);
    } catch (error: any) {
      console.warn("Auth context fetch failed:", {
        message: error?.message || "Erreur inconnue",
      });

      setUser(null);
      setMember(null);
      setUtilisateur(null);
      setRole(null);
      setRoleCode(null);
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setMember(null);
      setUtilisateur(null);
      setRole(null);
      setRoleCode(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, []);

  useEffect(() => {
    loadAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAuth]);

  return useMemo(
    () => ({
      user,
      member,
      utilisateur,
      role,
      roleCode,
      loading,
      refreshAuth: loadAuth,
      logout,
    }),
    [user, member, utilisateur, role, roleCode, loading, loadAuth, logout]
  );
}