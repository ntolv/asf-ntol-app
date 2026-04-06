"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LogoutButton from "@/components/auth/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  section: "pilotage" | "operations" | "support" | "admin";
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", section: "pilotage" },
  { href: "/bilan", label: "Bilan", icon: "📈", section: "pilotage" },
  { href: "/caisse", label: "Caisse", icon: "🦺", section: "pilotage" },
  { href: "/tontine", label: "Tontine", icon: "💚", section: "pilotage" },
  { href: "/encheres", label: "Enchères", icon: "🔥", section: "pilotage" },

  { href: "/membres", label: "Membres", icon: "👥", section: "operations" },
  { href: "/contributions", label: "Contributions", icon: "💰", section: "operations" },
  { href: "/imputations", label: "Imputations", icon: "🧾", section: "operations" },
  { href: "/montants-attendus", label: "Montants attendus", icon: "📌", section: "operations" },
  { href: "/decaissements", label: "Décaissements", icon: "💸", section: "operations" },

  { href: "/aides", label: "Aides / Secours / Prêts", icon: "🤝", section: "support" },
  { href: "/gestion-demandes", label: "Gestion des demandes", icon: "🗂️", section: "support" },
  { href: "/prets-aides", label: "Prêts/Aides", icon: "📈", section: "support" },
  { href: "/documents", label: "Documents", icon: "📂", section: "support" },

  { href: "/admin/roles", label: "Administration", icon: "⚙️", section: "admin" }
];

const sections = [
  { key: "pilotage", label: "Pilotage" },
  { key: "operations", label: "Opérations" },
  { key: "support", label: "Support" },
  { key: "admin", label: "Administration" },
] as const;

function normalizeRoleLabel(role: unknown) {
  const value = String(role || "").trim();
  return value || null;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const auth: any = useAuth?.() ?? {};
  const roleLabel = normalizeRoleLabel(auth?.member?.role);
  const showRoleBadge = auth?.loading !== true && !!roleLabel;

  return (
    <aside className="hidden xl:flex xl:w-[310px] xl:flex-col xl:sticky xl:top-0 xl:h-screen xl:border-r xl:border-emerald-100 xl:bg-white">
      <div className="border-b border-emerald-100 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Association Famille NTOL
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950">
          ASF-NTOL
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Navigation complète de l’application.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {showRoleBadge ? (
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              {roleLabel}
            </div>
          ) : null}

          <LogoutButton compact />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sections.map((section) => {
          const items = navItems.filter((item) => item.section === section.key);
          if (items.length === 0) return null;

          return (
            <div key={section.key} className="mb-5">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {section.label}
              </p>

              <nav className="space-y-2">
                {items.map((item) => {
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
            </div>
          );
        })}
      </div>
    </aside>
  );
}