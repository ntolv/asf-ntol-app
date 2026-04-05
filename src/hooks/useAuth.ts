"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearPendingRecognition,
  getPendingRecognition,
  hasPendingRecognition,
  type PendingRecognition,
} from "@/lib/auth/pendingRecognition";

type AuthContextResponse = {
  success?: boolean;
  message?: string;
  authUserId?: string | null;
  membreId?: string | null;
  email?: string | null;
  telephone?: string | null;
  nom?: string | null;
  role?: string | null;
};

type AuthUser = {
  id: string | null;
  email: string | null;
};

type AuthMember = {
  id: string | null;
  nom: string | null;
  telephone: string | null;
  role: string | null;
};

type UseAuthReturn = {
  loading: boolean;
  isAuthenticated: boolean;
  needsPhoneRecognition: boolean;
  hasPendingMemberRecognition: boolean;
  pendingRecognition: PendingRecognition | null;
  message: string | null;
  user: AuthUser | null;
  member: AuthMember | null;
  refresh: () => Promise<void>;
};

const DEFAULT_USER: AuthUser = {
  id: null,
  email: null,
};

const DEFAULT_MEMBER: AuthMember = {
  id: null,
  nom: null,
  telephone: null,
  role: null,
};

function useAuthInternal(): UseAuthReturn {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [member, setMember] = useState<AuthMember | null>(null);
  const [pending, setPending] = useState<PendingRecognition | null>(null);

  const syncPending = useCallback(() => {
    const current = getPendingRecognition();
    setPending(current);
    return current;
  }, []);

  const loadAuth = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      const currentPending = syncPending();

      const response = await fetch("/api/auth/context", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      });

      const data = (await response.json().catch(() => null)) as AuthContextResponse | null;

      if (!response.ok || !data?.success || !data?.authUserId || !data?.membreId) {
        setUser(null);
        setMember(null);
        setMessage(data?.message || "Contexte utilisateur indisponible.");

        if (currentPending?.membreId) {
          setMessage(null);
        }

        return;
      }

      setUser({
        ...DEFAULT_USER,
        id: data.authUserId ?? null,
        email: data.email ?? null,
      });

      setMember({
        ...DEFAULT_MEMBER,
        id: data.membreId ?? null,
        nom: data.nom ?? null,
        telephone: data.telephone ?? null,
        role: data.role ?? null,
      });

      clearPendingRecognition();
      setPending(null);
      setMessage(data.message ?? null);
    } catch (error: any) {
      setUser(null);
      setMember(null);

      const currentPending = syncPending();
      if (currentPending?.membreId) {
        setMessage(null);
      } else {
        setMessage(error?.message || "Erreur lors du chargement du contexte utilisateur.");
      }
    } finally {
      setLoading(false);
    }
  }, [syncPending]);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  const isAuthenticated = useMemo(() => {
    return Boolean(user?.id && member?.id);
  }, [user?.id, member?.id]);

  const hasPendingMemberRecognition = useMemo(() => {
    return Boolean(pending?.membreId || hasPendingRecognition());
  }, [pending?.membreId]);

  const needsPhoneRecognition = useMemo(() => {
    if (loading) {
      return false;
    }

    if (isAuthenticated) {
      return false;
    }

    if (hasPendingMemberRecognition) {
      return false;
    }

    return true;
  }, [loading, isAuthenticated, hasPendingMemberRecognition]);

  return {
    loading,
    isAuthenticated,
    needsPhoneRecognition,
    hasPendingMemberRecognition,
    pendingRecognition: pending,
    message,
    user,
    member,
    refresh: loadAuth,
  };
}

export function useAuth(): UseAuthReturn {
  return useAuthInternal();
}

export default useAuth;