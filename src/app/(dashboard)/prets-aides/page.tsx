"use client";

import Link from "next/link";
import SuiviAnnuelPretsAides from "@/components/prets-aides/SuiviAnnuelPretsAides";

export default function PretsAidesPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Prêts / Aides
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Suivi financier des prêts et aides
            </h1>

            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Pilotage des montants réellement octroyés, de leur financement par rubrique,
              des remboursements et des réaffectations.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/prets"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Suivi administratif
            </Link>

            <Link
              href="/caisse"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Retour à Caisse
            </Link>
          </div>
        </div>
      </section>

      <SuiviAnnuelPretsAides />
    </div>
  );
}