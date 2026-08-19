"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  FileClock,
  FileDown,
  FileText,
  Gavel,
  HandCoins,
  HeartHandshake,
  History,
  Home,
  LayoutDashboard,
  Menu,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const BOTTOM_ITEMS: MenuItem[] = [
  {
    href: "/",
    label: "Accueil",
    icon: Home,
  },
  {
    href: "/caisse",
    label: "Finances",
    icon: Wallet,
  },
  {
    href: "/tontine",
    label: "Tontine",
    icon: HandCoins,
  },
  {
    href: "/membres",
    label: "Membres",
    icon: Users,
  },
];

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Pilotage",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: "/bilan",
        label: "Bilan",
        icon: ChartNoAxesCombined,
      },
      {
        href: "/caisse",
        label: "Caisse",
        icon: Wallet,
      },
      {
        href: "/alertes",
        label: "Alertes",
        icon: Bell,
      },
      {
        href: "/membres-connectes",
        label: "Membres connect\u00E9s",
        icon: Users,
      },
    ],
  },

  {
    title: "Finances",
    items: [
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
      },
      {
        href: "/decaissements",
        label: "D\u00E9caissements",
        icon: ReceiptText,
      },
    ],
  },

  {
    title: "Tontine",
    items: [
      {
        href: "/tontine",
        label: "Tontine",
        icon: HandCoins,
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
        label: "Suivi cycle Tontine",
        icon: TrendingUp,
      },
    ],
  },

  {
    title: "Pr\u00EAts & Aides",
    items: [
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
    ],
  },

  {
    title: "Membres & Documents",
    items: [
      {
        href: "/membres",
        label: "Membres",
        icon: UserRound,
      },
      {
        href: "/documents",
        label: "Documents",
        icon: BookOpen,
      },
    ],
  },

  {
    title: "Administration",
    items: [
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
    ],
  },
];

const ALL_MENU_ROUTES = MENU_SECTIONS.flatMap((section) =>
  section.items.map((item) => item.href)
);

function bottomItemActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/caisse") {
    return (
      pathname === "/caisse" ||
      pathname === "/bilan" ||
      pathname === "/contributions" ||
      pathname === "/imputations" ||
      pathname === "/montants-attendus" ||
      pathname === "/decaissements"
    );
  }

  if (href === "/tontine") {
    return (
      pathname === "/tontine" ||
      pathname.startsWith("/tontine/") ||
      pathname === "/encheres"
    );
  }

  if (href === "/membres") {
    return (
      pathname === "/membres" ||
      pathname === "/membres-connectes"
    );
  }

  return pathname === href;
}

function menuItemActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  const exactRouteExists = ALL_MENU_ROUTES.some(
    (route) => route === pathname
  );

  if (exactRouteExists) {
    return false;
  }

  if (href === "/prets" && pathname.startsWith("/prets/")) {
    return true;
  }

  return false;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const menuContainsCurrentPage = useMemo(() => {
    return MENU_SECTIONS.some((section) =>
      section.items.some((item) =>
        menuItemActive(pathname, item.href)
      )
    );
  }, [pathname]);

  return (
    <>
      {menuOpen ? (
        <div className="fixed inset-0 z-[70] bg-slate-50 xl:hidden">
          <div className="flex h-full flex-col">
            <header className="shrink-0 border-b border-emerald-100 bg-white px-4 py-4">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    ASF-NTOL
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-emerald-950">
                    Menu
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Toutes les pages de l'application
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fermer le menu"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28">
              <div className="mx-auto max-w-2xl space-y-6">
                {MENU_SECTIONS.map((section) => (
                  <section key={section.title}>
                    <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      {section.title}
                    </h3>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = menuItemActive(
                          pathname,
                          item.href
                        );

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={
                              active ? "page" : undefined
                            }
                            className={[
                              "flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 py-3 transition",
                              active
                                ? "border-emerald-300 bg-emerald-100 text-emerald-950 shadow-sm"
                                : "border-slate-200 bg-white text-slate-700",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                active
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-600",
                              ].join(" ")}
                            >
                              <Icon className="h-5 w-5" />
                            </span>

                            <span className="text-sm font-semibold leading-tight">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        data-mobile-bottom-nav="true"
        className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 backdrop-blur xl:hidden"
      >
        <nav
          aria-label="Navigation mobile principale"
          className="mx-auto grid max-w-[640px] grid-cols-5 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
        >
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = bottomItemActive(
              pathname,
              item.href
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center",
                  active
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />

                <span className="text-[10px] font-semibold leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Ouvrir le menu complet"
            aria-expanded={menuOpen}
            className={[
              "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center",
              menuOpen || menuContainsCurrentPage
                ? "bg-slate-900 text-white"
                : "text-slate-500",
            ].join(" ")}
          >
            <Menu className="h-5 w-5" />

            <span className="text-[10px] font-semibold leading-tight">
              Menu
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}