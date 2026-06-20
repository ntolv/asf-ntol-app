"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import ActionButton from "@/components/ui/ActionButton";
import LoadingState from "@/components/ui/LoadingState";

type MembreOption = {
  id: string;
  nom_complet: string;
};

type RubriqueOption = {
  id: string;
  nom: string;
  ordre_affichage: number;
};

type FormDataResponse = {
  success: boolean;
  membres?: MembreOption[];
  annees?: string[];
  rubriques?: RubriqueOption[];
  message?: string;
};

type EncaissementLine = {
  ligne_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_ligne: number;
  ordre_affichage: number;
};

type EncaissementContribution = {
  contribution_id: string;
  membre_id: string;
  membre_nom: string;
  date_contribution: string;
  montant_total: number;
  statut: string;
  lignes: EncaissementLine[];
};

type EncaissementsResponse = {
  success: boolean;
  count?: number;
  contributions?: EncaissementContribution[];
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

function getCurrentYear() {
  return String(new Date().getFullYear());
}

export default function ImputationsPage() {
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [membres, setMembres] = useState<MembreOption[]>([]);
  const [annees, setAnnees] = useState<string[]>([]);
  const [rubriques, setRubriques] = useState<RubriqueOption[]>([]);
  const [membreId, setMembreId] = useState("");
  const [annee, setAnnee] = useState(getCurrentYear());
  const [rubriqueId, setRubriqueId] = useState("");
  const [contributions, setContributions] = useState<EncaissementContribution[]>([]);

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

        const apiAnnees = result.annees ?? [];
        const currentYear = getCurrentYear();

        setMembres(result.membres ?? []);
        setAnnees(apiAnnees.includes(currentYear) ? apiAnnees : [currentYear, ...apiAnnees]);
        setRubriques(result.rubriques ?? []);
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

    async function loadEncaissements() {
      setLoadingData(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (membreId) params.set("membre_id", membreId);
        if (annee) params.set("annee", annee);
        if (rubriqueId) params.set("rubrique_id", rubriqueId);

        const suffix = params.toString() ? `?${params.toString()}` : "";
        const response = await fetch(`/api/imputations${suffix}`, {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as EncaissementsResponse;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Impossible de charger l'historique des encaissements");
        }

        if (!mounted) return;
        setContributions(result.contributions ?? []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Erreur de chargement de l'historique des encaissements");
      } finally {
        if (mounted) setLoadingData(false);
      }
    }

    loadEncaissements();

    return () => {
      mounted = false;
    };
  }, [membreId, annee, rubriqueId]);

  const totalEncaisse = useMemo(() => {
    return contributions.reduce((sum, item) => sum + Number(item.montant_total ?? 0), 0);
  }, [contributions]);

  const membresAyantCotise = useMemo(() => {
    return new Set(contributions.map((item) => item.membre_id)).size;
  }, [contributions]);

  const ventilationRubriques = useMemo(() => {
    const map = new Map<string, { nom: string; total: number; ordre: number }>();

    contributions.forEach((item) => {
      item.lignes.forEach((ligne) => {
        const current = map.get(ligne.rubrique_id) ?? {
          nom: ligne.rubrique_nom,
          total: 0,
          ordre: Number(ligne.ordre_affichage ?? 999),
        };

        current.total += Number(ligne.montant_ligne ?? 0);
        map.set(ligne.rubrique_id, current);
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom)
    );
  }, [contributions]);

  const rubriqueLabel =
    rubriques.find((rubrique) => rubrique.id === rubriqueId)?.nom || "Toutes les rubriques";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique Encaissements"
        subtitle="Consultation annuelle des encaissements enregistrés, ventilés par membre et par rubrique."
        size="lg"
      />

      <SectionCard padding="md">
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Année</span>
            <select
              value={annee}
              onChange={(e) => setAnnee(e.target.value)}
              disabled={loadingFilters}
              className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              {annees.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Membre</span>
            <select
              value={membreId}
              onChange={(e) => setMembreId(e.target.value)}
              disabled={loadingFilters}
              className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
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
            <span className="mb-2 block text-sm font-semibold text-slate-700">Rubrique</span>
            <select
              value={rubriqueId}
              onChange={(e) => setRubriqueId(e.target.value)}
              disabled={loadingFilters}
              className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="">Toutes les rubriques</option>
              {rubriques.map((rubrique) => (
                <option key={rubrique.id} value={rubrique.id}>
                  {rubrique.nom}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <ActionButton
              variant="outline"
              size="md"
              fullWidth
              onClick={() => {
                setMembreId("");
                setAnnee(getCurrentYear());
                setRubriqueId("");
              }}
            >
              Réinitialiser
            </ActionButton>
          </div>
        </div>
      </SectionCard>

      {(loadingFilters || loadingData) && (
        <LoadingState message="Chargement des données..." size="md" variant="default" />
      )}

      {!loadingFilters && !loadingData && (
        <SectionCard
          title={`Résumé des encaissements ${annee}`}
          subtitle={`Rubrique : ${rubriqueLabel}`}
          padding="md"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Montant total encaissé</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{formatFcfa(totalEncaisse)}</p>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Nombre d'encaissements</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{contributions.length}</p>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Membres ayant cotisé</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{membresAyantCotise}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Ventilation par rubrique</p>
            {ventilationRubriques.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun encaissement trouvé pour ces filtres.</p>
            ) : (
              <div className="space-y-2">
                {ventilationRubriques.map((item) => (
                  <div
                    key={item.nom}
                    className="flex items-center justify-between gap-4 rounded-[12px] bg-white px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-700">{item.nom}</span>
                    <span className="text-sm font-bold text-slate-900">{formatFcfa(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : null}

      <SectionCard
        title="Historique détaillé"
        subtitle="Chaque encaissement affiche les rubriques concernées et les montants ventilés."
        padding="md"
      >
        {loadingData ? (
          <LoadingState message="Chargement de l'historique..." size="md" variant="default" />
        ) : contributions.length === 0 ? (
          <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm text-slate-600">Aucun encaissement trouvé pour ces filtres.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {contributions.map((item) => {
              return (
                <article
                  key={item.contribution_id}
                  className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-slate-900">{item.membre_nom}</p>
                      <p className="text-sm text-slate-500">
                        Encaissement du {formatDate(item.date_contribution)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                      <div className="rounded-[12px] border border-white bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Statut</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{item.statut}</p>
                      </div>

                      <div className="rounded-[12px] border border-white bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total encaissé</p>
                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                          {formatFcfa(item.montant_total)}
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
                            <td className="rounded-l-[12px] border border-slate-200 border-r-0 bg-white px-3 py-3 text-sm font-medium text-slate-700">
                              {ligne.rubrique_nom}
                            </td>
                            <td className="rounded-r-[12px] border border-slate-200 border-l-0 bg-white px-3 py-3 text-right text-sm font-semibold text-slate-900">
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
      </SectionCard>
    </div>
  );
}
