"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  History,
  ReceiptText,
  Wallet,
} from "lucide-react";

const ITEMS = [
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
    label: "Historique",
    icon: History,
  },
  {
    href: "/montants-attendus",
    label: "Attendus",
    icon: Calculator,
  },
  {
    href: "/decaissements",
    label: "D\u00E9caissements",
    icon: ReceiptText,
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href;
}

export default function FinanceQuickNav() {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-7xl pb-4 xl:hidden">
      <nav
        aria-label="Navigation rapide Finances"
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