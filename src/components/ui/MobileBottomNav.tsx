"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/tontine", label: "Tontine", icon: "💚" },
  { href: "/encheres", label: "Enchères", icon: "🔥" },
  { href: "/membres", label: "Membres", icon: "👥" },
  { href: "/contributions", label: "Contrib.", icon: "💰" },
  { href: "/imputations", label: "Imput.", icon: "🧾" },
  { href: "/caisse", label: "Caisse", icon: "🏦" },
  { href: "/aides", label: "Aides", icon: "🤝" },
  { href: "/investissements", label: "Invest.", icon: "📈" },
  { href: "/documents", label: "Docs", icon: "📂" },
  { href: "/admin/roles", label: "Admin", icon: "⚙️" }
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-100 bg-white/95 backdrop-blur xl:hidden">
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-sm"
        >
          ↩ Retour
        </button>

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
                  ? "shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-sm"
                  : "shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-700"
              }
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <LogoutButton compact className="shrink-0 text-xs" />
      </div>
    </div>
  );
}