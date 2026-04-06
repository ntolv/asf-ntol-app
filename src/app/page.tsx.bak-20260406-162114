"use client";

import { MobileHomeProHeader } from "@/components/mobile";
import { MobilePageShell, MobileTopBar, MobileBottomNav } from "@/components/mobile";
import HomeLogoutButton from "@/components/home/HomeLogoutButton";
import Link from "next/link";
import PushNotificationPanel from "@/components/push/PushNotificationPanel";

const mobileNavItems = [
  { href: "/", label: "Accueil", exact: true },
  { href: "/caisse", label: "Caisse" },
  { href: "/tontine", label: "Tontine" },
  { href: "/encheres", label: "Enchères" },
  { href: "/membres", label: "Profil" },
];

const quickLinks = [
  { href: "/dashboard", label: "Dashboard", description: "Situation réelle du membre" },
  { href: "/bilan", label: "Bilan", description: "Bilan global de l'association" },
  { href: "/membres", label: "Membres", description: "Gestion et consultation des membres" },
  { href: "/contributions", label: "Contributions", description: "Contributions des membres" },
  { href: "/montants-attendus", label: "Montants attendus", description: "Paramétrage initial des attendus" },
  { href: "/caisse", label: "Caisse", description: "Pilotage des fonds par rubrique" },
  { href: "/decaissements", label: "Décaissements", description: "Sorties de fonds des caisses" },
  { href: "/tontine", label: "Tontine", description: "Cycles, sessions et suivi Tontine" },
  { href: "/aides", label: "Aides / Secours / Prêts", description: "Transmission des demandes membre" },
  { href: "/gestion-demandes", label: "Gestion des demandes", description: "Validation bureau des aides et prêts" },
  { href: "/prets-aides", label: "Prêts / Aides", description: "Historique global de tous les membres" },
  { href: "/documents", label: "Documents", description: "Documents et pièces de l'association" },
  { href: "/admin/roles", label: "Administration des rôles", description: "Gestion des accès et rôles" }
];

export default function HomePage() {
  return (
    <>
      <MobilePageShell
        pageTitle="Accueil"
        topBar={<MobileTopBar title="Accueil" subtitle="Association Famille NTOL" />}
        bottomNav={<MobileBottomNav items={mobileNavItems} />}
      >
        <div data-mobile-home-content="true" className="flex flex-col gap-4">
          <MobileHomeProHeader />

          <PushNotificationPanel />

          <div className="mobile-bank-hero">
            <div>
              <p className="mobile-bank-hero__eyebrow">Bienvenue dans votre application</p>
              <h2 className="mobile-bank-hero__title">
                Bienvenue sur ASF-NTOL, votre plateforme de gestion associative
              </h2>
              <p className="mobile-bank-hero__text">
                Accédez rapidement à vos fonctionnalités : caisse, tontine, enchères, membres et plus encore.
              </p>
            </div>

            <div className="mobile-bank-hero__pill-row">
              <span className="mobile-bank-hero__pill">Application mobile</span>
              <span className="mobile-bank-hero__pill">Données fiables</span>
              <span className="mobile-bank-hero__pill">Système sécurisé</span>
            </div>
          </div>

          <div className="mobile-quick-actions-grid">
            <Link href="/dashboard" className="mobile-quick-action-card">
              <span className="mobile-quick-action-card__icon" aria-hidden="true">⌂</span>
              <span className="mobile-quick-action-card__body">
                <span className="mobile-quick-action-card__title">Accueil</span>
                <span className="mobile-quick-action-card__text">Vue générale</span>
              </span>
            </Link>

            <Link href="/caisse" className="mobile-quick-action-card">
              <span className="mobile-quick-action-card__icon" aria-hidden="true">◫</span>
              <span className="mobile-quick-action-card__body">
                <span className="mobile-quick-action-card__title">Caisse</span>
                <span className="mobile-quick-action-card__text">Paiements et situation</span>
              </span>
            </Link>

            <Link href="/tontine" className="mobile-quick-action-card">
              <span className="mobile-quick-action-card__icon" aria-hidden="true">◍</span>
              <span className="mobile-quick-action-card__body">
                <span className="mobile-quick-action-card__title">Tontine</span>
                <span className="mobile-quick-action-card__text">Cycle et sessions</span>
              </span>
            </Link>

            <Link href="/encheres" className="mobile-quick-action-card">
              <span className="mobile-quick-action-card__icon" aria-hidden="true">↗</span>
              <span className="mobile-quick-action-card__body">
                <span className="mobile-quick-action-card__title">Enchères</span>
                <span className="mobile-quick-action-card__text">Lots et participation</span>
              </span>
            </Link>

            <Link href="/membres" className="mobile-quick-action-card">
              <span className="mobile-quick-action-card__icon" aria-hidden="true">◉</span>
              <span className="mobile-quick-action-card__body">
                <span className="mobile-quick-action-card__title">Profil</span>
                <span className="mobile-quick-action-card__text">Compte et actions</span>
              </span>
            </Link>
          </div>

          <div data-mobile-home-live-block="true" className="mobile-live-dashboard-stack">
            <div className="space-y-6 p-4 md:p-6">
              <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
                <div className="max-w-4xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Association Famille NTOL
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
                    Bienvenue sur ASF-NTOL
                  </h1>
                  <HomeLogoutButton />
                  <p className="mt-3 text-sm text-slate-600 md:text-base">
                    Accès rapide à toutes les pages principales de l'application.
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {quickLinks.map((item) => (
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
        </div>
      </MobilePageShell>

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
              <HomeLogoutButton />
              <p className="mt-3 text-sm text-slate-600 md:text-base">
                Accès rapide à toutes les pages principales de l'application.
              </p>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((item) => (
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