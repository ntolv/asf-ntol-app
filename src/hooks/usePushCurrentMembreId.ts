"use client";

import { useEffect, useState } from "react";

type AuthContextResponse = {
  success?: boolean;
  membreId?: string | null;
  authUserId?: string | null;
  email?: string | null;
};

export function usePushCurrentMembreId() {
  const [membreId, setMembreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/auth/context", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as AuthContextResponse | null;

        if (!cancelled) {
          setMembreId(data?.membreId || null);
        }
      } catch (_error) {
        if (!cancelled) {
          setMembreId(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { membreId, loading };
}