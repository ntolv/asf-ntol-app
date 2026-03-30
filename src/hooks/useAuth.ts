"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthState = {
  user: any | null;
  member: any | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<any | null>(null);
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const roles = {
        admin: false,
        tresorier: false,
        president: false,
      };

      for (const role of Object.keys(roles)) {
        const { data } = await supabase.rpc("fn_is_role", {
          p_code: role,
        });
        roles[role] = data === true;
      }

      if (roles.admin) return "admin";
      if (roles.tresorier) return "tresorier";
      if (roles.president) return "president";

      return "membre";
    }

    async function initializeAuth() {
      try {
        if (!supabase?.auth) {
          setUser(null);
          setMember(null);
          setLoading(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user ?? null;

        if (!isMounted) return;

        setUser(sessionUser);

        if (sessionUser) {
          const role = await loadRole();

          setMember({
            id: sessionUser.id,
            email: sessionUser.email ?? null,
            role,
          });
        } else {
          setMember(null);
        }

        setLoading(false);
      } catch (error: any) {
        console.error("Erreur auth:", error);
        setUser(null);
        setMember(null);
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user ?? null;

        if (!isMounted) return;

        setUser(sessionUser);

        if (sessionUser) {
          const role = await loadRole();

          setMember({
            id: sessionUser.id,
            email: sessionUser.email ?? null,
            role,
          });
        } else {
          setMember(null);
        }

        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return { user, member, loading };
}