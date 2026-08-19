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
  { href: "/dashboard", label: "Dashboard", icon: "\uD83D\uDCCA", section: "pilotage" },
  { href: "/bilan", label: "Bilan", icon: "\uD83D\uDCC8", section: "pilotage" },
  { href: "/caisse", label: "Caisse", icon: "\uD83C\uDFE6", section: "pilotage" },
  { href: "/tontine", label: "Tontine", icon: "\uD83D\uDC9A", section: "pilotage" },
  { href: "/tontine/historique", label: "Historique Tontine", icon: "\uD83D\uDCDA", section: "pilotage" },
  { href: "/encheres", label: "Ench\u00E8res", icon: "\uD83D\uDD25", section: "pilotage" },

  { href: "/membres", label: "Membres", icon: "\uD83D\uDC65", section: "operations" },
  { href: "/contributions", label: "Contributions", icon: "\uD83D\uDCB0", section: "operations" },
  { href: "/imputations", label: "Historique Encaissements", icon: "\uD83E\uDDFE", section: "operations" },
  { href: "/montants-attendus", label: "Montants attendus", icon: "\uD83D\uDCCC", section: "operations" },
  { href: "/decaissements", label: "D\u00E9caissements", icon: "\uD83D\uDCB8", section: "operations" },

  { href: "/aides", label: "Aides / Secours / Pr\u00EAts", icon: "\uD83E\uDD1D", section: "support" },
  { href: "/prets-aides", label: "Suivi Pr\u00EAts / Aides", icon: "\uD83D\uDCC9", section: "support" },
  { href: "/documents", label: "Documents", icon: "\uD83D\uDCC2", section: "support" },

  { href: "/admin/roles", label: "Administration", icon: "\u2699\uFE0F", section: "admin" },
  { href: "/admin/notifications", label: "Notifications", icon: "\uD83D\uDCE2", section: "admin" },
  { href: "/admin/import-export", label: "Import / Export", icon: "\uD83D\uDCE5", section: "admin" },
  { href: "/admin/import-export/tontine-gagnants", label: "Import gagnants tontine", icon: "\uD83C\uDFC6", section: "admin" },
];

const sections = [
  { key: "pilotage", label: "Pilotage" },
  { key: "operations", label: "Op\u00E9rations" },
  { key: "support", label: "Support" },
  { key: "admin", label: "Administration" },
] as const;

function normalizeRoleLabel(role: unknown, roleCode: unknown) {
  const libelle = String(role || "").trim();
  if (libelle) return libelle;

  const code = String(roleCode || "").trim();
  return code || null;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const auth: any = useAuth?.() ?? {};

  const displayedRole = normalizeRoleLabel(
    auth?.member?.role,
    auth?.member?.roleCode
  );

  const displayedName = String(auth?.member?.nom || "").trim();

  const showRoleBadge =
    auth?.loading !== true && !!displayedRole;

  const showMemberName =
    auth?.loading !== true && !!displayedName;

  return (
    <aside className="hidden xl:flex xl:w-[300px] xl:flex-col xl:h-screen xl:shrink-0 xl:border-r xl:border-emerald-100 xl:bg-white">

      <div className="shrink-0 border-b border-emerald-100 px-5 py-4">

        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Association Famille NTOL
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950">
          ASF-NTOL
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          {"Navigation compl\u00E8te de l\u2019application."}
        </p>

        {showMemberName ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">

            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {"Membre connect\u00E9"}
            </p>

            <p className="mt-1 text-sm font-bold text-emerald-950">
              {displayedName}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              {displayedRole || "R\u00F4le indisponible"}
            </p>

          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">

          {showRoleBadge ? (
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              {displayedRole}
            </div>
          ) : null}

          <LogoutButton compact />

        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">

        {sections.map((section) => {

          const items =
            navItems.filter(
              (item) => item.section === section.key
            );

          if (items.length === 0) return null;

          return (
            <div
              key={section.key}
              className="mb-5"
            >

              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {section.label}
              </p>

              <nav className="space-y-2">

                {items.map((item) => {

                  const active =
                    pathname === item.href ||
                    (
                      item.href !== "/" &&
                      item.href !== "/tontine" &&
                      pathname?.startsWith(`${item.href}/`)
                    );

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
                      <span className="text-lg">
                        {item.icon}
                      </span>

                      <span>
                        {item.label}
                      </span>

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