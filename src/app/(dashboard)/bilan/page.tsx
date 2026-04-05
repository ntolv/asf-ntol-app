"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Bilan
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Synthèse des entrées, sorties et bilan par membre
            </h1>
            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Cette page présente le bilan global de l'association puis le bilan détaillé
              d'un seul membre sélectionné.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Retour au Dashboard
            </Link>

            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Actualiser
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
          Chargement du bilan...
        </div>
      ) : !globalData ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Aucune donnée de bilan disponible.
        </div>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-2">
            <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Entrées
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm text-slate-600">Total entrées</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatMoney(globalData.total_entrees)}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-[24px] border border-red-200 bg-red-50 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                Sorties
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-sm text-slate-600">Total sorties</span>
                  <span className="text-sm font-bold text-red-700">
                    {formatMoney(globalData.total_sorties)}
                  </span>
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Caisses suivies
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {globalData.nb_caisses}
              </p>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Solde global
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatMoney(globalData.solde_global)}
              </p>
            </article>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Détail par rubrique
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Solde par caisse
              </h2>
            </div>

            {!rubriques.length ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucune rubrique disponible.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rubriques.map((item) => (
                  <article
                    key={item.caisse_id}
                    className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                      {item.rubrique_nom}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                      {item.caisse_libelle}
                    </h3>

                    <div className="mt-5">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-600">Solde</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatMoney(item.solde_disponible)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Bilan complet
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Sélection d'un membre
                </h2>
              </div>

              <div className="w-full lg:w-[420px]">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Choisir un membre
                </label>
                <select
                  value={selectedMembreId}
                  onChange={(e) => setSelectedMembreId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
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
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucun membre sélectionné.
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
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

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Contributions
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatMoney(selectedMembre.total_contributions)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Demandes aides
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedMembre.nb_demandes_aides}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">
                      Aides accordées
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      {formatMoney(selectedMembre.total_aides_accorde)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Demandes prêts
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedMembre.nb_demandes_prets}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">
                      Total prêts accordés
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">
                      {formatMoney(selectedMembre.total_prets_accorde)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-amber-700">
                      Solde prêt restant
                    </p>
                    <p className="mt-1 text-sm font-bold text-amber-700">
                      {formatMoney(selectedMembre.total_solde_restant)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Prêts en cours
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedMembre.nb_prets_en_cours}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      Prêts remboursés
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selectedMembre.nb_prets_rembourses}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
