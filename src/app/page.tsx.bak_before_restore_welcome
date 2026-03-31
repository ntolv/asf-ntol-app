"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import InstallAppButton from "@/components/app/InstallAppButton";
import AppNotificationsCenter from "@/components/app/AppNotificationsCenter";

type QuickLink = {
  href: string;
  title: string;
  description: string;
  icon: string;
};

const quickLinks: QuickLink[] = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Vue analytique et lecture globale du système.",
    icon: "📊"
  },
  {
    href: "/tontine",
    title: "Tontine",
    description: "Cycle, sessions et pilotage de la tontine.",
    icon: "💚"
  },
  {
    href: "/encheres",
    title: "Enchères",
    description: "Salle d’enchères, lots actifs et participation live.",
    icon: "🔥"
  },
  {
    href: "/membres",
    title: "Membres",
    description: "Consultation et gestion des profils membres.",
    icon: "👥"
  },
  {
    href: "/contributions",
    title: "Contributions",
    description: "Suivi des versements et situations de contributions.",
    icon: "💰"
  },
  {
    href: "/imputations",
    title: "Imputations",
    description: "Répartition et lecture des opérations d’imputation.",
    icon: "🧾"
  },
  {
    href: "/caisse",
    title: "Caisse",
    description: "Lecture et suivi des éléments de caisse.",
    icon: "🏦"
  },
  {
    href: "/aides",
    title: "Aides / Secours",
    description: "Aides, secours et accompagnement associatif.",
    icon: "🤝"
  },
  {
    href: "/investissements",
    title: "Investissements / Prêts",
    description: "Investissements, prêts et remboursements.",
    icon: "📈"
  },
  {
    href: "/documents",
    title: "Documents",
    description: "Espace documentaire de l’application.",
    icon: "📂"
  },
  {
    href: "/admin/roles",
    title: "Administration",
    description: "Gestion des rôles et paramétrage d’accès.",
    icon: "⚙️"
  }
];

function getDisplayedRoleLabel(role: unknown) {
  const value = String(role || "").trim();
  return value ? value : "Rôle backend";
}

export default function HomePage() {
  const auth: any = useAuth?.() ?? {};
  const role = auth?.member?.role ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white pb-28">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 md:px-6 md:py-6">
        
<section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-emerald-950 md:text-xl">
                Accès rapides
              </h2>
              <p className="text-sm text-emerald-900/65">
                Toutes les pages de l’application sont accessibles depuis cet accueil.
              </p>
            </div>

            <div className="hidden rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm md:inline-flex">
              Navigation centrale
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/30"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-2xl shadow-sm">
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-emerald-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-900/70">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <InstallAppButton />
    </main>
  );
}