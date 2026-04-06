"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, HandCoins, Gavel, UserRound } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home, exact: true },
  { href: "/caisse", label: "Caisse", icon: Wallet },
  { href: "/tontine", label: "Tontine", icon: HandCoins },
  { href: "/encheres", label: "Enchères", icon: Gavel },
  { href: "/membres", label: "Profil", icon: UserRound },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileBankBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 xl:hidden">
      <div className="mx-auto max-w-[640px] px-3 pb-3">
        <nav
          aria-label="Navigation mobile principale"
          className="rounded-[24px] border border-slate-200 bg-white px-2 py-2 shadow-sm"
        >
          <div className="grid grid-cols-5 gap-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[18px] px-2 py-2 text-center",
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-500",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}