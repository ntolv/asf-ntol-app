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
    <div className="mobile-bank-nav-shell xl:hidden">
      <nav className="mobile-bank-nav" aria-label="Navigation mobile principale">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={["mobile-bank-nav__item", active ? "is-active" : ""].join(" ")}
            >
              <span className="mobile-bank-nav__icon-wrap" aria-hidden="true">
                <Icon className="mobile-bank-nav__icon" />
              </span>
              <span className="mobile-bank-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}