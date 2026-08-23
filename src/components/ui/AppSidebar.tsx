"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Calculator,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileClock,
  FileDown,
  FileText,
  Gavel,
  HandCoins,
  HeartHandshake,
  History,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import LogoutButton from "@/components/auth/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bureauOnly?: boolean;
};

type GroupKey =
  | "finances"
  | "tontine"
  | "prets-aides"
  | "membres"
  | "administration";

type NavGroup = {
  key: GroupKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

const SIDEBAR_COMPACT_KEY =
  "asf-ntol-sidebar-compact";

const FINANCES_ITEMS: NavItem[] = [
  {
    href: "/caisse",
    label: "Caisse",
    icon: Wallet,
  },
  {
    href: "/bilan",
    label: "Bilan",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/contributions",
    label: "Contributions",
    icon: CircleDollarSign,
  },
  {
    href: "/imputations",
    label: "Historique des encaissements",
    icon: History,
  },
  {
    href: "/montants-attendus",
    label: "Montants attendus",
    icon: Calculator,
    bureauOnly: true,
  },
  {
    href: "/decaissements",
    label: "D\u00E9caissements",
    icon: ReceiptText,
  },
];

const TONTINE_ITEMS: NavItem[] = [
  {
    href: "/tontine",
    label: "Gestion Tontine",
    icon: HandCoins,
    bureauOnly: true,
  },
  {
    href: "/encheres",
    label: "Ench\u00E8res",
    icon: Gavel,
  },
  {
    href: "/tontine/historique",
    label: "Historique Tontine",
    icon: FileClock,
  },
  {
    href: "/tontine/suivi-cycle",
    label: "Suivi cycle",
    icon: TrendingUp,
  },
];

const PRETS_AIDES_ITEMS: NavItem[] = [
  {
    href: "/aides",
    label: "Aides / Secours / Pr\u00EAts",
    icon: HeartHandshake,
  },
  {
    href: "/prets",
    label: "Pr\u00EAts",
    icon: PiggyBank,
  },
  {
    href: "/prets-aides",
    label: "Suivi Pr\u00EAts / Aides",
    icon: ClipboardList,
  },
  {
    href: "/gestion-demandes",
    label: "Gestion des demandes",
    icon: FileText,
  },
];

const MEMBRES_ITEMS: NavItem[] = [
  {
    href: "/membres",
    label: "Membres",
    icon: Users,
  },
  {
    href: "/membres-connectes",
    label: "Membres connect\u00E9s",
    icon: UserRound,
  },
  {
    href: "/alertes",
    label: "Alertes",
    icon: Bell,
  },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    href: "/admin/audit",
    label: "Journal général",
    icon: History,
  },
  {
    href: "/admin/roles",
    label: "Administration des r\u00F4les",
    icon: ShieldCheck,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/admin/import-export",
    label: "Import / Export",
    icon: FileDown,
  },
  {
    href: "/admin/import-export/tontine-gagnants",
    label: "Import gagnants Tontine",
    icon: HandCoins,
  },
];

const GROUPS: NavGroup[] = [
  {
    key: "finances",
    label: "Finances",
    icon: Wallet,
    items: FINANCES_ITEMS,
  },
  {
    key: "tontine",
    label: "Tontine",
    icon: HandCoins,
    items: TONTINE_ITEMS,
  },
  {
    key: "prets-aides",
    label: "Pr\u00EAts & Aides",
    icon: HeartHandshake,
    items: PRETS_AIDES_ITEMS,
  },
  {
    key: "membres",
    label: "Membres",
    icon: Users,
    items: MEMBRES_ITEMS,
  },
  {
    key: "administration",
    label: "Administration",
    icon: ShieldCheck,
    items: ADMIN_ITEMS,
  },
];

function normalizeRoleLabel(
  role: unknown,
  roleCode: unknown
) {
  const libelle = String(role || "").trim();

  if (libelle) {
    return libelle;
  }

  const code = String(roleCode || "").trim();

  return code || null;
}

function isBureauRole(
  role: unknown,
  roleCode: unknown
) {
  const raw =
    `${String(roleCode || "")} ${String(role || "")}`.toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

function itemIsActive(
  pathname: string,
  href: string
) {
  if (pathname === href) {
    return true;
  }

  if (
    href === "/prets" &&
    pathname.startsWith("/prets/")
  ) {
    return true;
  }

  return false;
}

function findActiveGroup(
  pathname: string
): GroupKey | null {
  for (const group of GROUPS) {
    if (
      group.items.some((item) =>
        itemIsActive(pathname, item.href)
      )
    ) {
      return group.key;
    }
  }

  return null;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const auth: any = useAuth?.() ?? {};

  const [openGroup, setOpenGroup] =
    useState<GroupKey | null>(null);

  const [compact, setCompact] =
    useState(false);

  const displayedRole =
    normalizeRoleLabel(
      auth?.member?.role,
      auth?.member?.roleCode
    );

  const canAccessBureau =
    isBureauRole(
      auth?.member?.role,
      auth?.member?.roleCode
    );

  const displayedName = String(
    auth?.member?.nom || ""
  ).trim();

  const showRoleBadge =
    auth?.loading !== true &&
    !!displayedRole;

  const showMemberName =
    auth?.loading !== true &&
    !!displayedName;

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(
          SIDEBAR_COMPACT_KEY
        );

      setCompact(saved === "1");
    } catch {
      // LocalStorage peut être indisponible.
    }
  }, []);

  useEffect(() => {
    const activeGroup =
      findActiveGroup(pathname);

    if (activeGroup) {
      setOpenGroup(activeGroup);
    }
  }, [pathname]);

  function setCompactMode(
    nextCompact: boolean
  ) {
    setCompact(nextCompact);

    try {
      window.localStorage.setItem(
        SIDEBAR_COMPACT_KEY,
        nextCompact ? "1" : "0"
      );
    } catch {
      // La navigation reste fonctionnelle
      // même si LocalStorage est indisponible.
    }
  }

  function toggleGroup(key: GroupKey) {
    if (compact) {
      setCompactMode(false);
      setOpenGroup(key);
      return;
    }

    setOpenGroup((current) =>
      current === key ? null : key
    );
  }

  const dashboardActive =
    pathname === "/";

  const bureauActive =
    pathname === "/bureau";

  const documentsActive =
    pathname === "/documents";

  return (
    <aside
      className={[
        "sticky top-0 hidden shrink-0 self-start flex-col border-r border-emerald-100 bg-white",
        "transition-[width] duration-200 ease-out xl:flex",
        compact
          ? "w-[76px]"
          : "w-[300px]",
      ].join(" ")}
    >
      <div
        className={[
          "shrink-0 border-b border-emerald-100",
          compact
            ? "px-2 py-3"
            : "px-5 py-4",
        ].join(" ")}
      >
        {compact ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white shadow-sm"
              title="ASF-NTOL"
            >
              ASF
            </div>

            <button
              type="button"
              onClick={() =>
                setCompactMode(false)
              }
              aria-label="Agrandir le menu"
              title="Agrandir le menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 text-emerald-800 transition hover:bg-emerald-50"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Association Famille NTOL
                </p>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950">
                  ASF-NTOL
                </h1>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCompactMode(true)
                }
                aria-label="Réduire le menu"
                title="Réduire le menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 text-emerald-800 transition hover:bg-emerald-50"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>

            {showMemberName ? (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {"Membre connect\u00E9"}
                </p>

                <p className="mt-1 text-sm font-bold text-emerald-950">
                  {displayedName}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {displayedRole ||
                    "R\u00F4le indisponible"}
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
          </>
        )}
      </div>

      <div
        className={[
          "py-4",
          compact ? "px-2" : "px-4",
        ].join(" ")}
      >
        <nav className="space-y-2">
          <Link
            href="/"
            aria-current={
              dashboardActive
                ? "page"
                : undefined
            }
            aria-label={
              compact
                ? "Dashboard"
                : undefined
            }
            title={
              compact
                ? "Dashboard"
                : undefined
            }
            className={[
              "flex items-center rounded-2xl border py-3 text-sm font-semibold transition",
              compact
                ? "justify-center px-0"
                : "gap-3 px-4",
              dashboardActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm"
                : "border-transparent text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/50",
            ].join(" ")}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />

            {!compact ? (
              <span>Dashboard</span>
            ) : null}
          </Link>

          {canAccessBureau ? (
            <Link
              href="/bureau"
              aria-current={
                bureauActive
                  ? "page"
                  : undefined
              }
              aria-label={
                compact
                  ? "Dashboard Bureau"
                  : undefined
              }
              title={
                compact
                  ? "Dashboard Bureau"
                  : undefined
              }
              className={[
                "flex items-center rounded-2xl border py-3 text-sm font-semibold transition",
                compact
                  ? "justify-center px-0"
                  : "gap-3 px-4",
                bureauActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm"
                  : "border-transparent text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/50",
              ].join(" ")}
            >
              <ShieldCheck className="h-5 w-5 shrink-0" />

              {!compact ? (
                <span>Dashboard Bureau</span>
              ) : null}
            </Link>
          ) : null}

          <div className="my-3 border-t border-slate-100" />

          {GROUPS
            .filter(
              (group) =>
                group.key !==
                "administration"
            )
            .map((group) => {
              const GroupIcon =
                group.icon;

              const isOpen =
                openGroup ===
                group.key;

              const groupActive =
                group.items.some(
                  (item) =>
                    itemIsActive(
                      pathname,
                      item.href
                    )
                );

              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() =>
                      toggleGroup(
                        group.key
                      )
                    }
                    aria-expanded={
                      compact
                        ? false
                        : isOpen
                    }
                    aria-label={
                      compact
                        ? group.label
                        : undefined
                    }
                    title={
                      compact
                        ? group.label
                        : undefined
                    }
                    className={[
                      "flex w-full items-center rounded-2xl border py-3 text-left text-sm font-semibold transition",
                      compact
                        ? "justify-center px-0"
                        : "justify-between px-4",
                      groupActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-transparent text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex items-center",
                        compact
                          ? "justify-center"
                          : "gap-3",
                      ].join(" ")}
                    >
                      <GroupIcon className="h-5 w-5 shrink-0" />

                      {!compact ? (
                        <span>
                          {group.label}
                        </span>
                      ) : null}
                    </span>

                    {!compact ? (
                      <ChevronDown
                        className={[
                          "h-4 w-4 shrink-0 transition-transform",
                          isOpen
                            ? "rotate-180"
                            : "",
                        ].join(" ")}
                      />
                    ) : null}
                  </button>

                  {!compact &&
                  isOpen ? (
                    <div className="ml-5 mt-1 space-y-1 border-l border-emerald-100 pl-3">
                      {group.items.filter((item) => !item.bureauOnly || canAccessBureau).map(
                        (item) => {
                          const ItemIcon =
                            item.icon;

                          const active =
                            itemIsActive(
                              pathname,
                              item.href
                            );

                          return (
                            <Link
                              key={
                                item.href
                              }
                              href={
                                item.href
                              }
                              aria-current={
                                active
                                  ? "page"
                                  : undefined
                              }
                              className={[
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                                active
                                  ? "bg-emerald-600 font-semibold text-white shadow-sm"
                                  : "font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-900",
                              ].join(" ")}
                            >
                              <ItemIcon className="h-4 w-4 shrink-0" />

                              <span>
                                {
                                  item.label
                                }
                              </span>
                            </Link>
                          );
                        }
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}

          <Link
            href="/documents"
            aria-current={
              documentsActive
                ? "page"
                : undefined
            }
            aria-label={
              compact
                ? "Documents"
                : undefined
            }
            title={
              compact
                ? "Documents"
                : undefined
            }
            className={[
              "flex items-center rounded-2xl border py-3 text-sm font-semibold transition",
              compact
                ? "justify-center px-0"
                : "gap-3 px-4",
              documentsActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm"
                : "border-transparent text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/50",
            ].join(" ")}
          >
            <BookOpen className="h-5 w-5 shrink-0" />

            {!compact ? (
              <span>Documents</span>
            ) : null}
          </Link>

          <div className="my-4 border-t border-slate-200" />

          {GROUPS
            .filter(
              (group) =>
                group.key ===
                "administration"
            )
            .map((group) => {
              const GroupIcon =
                group.icon;

              const isOpen =
                openGroup ===
                group.key;

              const groupActive =
                group.items.some(
                  (item) =>
                    itemIsActive(
                      pathname,
                      item.href
                    )
                );

              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() =>
                      toggleGroup(
                        group.key
                      )
                    }
                    aria-expanded={
                      compact
                        ? false
                        : isOpen
                    }
                    aria-label={
                      compact
                        ? "Administration"
                        : undefined
                    }
                    title={
                      compact
                        ? "Administration"
                        : undefined
                    }
                    className={[
                      "flex w-full items-center rounded-2xl border py-3 text-left text-sm font-semibold transition",
                      compact
                        ? "justify-center px-0"
                        : "justify-between px-4",
                      groupActive
                        ? "border-slate-300 bg-slate-100 text-slate-950"
                        : "border-transparent text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex items-center",
                        compact
                          ? "justify-center"
                          : "gap-3",
                      ].join(" ")}
                    >
                      <GroupIcon className="h-5 w-5 shrink-0" />

                      {!compact ? (
                        <span>
                          Administration
                        </span>
                      ) : null}
                    </span>

                    {!compact ? (
                      <ChevronDown
                        className={[
                          "h-4 w-4 shrink-0 transition-transform",
                          isOpen
                            ? "rotate-180"
                            : "",
                        ].join(" ")}
                      />
                    ) : null}
                  </button>

                  {!compact &&
                  isOpen ? (
                    <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
                      {group.items.filter((item) => !item.bureauOnly || canAccessBureau).map(
                        (item) => {
                          const ItemIcon =
                            item.icon;

                          const active =
                            itemIsActive(
                              pathname,
                              item.href
                            );

                          return (
                            <Link
                              key={
                                item.href
                              }
                              href={
                                item.href
                              }
                              aria-current={
                                active
                                  ? "page"
                                  : undefined
                              }
                              className={[
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                                active
                                  ? "bg-slate-900 font-semibold text-white"
                                  : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                              ].join(" ")}
                            >
                              <ItemIcon className="h-4 w-4 shrink-0" />

                              <span>
                                {
                                  item.label
                                }
                              </span>
                            </Link>
                          );
                        }
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </nav>
      </div>
    </aside>
  );
}