"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LogoutButton from "@/components/ui/LogoutButton";

const PAGE_TITLES: Record<string, string> = {
  "/": "Accueil",
  "/bilan": "Bilan",
  "/contributions": "Contributions",
  "/imputations": "Historique des encaissements",
  "/caisse": "Caisse",
  "/montants-attendus": "Montants attendus",
  "/decaissements": "D\u00E9caissements",
  "/tontine": "Tontine",
  "/tontine/suivi-cycle": "Suivi cycle tontine",
  "/tontine/historique": "Historique Tontine",
  "/encheres": "Ench\u00E8res",
  "/membres": "Membres",
  "/prets": "Pr\u00EAts",
  "/aides": "Aides",
  "/gestion-demandes": "Gestion des demandes",
  "/prets-aides": "Pr\u00EAts / Aides",
  "/documents": "Documents",
  "/admin/roles": "Administration des r\u00F4les",
  "/admin/import-export": "Import / Export",
  "/admin/import-export/tontine-gagnants": "Import gagnants tontine",
};

function resolveTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  const matchedEntry = Object.entries(PAGE_TITLES)
    .filter(
      ([key]) =>
        key !== "/" &&
        pathname.startsWith(`${key}/`)
    )
    .sort(
      (a, b) =>
        b[0].length - a[0].length
    )[0];

  return matchedEntry?.[1] ?? "ASF-NTOL";
}

export default function AppTopBar() {
  const pathname = usePathname();

  const title = useMemo(
    () => resolveTitle(pathname),
    [pathname]
  );

  const auth = useAuth?.();

  const displayName =
    auth?.member?.nom ||
    "Utilisateur connect\u00E9";

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 backdrop-blur">

      <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6">

        <div className="min-w-0">

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            ASF-NTOL
          </p>

          <h1 className="truncate text-lg font-bold text-slate-900 md:text-xl">
            {title}
          </h1>

        </div>

        <div className="flex items-center gap-3">

          <div className="hidden rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 md:block">
            {displayName}
          </div>

          <LogoutButton />

        </div>

      </div>

    </header>
  );
}