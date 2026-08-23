"use client";

import DomainQuickNav from "@/components/navigation/DomainQuickNav";
import { useAuth } from "@/hooks/useAuth";

const ITEMS = [
  {
    href: "/caisse",
    label: "Caisse",
  },
  {
    href: "/bilan",
    label: "Bilan",
  },
  {
    href: "/contributions",
    label: "Contributions",
  },
  {
    href: "/imputations",
    label: "Historique",
  },
  {
    href: "/montants-attendus",
    label: "Attendus",
    bureauOnly: true,
  },
  {
    href: "/decaissements",
    label: "Sorties",
  },
];

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

export default function FinanceQuickNav() {
  const auth: any = useAuth?.() ?? {};

  const canAccessBureau =
    isBureauRole(
      auth?.member?.role,
      auth?.member?.roleCode
    );

  const visibleItems =
    ITEMS
      .filter(
        (item) =>
          !item.bureauOnly ||
          canAccessBureau
      )
      .map(({ bureauOnly, ...item }) => item);

  return (
    <DomainQuickNav
      title="Finances"
      items={visibleItems}
      columns={3}
    />
  );
}