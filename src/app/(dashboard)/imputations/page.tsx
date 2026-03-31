"use client";

import { useEffect, useState } from "react";

type MontantAttenteData = {
  id: string;
  membre_id: string;
  nom_complet: string;
  montant_initial: number;
  montant_restant: number;
  statut: string;
  date: string | null;
};

type ImputationData = {
  id: string;
  membre_id: string;
  nom_complet: string;
  rubrique: string;
  periode: string;
  montant: number;
  date: string;
};

type ResumeData = {
  total_montants_attente: number;
  total_impute: number;
  nombre_imputations: number;
};

type ImputationsApiResponse = {
  montantsAttente: MontantAttenteData[];
  imputations: ImputationData[];
  resume: ResumeData;
};

export default function ImputationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [montantsAttente, setMontantsAttente] = useState<MontantAttenteData[]>([]);
  const [imputations, setImputations] = useState<ImputationData[]>([]);
  const [resume, setResume] = useState<ResumeData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImputationsData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/imputations", {
          method: "GET",
          cache: "no-store"
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Erreur lors du chargement des imputations");
        }

        if (!cancelled) {
          const typedPayload = payload as ImputationsApiResponse;
          setMontantsAttente(typedPayload.montantsAttente || []);
          setImputations(typedPayload.imputations || []);
          setResume(
            typedPayload.resume || {
              total_montants_attente: 0,
              total_impute: 0,
              nombre_imputations: 0
            }
          );
        }
      } catch (err: any) {
        console.error("Erreur imputations:", err);
        if (!cancelled) {
          setError(err?.message || "Erreur lors du chargement des données");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadImputationsData();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatMontant = (montant: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(montant || 0);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Non définie";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const getStatutColor = (statut: string) => {
    switch ((statut || "").toLowerCase()) {
      case "payé":
      case "payee":
      case "valide":
      case "validée":
        return "text-green-700 bg-green-50";
      case "en attente":
      case "en_attente":
      case "partiellement_impute":
        return "text-yellow-700 bg-yellow-50";
      case "retard":
      case "en retard":
      case "en_retard":
        return "text-red-700 bg-red-50";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Chargement des imputations...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="font-semibold">Erreur lors du chargement des données</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-green-50/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-slate-900">Imputations</h1>
          <p className="mt-2 text-slate-600">
            Gérez vos montants en attente et suivez vos imputations.
          </p>
        </section>

        {resume && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Montants en attente</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatMontant(resume.total_montants_attente)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {montantsAttente.length} montant{montantsAttente.length > 1 ? "s" : ""} en attente
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Total imputé</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatMontant(resume.total_impute)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {resume.nombre_imputations} imputation
                {resume.nombre_imputations > 1 ? "s" : ""} réalisée
                {resume.nombre_imputations > 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-medium text-slate-500">Situation globale</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatMontant((resume.total_montants_attente || 0) + (resume.total_impute || 0))}
              </p>
              <p className="mt-2 text-sm text-slate-500">Total des montants visibles</p>
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Montants en attente</h2>

          {montantsAttente.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucun montant en attente.
            </div>
          ) : (
            <div className="space-y-3">
              {montantsAttente.map((montant) => (
                <div key={montant.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Montant initial</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMontant(montant.montant_initial)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Montant restant</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMontant(montant.montant_restant)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatutColor(montant.statut)}`}>
                        {montant.statut}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(montant.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Imputations réalisées</h2>

          {imputations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Aucune imputation réalisée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Rubrique</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Période</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Montant</th>
                    <th className="pb-3 text-left text-sm font-medium text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {imputations.map((imputation) => (
                    <tr key={imputation.id} className="transition-colors hover:bg-slate-50">
                      <td className="py-4 text-sm font-medium text-slate-900">{imputation.rubrique}</td>
                      <td className="py-4 text-sm text-slate-900">{imputation.periode}</td>
                      <td className="py-4 text-sm font-semibold text-slate-900">
                        {formatMontant(imputation.montant)}
                      </td>
                      <td className="py-4 text-sm text-slate-600">{formatDate(imputation.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-green-100 p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">Formulaire d'imputation</h3>
              <p className="mt-1 text-sm text-slate-600">
                Le formulaire d'imputation administrateur sera intégré dans cette section pour permettre
                l'affectation des montants en attente vers les rubriques appropriées.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
