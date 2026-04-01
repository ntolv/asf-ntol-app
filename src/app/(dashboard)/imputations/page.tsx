"use client";

export default function ImputationsPage() {
  return (
    <main className="space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          ASF-NTOL
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
          Imputations
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
          Cette page sera dédiée à la lecture des imputations générées automatiquement
          par le backend à partir des contributions enregistrées.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Historique des imputations
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Le bloc de saisie manuelle a été supprimé. L&apos;imputation est désormais
            réalisée automatiquement lors de l&apos;enregistrement d&apos;une contribution.
          </p>
        </div>
      </section>
    </main>
  );
}