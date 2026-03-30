"use client";

import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

const titleMap: Record<string, string> = {
  "/": "Accueil",
  "/dashboard": "Dashboard",
  "/tontine": "Tontine",
  "/encheres": "Enchères",
  "/membres": "Membres",
  "/contributions": "Contributions",
  "/imputations": "Imputations",
  "/caisse": "Caisse",
  "/aides": "Aides / Secours",
  "/investissements": "Investissements / Prêts",
  "/documents": "Documents",
  "/admin/roles": "Administration des rôles"
};

export default function AppTopBar() {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "Association Famille NTOL";

  return (
    <div className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm"
          >
            ← Retour
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Association Famille NTOL
            </p>
            <h2 className="text-lg font-bold tracking-tight text-emerald-950">
              {title}
            </h2>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
            Navigation fluide
          </div>
          <LogoutButton compact />
        </div>
      </div>
    </div>
  );
}