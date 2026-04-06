"use client";

import MobileStatusBadge from "./MobileStatusBadge";

export type MobileCaisseSummary = {
  totalAttendu: string;
  totalVerse: string;
  resteAPayer: string;
  totalEncheres?: string;
};

export type MobileCaisseRubriqueItem = {
  id: string;
  label: string;
  attendu: string;
  verse: string;
  reste: string;
  statutLabel: string;
  statutTone?: "success" | "warning" | "danger" | "neutral";
};

export type MobileCaisseMovementItem = {
  id: string;
  title: string;
  subtitle?: string;
  amount: string;
  meta?: string;
  tone?: "success" | "warning" | "danger" | "neutral";
};

type MobileCaisseBankingProps = {
  summary: MobileCaisseSummary;
  rubriques: MobileCaisseRubriqueItem[];
  mouvements: MobileCaisseMovementItem[];
};

function EmptyBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}

export default function MobileCaisseBanking({
  summary,
  rubriques,
  mouvements,
}: MobileCaisseBankingProps) {
  return (
    <section className="space-y-5 xl:hidden">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Caisse
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Vue bancaire mobile
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Lecture claire des montants, des rubriques, des mouvements et du total enchères.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-[24px] bg-emerald-600 px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
              Total attendu
            </p>
            <p className="mt-2 text-2xl font-black">{summary.totalAttendu}</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Total versé
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">{summary.totalVerse}</p>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Reste à payer
            </p>
            <p className="mt-2 text-2xl font-black text-slate-900">{summary.resteAPayer}</p>
          </div>

          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Montant total des enchères
            </p>
            <p className="mt-2 text-2xl font-black text-amber-700">
              {summary.totalEncheres || "0 FCFA"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Rubriques
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            Situation par rubrique
          </h3>
        </div>

        {rubriques.length === 0 ? (
          <EmptyBlock
            title="Aucune rubrique visible"
            text="Les rubriques de caisse s'afficheront ici dès que les données seront branchées."
          />
        ) : (
          <div className="space-y-3">
            {rubriques.map((item) => (
              <article key={item.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">{item.label}</p>
                  </div>

                  <MobileStatusBadge
                    label={item.statutLabel}
                    tone={item.statutTone ?? "neutral"}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Attendu
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{item.attendu}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Versé
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{item.verse}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Reste
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{item.reste}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Historique
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            Mouvements récents
          </h3>
        </div>

        {mouvements.length === 0 ? (
          <EmptyBlock
            title="Aucun mouvement récent"
            text="Les mouvements de caisse apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {mouvements.map((item) => (
              <article key={item.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">{item.title}</p>
                    {item.subtitle ? (
                      <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
                    ) : null}
                    {item.meta ? (
                      <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{item.amount}</p>
                    <div className="mt-2 flex justify-end">
                      <MobileStatusBadge
                        label={
                          item.tone === "success"
                            ? "Validé"
                            : item.tone === "warning"
                            ? "En attente"
                            : item.tone === "danger"
                            ? "Alerte"
                            : "Info"
                        }
                        tone={item.tone ?? "neutral"}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}