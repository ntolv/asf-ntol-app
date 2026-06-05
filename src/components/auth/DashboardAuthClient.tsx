"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthState = {
  loading: boolean;
  nom: string | null;
  role: string | null;
};

export default function DashboardAuthClient() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    nom: null,
    role: null,
  });

  useEffect(() => {
    let alive = true;

    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/context", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store",
            Pragma: "no-cache",
          },
        });

        const data = await response.json().catch(() => null);

        if (!alive) return;

        if (!response.ok || !data?.success || !data?.membreId) {
          router.replace("/login");
          return;
        }

        setAuth({
          loading: false,
          nom:
            data?.member?.nom_complet ||
            data?.member?.nom ||
            data?.nom ||
            "Utilisateur connecté",
          role:
            data?.member?.role ||
            data?.role ||
            null,
        });
      } catch {
        if (alive) {
          router.replace("/login");
        }
      }
    }

    checkAuth();

    return () => {
      alive = false;
    };
  }, [router]);

  if (auth.loading) {
    return null;
  }

  return (
    <div className="fixed right-3 top-3 z-[9998] max-w-[75vw] rounded-2xl border border-emerald-200 bg-white/95 px-3 py-2 text-right shadow-sm backdrop-blur">
      <p className="truncate text-xs font-bold text-emerald-900">
        {auth.nom}
      </p>
      {auth.role ? (
        <p className="truncate text-[11px] text-slate-500">
          {auth.role}
        </p>
      ) : null}
    </div>
  );
}
