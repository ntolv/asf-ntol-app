"use client";

import { useEffect, useState } from "react";

type SuiviRow = {
  id: string;
  ordre_mois: number;
  mois_libelle: string;
  date_theorique: string;
  nb_tontineurs: number;
  montant_par_tontineur: number;
  contribution_globale_mensuelle: number;
  contribution_globale_cycle: number;
  mise_brute_unitaire: number;
  nb_beneficiaires_mois: number;
  mise_brute_mois: number;
  solde_caisse_fin_mois: number;
  multi_mise_possible: boolean;
  statut_session_cycle: string;
  session_id?: string | null;
  session_libelle?: string | null;
};

type ApiResponse = {
  success: boolean;
  configured: boolean;
  rows: SuiviRow[];
};

function getStatutSessionColor(statut: string) {
  switch ((statut || "").toUpperCase()) {
    case "FERMEE / ENCHERES EXECUTEES":
      return "bg-red-50 text-red-700";
    case "ENCHERES EN COURS":
      return "bg-amber-50 text-amber-700";
    case "ENCHERES NON LANCEES":
      return "bg-blue-50 text-blue-700";
    case "OUVERTE":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function TontineSuiviCyclePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SuiviRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/tontine/suivi-cycle", {
          method: "GET",
          cache: "no-store"
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Erreur lors du chargement du suivi");
        }

        if (!cancelled) {
          const typed = payload as ApiResponse;
          setRows(typed.rows || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Erreur lors du chargement");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatMontant = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0
    }).format(value || 0);

  if (loading) {
    return <main className="p-6">Chargement du tableau de suivi...</main>;
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="bg-green-50/20 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <h1 className="text-3xl font-bold text-slate-900">Tableau de suivi du cycle</h1>
          <p className="mt-2 text-slate-600">
            Suivi automatique du cycle, de la caisse et des multi-mises.
          </p>
        </section>

        <section className="overflow-x-auto rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Mois</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Contribution globale mensuelle</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Mise brute unitaire</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Bénéficiaires</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Mise brute du mois</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Solde caisse</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Multi-mise</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Statut session</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Session</th>
                <th className="pb-3 text-left text-sm font-medium text-slate-500">Accès</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50">
                  <td className="py-4 text-sm font-medium text-slate-900">{row.mois_libelle}</td>
                  <td className="py-4 text-sm text-slate-900">{formatMontant(row.contribution_globale_mensuelle)}</td>
                  <td className="py-4 text-sm text-slate-900">{formatMontant(row.mise_brute_unitaire)}</td>
                  <td className="py-4 text-sm text-slate-900">{row.nb_beneficiaires_mois}</td>
                  <td className="py-4 text-sm font-semibold text-slate-900">{formatMontant(row.mise_brute_mois)}</td>
                  <td className="py-4 text-sm text-slate-900">{formatMontant(row.solde_caisse_fin_mois)}</td>
                  <td className="py-4 text-sm text-slate-900">{row.multi_mise_possible ? "Oui" : "Non"}</td>
                  <td className="py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatutSessionColor(row.statut_session_cycle)}`}>
                      {row.statut_session_cycle || "-"}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-slate-900">
                    {row.session_libelle || "-"}
                  </td>
                  <td className="py-4 text-sm">
                    {row.session_id ? (
                      <a
                        href={`/tontine?session_id=${row.session_id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Ouvrir la session
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}


