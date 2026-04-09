"use client";

import { useEffect, useState } from "react";

type LigneDashboard = {
  membre_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_total_attendu: number;
  montant_total_verse: number;
  reste_a_payer: number;
  statut: "A_JOUR" | "PARTIEL" | "EN_RETARD";
};

type FinancementDashboard = {
  membre_id: string;
  nb_demandes_aides: number;
  nb_aides_en_attente: number;
  nb_aides_approuvees: number;
  nb_aides_refusees: number;
  total_aides_demande: number;
  total_aides_accorde: number;

  nb_demandes_prets: number;
  nb_prets_en_attente: number;
  nb_prets_approuves: number;
  nb_prets_refuses: number;
  total_prets_demande: number;
  total_prets_accorde: number;

  nb_prets_octroyes: number;
  nb_prets_en_cours: number;
  nb_prets_rembourses: number;
  total_prets_octroyes: number;
  total_solde_restant: number;
};

type DashboardResponse = {
  success: boolean;
  message?: string;
  data?: {
    rubriques: LigneDashboard[];
    financement: FinancementDashboard | null;
  };
};

function formatFcfa(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function formatStatut(value: LigneDashboard["statut"]) {
  if (value === "A_JOUR") return "À JOUR";
  if (value === "PARTIEL") return "PARTIEL";
  return "EN RETARD";
}

export default function DashboardPage() {
  const [rubriques, setRubriques] = useState<LigneDashboard[]>([]);
  const [financement, setFinancement] = useState<FinancementDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/dashboard/membre", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const rawText = await res.text();

      let json: DashboardResponse | null = null;

      try {
        json = rawText ? (JSON.parse(rawText) as DashboardResponse) : null;
      } catch {
        throw new Error(
          "L'API dashboard ne renvoie pas du JSON. Vérifie /api/dashboard/membre."
        );
      }

      if (!res.ok || !json?.success) {
        throw new Error(
          json?.message || "Erreur lors du chargement du dashboard."
        );
      }

      setRubriques(Array.isArray(json.data?.rubriques) ? json.data!.rubriques : []);
      setFinancement(json.data?.financement ?? null);
    } catch (err: any) {
      setRubriques([]);
      setFinancement(null);
      setError(err?.message || "Erreur lors du chargement du dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Dashboard
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
            Situation réelle du membre
          </h1>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            Cette page affiche la réalité des rubriques, des aides et des prêts du membre connecté.
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
          Chargement du dashboard...
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rubriques.map((ligne) => {
              const enRetard =
                ligne.statut === "EN_RETARD" ||
                Number(ligne.reste_a_payer || 0) > 0;

              return (
                <article
                  key={`${ligne.membre_id}-${ligne.rubrique_id}`}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {ligne.rubrique_nom}
                      </p>
                    </div>

                    {enRetard ? (
                      <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                        EN RETARD
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <span className="text-sm text-slate-500">Montant total attendu</span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatFcfa(ligne.montant_total_attendu)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                      <span className="text-sm text-slate-600">Montant total versé</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatFcfa(ligne.montant_total_verse)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                      <span className="text-sm text-slate-600">Reste à payer</span>
                      <span className="text-sm font-bold text-amber-700">
                        {formatFcfa(ligne.reste_a_payer)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                        ligne.statut === "A_JOUR"
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : ligne.statut === "PARTIEL"
                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                          : "border border-red-200 bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {formatStatut(ligne.statut)}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Aides / Secours
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Situation des aides
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Demandes d'aides</span>
                  <span className="text-sm font-bold text-slate-900">
                    {financement?.nb_demandes_aides ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <span className="text-sm text-slate-600">En attente</span>
                  <span className="text-sm font-bold text-amber-700">
                    {financement?.nb_aides_en_attente ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Approuvées</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {financement?.nb_aides_approuvees ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Refusées</span>
                  <span className="text-sm font-bold text-red-700">
                    {financement?.nb_aides_refusees ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <span className="text-sm text-slate-600">Total demandé</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatFcfa(financement?.total_aides_demande ?? 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Total accordé</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatFcfa(financement?.total_aides_accorde ?? 0)}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Prêts
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Situation des prêts
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Demandes de prêts</span>
                  <span className="text-sm font-bold text-slate-900">
                    {financement?.nb_demandes_prets ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Demandes en attente</span>
                  <span className="text-sm font-bold text-amber-700">
                    {financement?.nb_prets_en_attente ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Demandes approuvées</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {financement?.nb_prets_approuves ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Demandes refusées</span>
                  <span className="text-sm font-bold text-red-700">
                    {financement?.nb_prets_refuses ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <span className="text-sm text-slate-600">Prêts en cours</span>
                  <span className="text-sm font-bold text-slate-900">
                    {financement?.nb_prets_en_cours ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Prêts remboursés</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {financement?.nb_prets_rembourses ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <span className="text-sm text-slate-600">Total demandé</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatFcfa(financement?.total_prets_demande ?? 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Total accordé</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatFcfa(financement?.total_prets_accorde ?? 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Solde restant à rembourser</span>
                  <span className="text-sm font-bold text-amber-700">
                    {formatFcfa(financement?.total_solde_restant ?? 0)}
                  </span>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
