"use client";

import DomainQuickNav from "@/components/navigation/DomainQuickNav";

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
  },
  {
    href: "/decaissements",
    label: "Sorties",
  },
];

export default function FinanceQuickNav() {
  return (
    <DomainQuickNav
      title="Finances"
      items={ITEMS}
      columns={3}
    />
  );
}