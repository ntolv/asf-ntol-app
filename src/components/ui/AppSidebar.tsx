"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LogoutButton from "@/components/auth/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/bilan", label: "Bilan", icon: "📈" },
  { href: "/tontine", label: "Tontine", icon: "💚" },
  { href: "/encheres", label: "Enchères", icon: "🔥" },
  { href: "/membres", label: "Membres", icon: "👥" },
  { href: "/contributions", label: "Contributions", icon: "💰" },
  { href: "/imputations", label: "Imputations", icon: "🧾" },
  { href: "/caisse", label: "Caisse", icon: "🦺" },
  { href: "/aides", label: "Aides / Secours / Prêts", icon: "🤝" },
  { href: "/prets-aides", label: "Prêts/Aides", icon: "📈" },
  { href: "/documents", label: "Documents", icon: "📂" },
  { href: "/admin/roles", label: "Administration", icon: "⚙️" }
];

function getDisplayedRoleLabel(role: unknown) {
  const value = String(role || "").trim();
  return value ? value : "Rôle indisponible";
}

export default function AppSidebar() {
  const pathname = usePathname();
  const auth: any = useAuth?.() ?? {};
  const role = auth?.member?.role ?? null;
  const showRoleBadge = auth?.loading !== true;

  return (
    <aside className="hidden xl:flex xl:w-[290px] xl:flex-col xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto xl:border-r xl:border-emerald-100 xl:bg-white xl:px-5 xl:py-6">
      <div className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Association Famille NTOL
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950">
          ASF-NTOL
        </h1>
        <p className="mt-2 text-sm text-emerald-900/70">
          Navigation complète de l’application.
        </p>

        {showRoleBadge && (
          <div className="mt-4 inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800">
            {getDisplayedRoleLabel(role)}
          </div>
        )}

        <div className="mt-4">
          <LogoutButton compact />
        </div>
      </div>

      <nav className="mt-5 space-y-2 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm"
                  : "flex items-center gap-3 rounded-2xl border border-transparent bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/40"
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}






