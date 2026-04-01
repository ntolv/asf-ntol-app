"use client";

import { useEffect, useMemo, useState } from "react";

type MembreOption = {
  id: string;
  nom_complet: string;
};

type FormDataResponse = {
  success: boolean;
  membres?: MembreOption[];
  periodes?: string[];
  message?: string;
};

type ImputationLine = {
  ligne_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_ligne: number;
  ordre_affichage: number;
};

type ImputationContribution = {
  contribution_id: string;
  membre_id: string;
  membre_nom: string;
  date_contribution: string;
  montant_total: number;
  statut: string;
  lignes: ImputationLine[];
};

type ImputationsResponse = {
  success: boolean;
  count?: number;
  contributions?: ImputationContribution[];
  message?: string;
};

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

export default function ImputationsPage() {
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [membres, setMembres] = useState<MembreOption[]>([]);
  const [periodes, setPeriodes] = useState<string[]>([]);
  const [membreId, setMembreId] = useState("");
  const [periode, setPeriode] = useState("");
  const [contributions, setContributions] = useState<ImputationContribution[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadFilters() {
      setLoadingFilters(true);
      setError("");

      try {
        const response = await fetch("/api/imputations/form-data", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as FormDataResponse;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Impossible de charger les filtres");
        }

        if (!mounted) return;

        setMembres(result.membres ?? []);
        setPeriodes(result.periodes ?? []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Erreur de chargement des filtres");
      } finally {
        if (mounted) setLoadingFilters(false);
      }
    }

    loadFilters();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadImputations() {
      setLoadingData(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (membreId) params.set("membre_id", membreId);
        if (periode) params.set("periode", periode);

        const suffix = params.toString() ? `?${params.toString()}` : "";
        const response = await fetch(`/api/imputations${suffix}`, {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as ImputationsResponse;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Impossible de charger les imputations");
        }

        if (!mounted) return;
        setContributions(result.contributions ?? []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Erreur de chargement des imputations");
      } finally {
        if (mounted) setLoadingData(false);
      }
    }

    loadImputations();

    return () => {
      mounted = false;
    };
  }, [membreId, periode]);

  const totalGlobal = useMemo(() => {
    return contributions.reduce((sum, item) => sum + Number(item.montant_total ?? 0), 0);
  }, [contributions]);

  const totalLignes = useMemo(() => {
    return contributions.reduce(
      (sum, item) =>
        sum +
        item.lignes.reduce((lineSum, ligne) => lineSum + Number(ligne.montant_ligne ?? 0), 0),
      0
    );
  }, [contributions]);

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
          Lecture des imputations générées automatiquement par le backend à partir
          des contributions enregistrées.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Membre</span>
            <select
              value={membreId}
              onChange={(e) => setMembreId(e.target.value)}
              disabled={loadingFilters}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="">Tous les membres</option>
              {membres.map((membre) => (
                <option key={membre.id} value={membre.id}>
                  {membre.nom_complet}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Période</span>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              disabled={loadingFilters}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="">Toutes les périodes</option>
              {periodes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setMembreId("");
                setPeriode("");
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Contributions affichées</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{contributions.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Montant total contributions</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{formatFcfa(totalGlobal)}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Somme des lignes imputées</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatFcfa(totalLignes)}</p>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Historique des imputations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Chaque contribution ci-dessous affiche automatiquement ses lignes d&apos;imputation.
          </p>
        </div>

        {loadingData ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm text-slate-600">Chargement des imputations...</p>
          </div>
        ) : contributions.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm text-slate-600">Aucune imputation trouvée pour ces filtres.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {contributions.map((item) => {
              const totalLignesContribution = item.lignes.reduce(
                (sum, ligne) => sum + Number(ligne.montant_ligne ?? 0),
                0
              );

              return (
                <article
                  key={item.contribution_id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-slate-900">{item.membre_nom}</p>
                      <p className="text-sm text-slate-500">
                        Contribution du {formatDate(item.date_contribution)}
                      </p>
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                        ID {item.contribution_id}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Statut</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.statut}</p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total contribution</p>
                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                          {formatFcfa(item.montant_total)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total lignes</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatFcfa(totalLignesContribution)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-2">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Rubrique
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Montant
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.lignes.map((ligne) => (
                          <tr key={ligne.ligne_id}>
                            <td className="rounded-l-2xl border border-slate-200 border-r-0 bg-white px-3 py-3 text-sm font-medium text-slate-700">
                              {ligne.rubrique_nom}
                            </td>
                            <td className="rounded-r-2xl border border-slate-200 border-l-0 bg-white px-3 py-3 text-right text-sm font-semibold text-slate-900">
                              {formatFcfa(ligne.montant_ligne)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}