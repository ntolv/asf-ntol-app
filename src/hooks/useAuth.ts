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
  roleCode?: string | null;
  member?: {
    id?: string | null;
    nom?: string | null;
    nom_complet?: string | null;
    telephone?: string | null;
    role?: string | null;
    role_code?: string | null;
  } | null;
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
  roleCode: string | null;
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

type SharedAuthFetchResult = {
  ok: boolean;
  data: AuthContextResponse | null;
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
  roleCode: null,
};

let authContextRequest: Promise<SharedAuthFetchResult> | null = null;

function fetchAuthContextShared(): Promise<SharedAuthFetchResult> {
  if (authContextRequest) {
    return authContextRequest;
  }

  const request = (async (): Promise<SharedAuthFetchResult> => {
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

    return {
      ok: response.ok,
      data,
    };
  })();

  authContextRequest = request;

  request.then(
    () => {
      if (authContextRequest === request) {
        authContextRequest = null;
      }
    },
    () => {
      if (authContextRequest === request) {
        authContextRequest = null;
      }
    }
  );

  return request;
}

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

      const { ok, data } = await fetchAuthContextShared();

      if (!ok || !data?.success || !data?.authUserId || !data?.membreId) {
        setUser(null);
        setMember(null);
        setMessage(data?.message || "Contexte utilisateur indisponible.");

        if (currentPending?.membreId) {
          setMessage(null);
        }

        return;
      }

      const resolvedNom =
        data.member?.nom_complet ??
        data.member?.nom ??
        data.nom ??
        null;

      const resolvedTelephone =
        data.member?.telephone ??
        data.telephone ??
        null;

      const resolvedRole =
        data.member?.role ??
        data.role ??
        null;

      const resolvedRoleCode =
        data.member?.role_code ??
        data.roleCode ??
        null;

      setUser({
        ...DEFAULT_USER,
        id: data.authUserId ?? null,
        email: data.email ?? null,
      });

      setMember({
        ...DEFAULT_MEMBER,
        id: data.membreId ?? null,
        nom: resolvedNom,
        telephone: resolvedTelephone,
        role: resolvedRole,
        roleCode: resolvedRoleCode,
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