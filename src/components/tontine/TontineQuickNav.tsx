"use client";

import DomainQuickNav from "@/components/navigation/DomainQuickNav";

const ITEMS = [
  {
    href: "/tontine",
    label: "Tontine",
  },
  {
    href: "/encheres",
    label: "Ench\u00E8res",
  },
  {
    href: "/tontine/historique",
    label: "Historique",
  },
  {
    href: "/tontine/suivi-cycle",
    label: "Suivi cycle",
  },
];

export default function TontineQuickNav() {
  return (
    <DomainQuickNav
      title="Tontine"
      items={ITEMS}
      columns={2}
    />
  );
}