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

type LigneAttendu = {
  membre_id: string;
  membre_nom: string;
  periode_reference: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_attendu: number;
  est_parametre: boolean;
};

type FormDataResponse = {
  success: boolean;
  message?: string;
  data?: {
    membres: MembreOption[];
    membre_id: string;
    periode_reference: string;
    lignes: LigneAttendu[];
  };
};

type SaveResponse = {
  success: boolean;
  message?: string;
  data?: {
    periode_reference?: string;
  };
};

function formatFcfa(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

export default function MontantsAttendusPage() {
  const [loadingMembres, setLoadingMembres] = useState(true);
  const [loadingRubriques, setLoadingRubriques] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [membres, setMembres] = useState<MembreOption[]>([]);
  const [membreId, setMembreId] = useState("");
  const [periodeReference, setPeriodeReference] = useState("");
  const [lignes, setLignes] = useState<LigneAttendu[]>([]);

  const [rubriqueId, setRubriqueId] = useState("");
  const [montant, setMontant] = useState<number>(0);

  async function loadMembresOnly() {
    try {
      setLoadingMembres(true);
      setError("");

      const response = await fetch("/api/montants-attendus/form-data", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as FormDataResponse;

      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.message || "Impossible de charger les membres.");
      }

      setMembres(result.data.membres ?? []);
      setPeriodeReference(result.data.periode_reference ?? "");
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement des membres.");
      setMembres([]);
    } finally {
      setLoadingMembres(false);
    }
  }

  async function loadRubriquesForMembre(selectedMembreId: string) {
    try {
      setLoadingRubriques(true);
      setError("");
      setSuccess("");

      const params = new URLSearchParams();
      params.set("membre_id", selectedMembreId);

      const response = await fetch(
        `/api/montants-attendus/form-data?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = (await response.json()) as FormDataResponse;

      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(
          result?.message || "Impossible de charger les rubriques du membre."
        );
      }

      const nextLignes = result.data.lignes ?? [];

      setLignes(nextLignes);
      setPeriodeReference(result.data.periode_reference ?? "");

      if (nextLignes.length > 0) {
        const firstRubrique = nextLignes[0];
        setRubriqueId(firstRubrique.rubrique_id);
        setMontant(Number(firstRubrique.montant_attendu || 0));
      } else {
        setRubriqueId("");
        setMontant(0);
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement des rubriques.");
      setLignes([]);
      setRubriqueId("");
      setMontant(0);
    } finally {
      setLoadingRubriques(false);
    }
  }

  useEffect(() => {
    loadMembresOnly();
  }, []);

  useEffect(() => {
    if (!membreId) {
      setLignes([]);
      setRubriqueId("");
      setMontant(0);
      setError("");
      setSuccess("");
      return;
    }

    loadRubriquesForMembre(membreId);
  }, [membreId]);

  const membreActuel = useMemo(() => {
    return membres.find((membre) => membre.id === membreId) ?? null;
  }, [membres, membreId]);

  const rubriqueActuelle = useMemo(() => {
    return lignes.find((ligne) => ligne.rubrique_id === rubriqueId) ?? null;
  }, [lignes, rubriqueId]);

  const totalAttendu = useMemo(() => {
    return lignes.reduce(
      (sum, ligne) => sum + Number(ligne.montant_attendu || 0),
      0
    );
  }, [lignes]);

  function handleSelectRubrique(nextRubriqueId: string) {
    setRubriqueId(nextRubriqueId);
    setError("");
    setSuccess("");

    const ligne = lignes.find((item) => item.rubrique_id === nextRubriqueId);
    setMontant(Number(ligne?.montant_attendu || 0));
  }

  function handleMontantChange(value: string) {
    const nextValue = Math.max(0, Number(value || 0));
    setMontant(nextValue);
  }

  function incrementMontant(increment: number) {
    setMontant((prev) => Math.max(0, Number(prev || 0) + increment));
  }

  function resetMontant() {
    setMontant(0);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!membreId) {
        throw new Error("Sélectionne un membre.");
      }

      if (!rubriqueId) {
        throw new Error("Sélectionne une rubrique.");
      }

      const response = await fetch("/api/montants-attendus/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membre_id: membreId,
          lignes: [
            {
              rubrique_id: rubriqueId,
              montant_attendu: Number(montant || 0),
            },
          ],
        }),
      });

      const result = (await response.json()) as SaveResponse;

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Erreur lors de l'enregistrement.");
      }

      setSuccess("Montant attendu enregistré avec succès.");
      await loadRubriquesForMembre(membreId);

      const updatedLigne = lignes.find((ligne) => ligne.rubrique_id === rubriqueId);
      if (updatedLigne) {
        setMontant(Number(updatedLigne.montant_attendu || 0));
      }
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramétrage initial par membre et par rubrique"
        subtitle="Sélectionne un membre, puis une rubrique, renseigne le montant initial et enregistre. Ce montant sert de base au calcul des retards."
        actions={
          <Link href="/contributions">
            <ActionButton variant="secondary" size="md">
              Retour à Contributions
            </ActionButton>
          </Link>
        }
        size="lg"
      />

      {error && (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loadingMembres && (
        <LoadingState 
          message="Chargement des membres..." 
          size="md" 
          variant="default" 
        />
      )}

      <SectionCard padding="md">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Membre
            </label>
            <select
              value={membreId}
              onChange={(e) => {
                setError("");
                setSuccess("");
                setMembreId(e.target.value);
              }}
              disabled={loadingMembres || saving}
              className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="">Sélectionner un membre</option>
              {membres.map((membre) => (
                <option key={membre.id} value={membre.id}>
                  {membre.nom_complet}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Rubrique
            </label>
            <select
              value={rubriqueId}
              onChange={(e) => handleSelectRubrique(e.target.value)}
              disabled={
                saving || loadingMembres || loadingRubriques || !membreId || lignes.length === 0
              }
              className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="">Sélectionner une rubrique</option>
              {lignes.map((ligne) => (
                <option key={ligne.rubrique_id} value={ligne.rubrique_id}>
                  {ligne.rubrique_nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Montant initial
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={montant}
              onChange={(e) => handleMontantChange(e.target.value)}
              disabled={saving || !rubriqueId}
              className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              placeholder="Saisir un montant"
            />
          </div>

          <ActionButton
            onClick={handleSave}
            disabled={saving || loadingMembres || loadingRubriques || !membreId || !rubriqueId}
            variant="primary"
            size="md"
            loading={saving}
          >
            Enregistrer
          </ActionButton>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton
            variant="outline"
            size="sm"
            onClick={() => incrementMontant(1000)}
            disabled={saving || !rubriqueId}
          >
            +1000 FCFA
          </ActionButton>

          <ActionButton
            variant="outline"
            size="sm"
            onClick={() => incrementMontant(5000)}
            disabled={saving || !rubriqueId}
          >
            +5000 FCFA
          </ActionButton>

          <ActionButton
            variant="ghost"
            size="sm"
            onClick={resetMontant}
            disabled={saving || !rubriqueId}
          >
            Réinitialiser
          </ActionButton>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[20px] border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Membre sélectionné
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {membreActuel?.nom_complet || "-"}
          </p>
        </div>

        <div className="rounded-[20px] border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Rubrique sélectionnée
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {rubriqueActuelle?.rubrique_nom || "-"}
          </p>
        </div>

        <div className="rounded-[20px] border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Montant saisi
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatFcfa(montant)}
          </p>
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        {loadingMembres ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            Chargement des membres...
          </div>
        ) : !membreId ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Sélectionne un membre.
          </div>
        ) : loadingRubriques ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            Chargement des rubriques...
          </div>
        ) : lignes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aucune rubrique active disponible pour ce membre.
          </div>
        ) : (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5">
            <p className="text-sm text-slate-700">
              Tu paramètres ici la situation initiale du membre pour la rubrique
              sélectionnée. Cette valeur servira de base pour le calcul des
              retards à partir des contributions enregistrées.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Rubriques disponibles
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {lignes.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Total déjà paramétré
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatFcfa(totalAttendu)}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
