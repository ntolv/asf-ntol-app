"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";

const PAGE_TITLES: Record<string, string> = {
  "/": "Accueil",
  "/dashboard": "Dashboard",
  "/contributions": "Contributions",
  "/imputations": "Imputations",
  "/tontine": "Tontine",
  "/tontine/suivi-cycle": "Suivi cycle tontine",
  "/encheres": "Enchères",
  "/membres": "Membres",
  "/prets": "Prêts",
  "/aides": "Aides",
  "/documents": "Documents",
  "/admin/roles": "Administration des rôles",
};

function resolveTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  const matchedEntry = Object.entries(PAGE_TITLES)
    .filter(([key]) => key !== "/" && pathname.startsWith(`${key}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return matchedEntry?.[1] ?? "ASF-NTOL";
}

export default function AppTopBar() {
  const pathname = usePathname();
  const title = useMemo(() => resolveTitle(pathname), [pathname]);

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
            Gestion associative familiale
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}