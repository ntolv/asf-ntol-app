"use client";

import {
  MobileHomeProHeader,
  MobileTopBar,
  MobileBankBottomNav,
} from "@/components/mobile";
import Link from "next/link";
import PushNotificationPanel from "@/components/push/PushNotificationPanel";

const quickActions = [
  { href: "/dashboard", label: "Accueil", description: "Vue générale" },
  { href: "/caisse", label: "Caisse", description: "Paiements et situation" },
  { href: "/tontine", label: "Tontine", description: "Cycle et sessions" },
  { href: "/encheres", label: "Enchères", description: "Lots et participation" },
  { href: "/membres", label: "Profil", description: "Compte et actions" },
];

const allPages = [
  { href: "/dashboard", label: "Dashboard", description: "Situation réelle du membre" },
  { href: "/bilan", label: "Bilan", description: "Bilan global de l'association" },
  { href: "/membres", label: "Membres", description: "Gestion et consultation des membres" },
  { href: "/contributions", label: "Contributions", description: "Contributions des membres" },
  { href: "/imputations", label: "Imputations", description: "Ventilation des montants" },
  { href: "/caisse", label: "Caisse", description: "Pilotage des fonds par rubrique" },
  { href: "/montants-attendus", label: "Montants attendus", description: "Paramétrage initial des attendus" },
  { href: "/decaissements", label: "Décaissements", description: "Sorties de fonds des caisses" },
  { href: "/tontine", label: "Tontine", description: "Cycles, sessions et suivi tontine" },
  { href: "/encheres", label: "Enchères", description: "Lots, participation et suivi" },
  { href: "/aides", label: "Aides / Secours / Prêts", description: "Transmission des demandes membre" },
  { href: "/gestion-demandes", label: "Gestion des demandes", description: "Validation bureau des aides et prêts" },
  { href: "/prets-aides", label: "Prêts / Aides", description: "Historique global de tous les membres" },
  { href: "/documents", label: "Documents", description: "Documents et pièces de l'association" },
  { href: "/admin/roles", label: "Administration des rôles", description: "Gestion des accès et rôles" },
];

export default function HomePage() {
  return (
    <>
      <div className="xl:hidden">
        <div className="flex min-w-0 flex-col px-4 py-4 pb-[150px]">
          <div className="mb-4">
            <MobileTopBar
              title="Accueil"
              subtitle="Association Famille NTOL"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <MobileHomeProHeader />
            <PushNotificationPanel />

            <section className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Application mobile
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                Bienvenue sur ASF-NTOL
              </h1>
              <p className="mt-3 text-sm text-slate-600">
                Accédez rapidement à vos fonctionnalités principales : caisse,
                tontine, enchères et profil.
              </p>
            </section>

            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Accès principal
              </p>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[24px] border border-slate-200 bg-white p-5"
                  >
                    <p className="text-xl font-bold text-slate-900">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Toutes les pages
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Accès complet
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Retrouvez ici toutes les pages de l’application, au-delà de la
                  navigation basse.
                </p>
              </div>

              <div className="grid gap-3">
                {allPages.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="text-base font-bold text-slate-900">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>

        <MobileBankBottomNav />
      </div>

      <div className="hidden xl:block">
        <div className="space-y-6 p-4 md:p-6">
          <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Association Famille NTOL
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                Bienvenue sur ASF-NTOL
              </h1>
              <p className="mt-3 text-sm text-slate-600 md:text-base">
                Accès rapide à toutes les pages principales de l'application.
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allPages.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Accès rapide
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {item.label}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {item.description}
                </p>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}