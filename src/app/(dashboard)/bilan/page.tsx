"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import ActionButton from "@/components/ui/ActionButton";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

type BilanGlobal = {
  total_entrees: number;
  total_sorties: number;
  solde_global: number;
  nb_caisses: number;
};

type BilanRubrique = {
  caisse_id: string;
  caisse_libelle: string;
  rubrique_id: string;
  rubrique_nom: string;
  total_entrees: number;
  total_sorties: number;
  solde_disponible: number;
};

type BilanMembre = {
  membre_id: string;
  numero_membre: string | null;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  total_contributions: number;
  nb_demandes_aides: number;
  nb_aides_approuvees: number;
  total_aides_demande: number;
  total_aides_accorde: number;
  nb_demandes_prets: number;
  nb_prets_approuves: number;
  total_prets_demande: number;
  total_prets_accorde: number;
  nb_prets_octroyes: number;
  nb_prets_en_cours: number;
  nb_prets_rembourses: number;
  total_prets_octroyes: number;
  total_solde_restant: number;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    global: BilanGlobal | null;
    rubriques: BilanRubrique[];
    membres: BilanMembre[];
  };
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

export default function BilanPage() {
  const [globalData, setGlobalData] = useState<BilanGlobal | null>(null);
  const [rubriques, setRubriques] = useState<BilanRubrique[]>([]);
  const [membres, setMembres] = useState<BilanMembre[]>([]);
  const [selectedMembreId, setSelectedMembreId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/bilan", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const rawText = await response.text();
      let json: ApiResponse | null = null;

      try {
        json = rawText ? (JSON.parse(rawText) as ApiResponse) : null;
      } catch {
        throw new Error("L'API /api/bilan ne renvoie pas du JSON.");
      }

      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Erreur lors du chargement du bilan.");
      }

      const nextGlobal = json.data?.global ?? null;
      const nextRubriques = Array.isArray(json.data?.rubriques) ? json.data!.rubriques : [];
      const nextMembres = Array.isArray(json.data?.membres) ? json.data!.membres : [];

      setGlobalData(nextGlobal);
      setRubriques(nextRubriques);
      setMembres(nextMembres);

      if (nextMembres.length > 0) {
        setSelectedMembreId((prev) =>
          prev && nextMembres.some((item) => item.membre_id === prev)
            ? prev
            : nextMembres[0].membre_id
        );
      } else {
        setSelectedMembreId("");
      }
    } catch (err: any) {
      setGlobalData(null);
      setRubriques([]);
      setMembres([]);
      setSelectedMembreId("");
      setError(err?.message || "Erreur lors du chargement du bilan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedMembre = useMemo(() => {
    if (!selectedMembreId) return null;
    return membres.find((item) => item.membre_id === selectedMembreId) ?? null;
  }, [membres, selectedMembreId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Synthèse des entrées, sorties et bilan par membre"
        subtitle="Cette page présente le bilan global de l'association puis le bilan détaillé d'un seul membre sélectionné."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard">
              <ActionButton variant="secondary" size="md">
                ← Retour au Dashboard
              </ActionButton>
            </Link>
            <ActionButton 
              variant="primary" 
              size="md"
              onClick={loadData}
            >
              Actualiser
            </ActionButton>
          </div>
        }
        size="lg"
      />

      {error && (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <LoadingState 
          message="Chargement du bilan..." 
          size="md" 
          variant="default" 
        />
      )}

      {!globalData && !loading && (
        <EmptyState
          icon="📊"
          title="Aucune donnée de bilan"
          description="Aucune donnée de bilan disponible."
          size="md"
        />
      )}

      {globalData && !loading && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <StatCard
              label="Total entrées"
              value={formatMoney(globalData.total_entrees)}
              trend="up"
              icon="💰"
              size="md"
              variant="elevated"
            />
            <StatCard
              label="Total sorties"
              value={formatMoney(globalData.total_sorties)}
              trend="down"
              icon="💸"
              size="md"
              variant="elevated"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Caisses suivies"
              value={globalData.nb_caisses}
              icon="🏦"
              size="md"
            />
            <StatCard
              label="Solde global"
              value={formatMoney(globalData.solde_global)}
              icon="📈"
              size="md"
            />
          </div>

          <SectionCard title="Solde par caisse" subtitle="Détail par rubrique" padding="md">
            {!rubriques.length ? (
              <EmptyState
                icon="📁"
                title="Aucune rubrique"
                description="Aucune rubrique disponible."
                size="md"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rubriques.map((item) => (
                  <StatCard
                    key={item.caisse_id}
                    label={item.rubrique_nom}
                    value={formatMoney(item.solde_disponible)}
                    description={item.caisse_libelle}
                    icon="💵"
                    size="md"
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard 
            title="Sélection d'un membre" 
            subtitle="Bilan complet" 
            padding="md"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full lg:w-[420px]">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Choisir un membre
                </label>
                <select
                  value={selectedMembreId}
                  onChange={(e) => setSelectedMembreId(e.target.value)}
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                >
                  {membres.map((item) => (
                    <option key={item.membre_id} value={item.membre_id}>
                      {item.nom_complet} {item.numero_membre ? `- ${item.numero_membre}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedMembre ? (
              <EmptyState
                icon="👤"
                title="Aucun membre sélectionné"
                description="Veuillez sélectionner un membre pour voir son bilan détaillé."
                size="md"
              />
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedMembre.nom_complet}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedMembre.numero_membre || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Contributions"
                    value={formatMoney(selectedMembre.total_contributions)}
                    icon="💰"
                    size="sm"
                  />
                  <StatCard
                    label="Demandes aides"
                    value={selectedMembre.nb_demandes_aides}
                    icon="🤝"
                    size="sm"
                  />
                  <StatCard
                    label="Aides accordées"
                    value={formatMoney(selectedMembre.total_aides_accorde)}
                    icon="✅"
                    size="sm"
                  />
                  <StatCard
                    label="Demandes prêts"
                    value={selectedMembre.nb_demandes_prets}
                    icon="📋"
                    size="sm"
                  />
                  <StatCard
                    label="Total prêts accordés"
                    value={formatMoney(selectedMembre.total_prets_accorde)}
                    icon="💸"
                    size="sm"
                  />
                  <StatCard
                    label="Solde prêt restant"
                    value={formatMoney(selectedMembre.total_solde_restant)}
                    icon="⚖️"
                    size="sm"
                  />
                  <StatCard
                    label="Prêts en cours"
                    value={selectedMembre.nb_prets_en_cours}
                    icon="🔄"
                    size="sm"
                  />
                  <StatCard
                    label="Prêts remboursés"
                    value={selectedMembre.nb_prets_rembourses}
                    icon="✅"
                    size="sm"
                  />
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
