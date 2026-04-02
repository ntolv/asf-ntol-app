"use client";

import { useEffect, useState } from "react";

type AuthState = {
  user: any | null;
  member: {
    id: string | null;
    email: string | null;
    role: string | null;
    membreId?: string | null;
  } | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<any | null>(null);
  const [member, setMember] = useState<AuthState["member"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadAuth() {
      try {
        setLoading(true);

        const res = await fetch("/api/auth/context", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            "Accept": "application/json",
          },
        });

        const rawText = await res.text();

        let result: any = null;
        try {
          result = rawText ? JSON.parse(rawText) : null;
        } catch {
          result = {
            success: false,
            message: "Réponse auth invalide (non JSON)",
            raw: rawText,
            status: res.status,
          };
        }

        if (!res.ok || result?.success !== true) {
          console.error("Auth context error:", {
            status: res.status,
            statusText: res.statusText,
            result,
            rawText,
          });
          setUser(null);
          setMember(null);
          setLoading(false);
          return;
        }

        const data = result.data;

        setUser({
          id: data.authUserId,
          email: data.email,
        });

        setMember({
          id: data.authUserId,
          email: data.email,
          role: data.role,
          membreId: data.membreId,
        });

        setLoading(false);

      } catch (err) {
        console.error("Auth load error:", err);
        if (!mounted) return;
        setUser(null);
        setMember(null);
        setLoading(false);
      }
    }

    loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, member, loading };
}
