"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
  columns: 2 | 3;
};

const FINANCES: NavGroup = {
  title: "Finances",
  columns: 3,
  items: [
    { href: "/caisse", label: "Caisse" },
    { href: "/bilan", label: "Bilan" },
    { href: "/contributions", label: "Contributions" },
    { href: "/imputations", label: "Historique" },
    { href: "/montants-attendus", label: "Attendus" },
    { href: "/decaissements", label: "Sorties" },
  ],
};

const TONTINE: NavGroup = {
  title: "Tontine",
  columns: 2,
  items: [
    { href: "/tontine", label: "Tontine" },
    { href: "/encheres", label: "Ench\u00E8res" },
    { href: "/tontine/historique", label: "Historique" },
    { href: "/tontine/suivi-cycle", label: "Suivi cycle" },
  ],
};

const PRETS_AIDES: NavGroup = {
  title: "Pr\u00EAts & Aides",
  columns: 2,
  items: [
    { href: "/aides", label: "Aides" },
    { href: "/prets", label: "Pr\u00EAts" },
    { href: "/prets-aides", label: "Suivi" },
    { href: "/gestion-demandes", label: "Demandes" },
  ],
};

const MEMBRES: NavGroup = {
  title: "Membres",
  columns: 3,
  items: [
    { href: "/membres", label: "Membres" },
    { href: "/membres-connectes", label: "Connect\u00E9s" },
    { href: "/alertes", label: "Alertes" },
  ],
};

const ADMINISTRATION: NavGroup = {
  title: "Administration",
  columns: 2,
  items: [
    { href: "/admin/roles", label: "R\u00F4les" },
    { href: "/admin/notifications", label: "Notifications" },
    { href: "/admin/import-export", label: "Import / Export" },
    {
      href: "/admin/import-export/tontine-gagnants",
      label: "Gagnants Tontine",
    },
  ],
};

const GENERAL: NavGroup = {
  title: "Navigation",
  columns: 2,
  items: [
    { href: "/", label: "Accueil" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/membres", label: "Membres" },
    { href: "/documents", label: "Documents" },
  ],
};

function belongsTo(
  pathname: string,
  group: NavGroup
) {
  return group.items.some((item) => {
    if (pathname === item.href) {
      return true;
    }

    if (
      item.href === "/prets" &&
      pathname.startsWith("/prets/")
    ) {
      return true;
    }

    if (
      item.href === "/admin/import-export" &&
      pathname.startsWith("/admin/import-export/")
    ) {
      return true;
    }

    return false;
  });
}

function getCurrentGroup(
  pathname: string
): NavGroup {
  if (belongsTo(pathname, FINANCES)) {
    return FINANCES;
  }

  if (belongsTo(pathname, TONTINE)) {
    return TONTINE;
  }

  if (belongsTo(pathname, PRETS_AIDES)) {
    return PRETS_AIDES;
  }

  if (belongsTo(pathname, MEMBRES)) {
    return MEMBRES;
  }

  if (
    pathname.startsWith("/admin/")
  ) {
    return ADMINISTRATION;
  }

  return GENERAL;
}

function isActive(
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

export default function MobilePersistentQuickNav() {
  const pathname = usePathname();

  const group = getCurrentGroup(pathname);

  return (
    <div
      className="
        sticky top-0 z-40
        -mx-4 -mt-5 mb-5
        border-b border-emerald-100
        bg-white/95
        px-4 pb-3 pt-3
        shadow-sm
        backdrop-blur
        md:-mx-6 md:-mt-6 md:px-6
        xl:hidden
      "
    >
      <section className="rounded-2xl border border-emerald-100 bg-white p-3">
        <p className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">
          {group.title}
        </p>

        <nav
          className={[
            "grid gap-2",
            group.columns === 3
              ? "grid-cols-3"
              : "grid-cols-2",
          ].join(" ")}
        >
          {group.items.map((item) => {
            const active = isActive(
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
                  "flex min-h-[46px] items-center justify-center rounded-xl border px-2 py-2 text-center text-[12px] font-bold leading-tight transition",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-emerald-100 bg-emerald-50/60 text-emerald-950 active:bg-emerald-100",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </section>
    </div>
  );
}