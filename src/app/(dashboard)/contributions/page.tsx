"use client";

import Link from "next/link";
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
};

type FormDataResponse = {
  success: boolean;
  membres?: MembreOption[];
  rubriques?: RubriqueOption[];
  message?: string;
};

type CreateResponse = {
  success: boolean;
  message?: string;
  contribution_id?: string;
  membre_id?: string;
  montant_total?: number;
  date_contribution?: string;
};

type LigneState = {
  rubrique_id: string;
  rubrique_nom: string;
  montant: number;
};

function formatFcfa(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function getTodayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ContributionsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [membres, setMembres] = useState<MembreOption[]>([]);
  const [rubriques, setRubriques] = useState<RubriqueOption[]>([]);

  const [membreId, setMembreId] = useState("");
  const [dateContribution, setDateContribution] = useState(getTodayIsoDate());
  const [lignes, setLignes] = useState<LigneState[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadFormData() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/contributions/form-data", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as FormDataResponse;

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Impossible de charger les données");
        }

        if (!mounted) return;

        const membresData = result.membres ?? [];
        const rubriquesData = result.rubriques ?? [];

        setMembres(membresData);
        setRubriques(rubriquesData);
        setLignes(
          rubriquesData.map((rubrique) => ({
            rubrique_id: rubrique.id,
            rubrique_nom: rubrique.nom,
            montant: 0,
          }))
        );
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Erreur de chargement");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadFormData();

    return () => {
      mounted = false;
    };
  }, []);

  const total = useMemo(() => {
    return lignes.reduce(
      (sum, ligne) => sum + (Number.isFinite(ligne.montant) ? ligne.montant : 0),
      0
    );
  }, [lignes]);

  const lignesActives = useMemo(() => {
    return lignes
      .filter((ligne) => ligne.montant > 0)
      .map((ligne) => ({
        rubrique_id: ligne.rubrique_id,
        montant: ligne.montant,
      }));
  }, [lignes]);

  function setLigneMontant(rubriqueId: string, nextValue: number) {
    setLignes((prev) =>
      prev.map((ligne) =>
        ligne.rubrique_id === rubriqueId
          ? { ...ligne, montant: nextValue < 0 ? 0 : nextValue }
          : ligne
      )
    );
  }

  function incrementLigne(rubriqueId: string, increment: number) {
    setLignes((prev) =>
      prev.map((ligne) =>
        ligne.rubrique_id === rubriqueId
          ? { ...ligne, montant: Math.max(0, ligne.montant + increment) }
          : ligne
      )
    );
  }

  function resetFormMontants() {
    setLignes((prev) => prev.map((ligne) => ({ ...ligne, montant: 0 })));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!membreId) {
      setError("Sélectionne un membre");
      return;
    }

    if (lignesActives.length === 0) {
      setError("Saisis au moins un montant sur une rubrique");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/contributions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membre_id: membreId,
          date_contribution: dateContribution,
          lignes: lignesActives,
        }),
      });

      const result = (await response.json()) as CreateResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Erreur lors de l'enregistrement");
      }

      setSuccess(
        `Contribution enregistrée avec succès. Total : ${formatFcfa(
          Number(result.montant_total ?? total)
        )}`
      );
      resetFormMontants();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contributions"
        subtitle="Saisie d'une participation financière par membre, ventilée sur plusieurs rubriques. La logique métier reste côté backend."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/montants-attendus">
              <ActionButton variant="secondary" size="md">
                Ouvrir Montants attendus
              </ActionButton>
            </Link>
            <Link href="/montants-attendus">
              <ActionButton variant="primary" size="md">
                Aligner les retards
              </ActionButton>
            </Link>
          </div>
        }
        size="lg"
      />

      {loading && (
        <LoadingState 
          message="Chargement du formulaire..." 
          size="md" 
          variant="default" 
        />
      )}

      {error && membres.length === 0 && rubriques.length === 0 && (
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <SectionCard padding="md">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Membre
                  </span>
                  <select
                    value={membreId}
                    onChange={(e) => setMembreId(e.target.value)}
                    className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sélectionner un membre</option>
                    {membres.map((membre) => (
                      <option key={membre.id} value={membre.id}>
                        {membre.nom_complet}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Date contribution
                  </span>
                  <input
                    type="date"
                    value={dateContribution}
                    onChange={(e) => setDateContribution(e.target.value)}
                    className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                  />
                </label>
              </div>

              <div className="mt-6 space-y-4">
                {lignes.map((ligne) => (
                  <div
                    key={ligne.rubrique_id}
                    className="rounded-[20px] border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">
                          {ligne.rubrique_nom}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={ligne.montant}
                          onChange={(e) =>
                            setLigneMontant(
                              ligne.rubrique_id,
                              Math.max(0, Number(e.target.value || 0))
                            )
                          }
                          className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 sm:w-[180px]"
                        />

                        <div className="flex flex-wrap gap-2">
                          <ActionButton 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={() => incrementLigne(ligne.rubrique_id, 1000)}
                          >
                            +1000 FCFA
                          </ActionButton>
                          <ActionButton 
                            type="button"
                            variant="outline" 
                            size="sm"
                            onClick={() => incrementLigne(ligne.rubrique_id, 5000)}
                          >
                            +5000 FCFA
                          </ActionButton>
                          <ActionButton 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLigneMontant(ligne.rubrique_id, 0)}
                          >
                            Réinitialiser
                          </ActionButton>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {rubriques.length === 0 && (
                  <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-700">
                      Aucune rubrique active disponible.
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            <div className="space-y-4">
              <SectionCard 
                title="Résumé" 
                variant="gradient" 
                padding="md"
              >
                <div className="space-y-4">
                  <div className="rounded-[20px] border border-white/80 bg-white p-4">
                    <p className="text-sm text-slate-500">Nombre de lignes actives</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{lignesActives.length}</p>
                  </div>

                  <div className="rounded-[20px] border border-white/80 bg-white p-4">
                    <p className="text-sm text-slate-500">Montant total saisi</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700">
                      {formatFcfa(total)}
                    </p>
                  </div>

                  <ActionButton
                    type="submit"
                    disabled={submitting || rubriques.length === 0}
                    variant="primary"
                    size="md"
                    fullWidth
                    loading={submitting}
                  >
                    Enregistrer
                  </ActionButton>

                  <ActionButton
                    type="button"
                    onClick={resetFormMontants}
                    disabled={submitting}
                    variant="outline"
                    size="md"
                    fullWidth
                  >
                    Réinitialiser tous les montants
                  </ActionButton>
                </div>
              </SectionCard>

              {success ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                  <p className="text-sm font-medium text-emerald-700">{success}</p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              ) : null}

              <SectionCard title="Aperçu des lignes actives" padding="md">
                <div className="space-y-3">
                  {lignesActives.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune ligne saisie pour le moment.</p>
                  ) : (
                    lignes
                      .filter((ligne) => ligne.montant > 0)
                      .map((ligne) => (
                        <div
                          key={ligne.rubrique_id}
                          className="rounded-[20px] border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900">
                              {ligne.rubrique_nom}
                            </span>
                            <span className="text-sm font-bold text-emerald-700">
                              {formatFcfa(ligne.montant)}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
