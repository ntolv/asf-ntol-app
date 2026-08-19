"use client";

import DomainQuickNav from "@/components/navigation/DomainQuickNav";

const ITEMS = [
  {
    href: "/aides",
    label: "Aides",
  },
  {
    href: "/prets",
    label: "Pr\u00EAts",
  },
  {
    href: "/prets-aides",
    label: "Suivi",
  },
  {
    href: "/gestion-demandes",
    label: "Demandes",
  },
];

export default function PretsAidesQuickNav() {
  return (
    <DomainQuickNav
      title={"Pr\u00EAts & Aides"}
      items={ITEMS}
      columns={2}
    />
  );
}