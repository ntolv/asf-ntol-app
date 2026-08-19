"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  HeartHandshake,
  PiggyBank,
} from "lucide-react";

const ITEMS = [
  {
    href: "/aides",
    label: "Aides",
    icon: HeartHandshake,
  },
  {
    href: "/prets",
    label: "Pr\u00EAts",
    icon: PiggyBank,
  },
  {
    href: "/prets-aides",
    label: "Suivi",
    icon: ClipboardList,
  },
  {
    href: "/gestion-demandes",
    label: "Demandes",
    icon: FileText,
  },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  if (href === "/prets" && pathname.startsWith("/prets/")) {
    return true;
  }

  return false;
}

export default function PretsAidesQuickNav() {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-7xl pb-4 xl:hidden">
      <nav
        aria-label="Navigation rapide Prêts et Aides"
        className="overflow-x-auto"
      >
        <div className="flex min-w-max gap-2 rounded-[22px] border border-emerald-100 bg-white p-2 shadow-sm">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-[44px] items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}