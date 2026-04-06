"use client";

import MobileCaisseBankingConnected from "@/components/mobile/MobileCaisseBankingConnected";

export default function CaissePage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Caisse
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
            Pilotage des fonds
          </h1>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            Vue réelle des montants attendus, versés, restes à payer, rubriques, mouvements récents et total des enchères.
          </p>
        </div>
      </section>

      <MobileCaisseBankingConnected />
    </div>
  );
}