"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MembreInfo = {
  id?: string;
  nom_complet?: string | null;
  numero_membre?: string | null;
  telephone?: string | null;
  email?: string | null;
};

type DemandeAide = {
  id: string;
  montant_demande?: number | null;
  montant_accorde?: number | null;
  motif?: string | null;
  statut?: string | null;
  commentaire_decision?: string | null;
  created_at?: string | null;
  date_traitement?: string | null;
  membres?: MembreInfo | null;
};

type DemandePret = {
  id: string;
  montant_demande?: number | null;
  montant_accorde?: number | null;
  objet_pret?: string | null;
  motif?: string | null;
  statut?: string | null;
  statut_demande?: string | null;
  commentaire_decision?: string | null;
  reference_unique?: string | null;
  document_texte?: string | null;
  created_at?: string | null;
  date_traitement?: string | null;
  membres?: MembreInfo | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: {
    aides: DemandeAide[];
    prets: DemandePret[];
  };
};

type HistoriqueItem = {
  id: string;
  type: "AIDE" | "PRET";
  membre_nom: string;
  numero_membre: string;
  montant_demande: number;
  montant_accorde: number;
  motif: string;
  statut: string;
  reference: string;
  created_at: string | null | undefined;
  date_traitement: string | null | undefined;
  document_link: string | null;
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizePretStatus(item: DemandePret) {
  return item.statut || item.statut_demande || "-";
}

function getStatutClasses(statut: string) {
  const value = String(statut || "").toUpperCase();

  if (value.includes("APPROUV")) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value.includes("REFUS")) {
    return "border border-red-200 bg-red-50 text-red-700";
  }

  if (value.includes("ATTENTE")) {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value.includes("REMBOURS")) {
    return "border border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border border-slate-200 bg-slate-50 text-slate-700";
}

export default function PretsAidesPage() {
  const [aides, setAides] = useState<DemandeAide[]>([]);
  const [prets, setPrets] = useState<DemandePret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("TOUS");
  const [statusFilter, setStatusFilter] = useState("TOUS");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedTypeFilter, setAppliedTypeFilter] = useState("TOUS");
  const [appliedStatusFilter, setAppliedStatusFilter] = useState("TOUS");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/prets-aides", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const rawText = await response.text();

      let json: ApiResponse | null = null;

      try {
        json = rawText ? (JSON.parse(rawText) as ApiResponse) : null;
      } catch {
        throw new Error("L'API /api/prets-aides ne renvoie pas du JSON.");
      }

      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Erreur lors du chargement des demandes.");
      }

      setAides(Array.isArray(json.data?.aides) ? json.data!.aides : []);
      setPrets(Array.isArray(json.data?.prets) ? json.data!.prets : []);
    } catch (err: any) {
      setAides([]);
      setPrets([]);
      setError(err?.message || "Erreur lors du chargement des demandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const historique = useMemo<HistoriqueItem[]>(() => {
    const aidesMapped: HistoriqueItem[] = aides.map((item) => ({
      id: item.id,
      type: "AIDE",
      membre_nom: item.membres?.nom_complet || "-",
      numero_membre: item.membres?.numero_membre || "-",
      montant_demande: Number(item.montant_demande || 0),
      montant_accorde: Number(item.montant_accorde || 0),
      motif: item.motif || "-",
      statut: item.statut || "-",
      reference: item.id,
      created_at: item.created_at,
      date_traitement: item.date_traitement,
      document_link: null,
    }));

    const pretsMapped: HistoriqueItem[] = prets.map((item) => ({
      id: item.id,
      type: "PRET",
      membre_nom: item.membres?.nom_complet || "-",
      numero_membre: item.membres?.numero_membre || "-",
      montant_demande: Number(item.montant_demande || 0),
      montant_accorde: Number(item.montant_accorde || 0),
      motif: item.objet_pret || item.motif || "-",
      statut: normalizePretStatus(item),
      reference: item.reference_unique || item.id,
      created_at: item.created_at,
      date_traitement: item.date_traitement,
      document_link: `/prets/demande/${item.id}`,
    }));

    return [...aidesMapped, ...pretsMapped].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [aides, prets]);

  const filteredHistorique = useMemo(() => {
    const searchValue = appliedSearch.trim().toLowerCase();

    return historique.filter((item) => {
      const matchesType = appliedTypeFilter === "TOUS" ? true : item.type === appliedTypeFilter;
      const matchesStatus =
        appliedStatusFilter === "TOUS"
          ? true
          : String(item.statut || "").toUpperCase().includes(appliedStatusFilter);

      const haystack = [
        item.membre_nom,
        item.numero_membre,
        item.motif,
        item.reference,
        item.statut,
        item.type,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchValue ? haystack.includes(searchValue) : true;

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [historique, appliedSearch, appliedTypeFilter, appliedStatusFilter]);

  function applyFilters() {
    setAppliedSearch(search);
    setAppliedTypeFilter(typeFilter);
    setAppliedStatusFilter(statusFilter);
  }

  function resetFilters() {
    setSearch("");
    setTypeFilter("TOUS");
    setStatusFilter("TOUS");
    setAppliedSearch("");
    setAppliedTypeFilter("TOUS");
    setAppliedStatusFilter("TOUS");
  }

  const stats = useMemo(() => {
    return {
      total: historique.length,
      aides: historique.filter((item) => item.type === "AIDE").length,
      prets: historique.filter((item) => item.type === "PRET").length,
      approuves: historique.filter((item) =>
        String(item.statut).toUpperCase().includes("APPROUV")
      ).length,
      enAttente: historique.filter((item) =>
        String(item.statut).toUpperCase().includes("ATTENTE")
      ).length,
    };
  }, [historique]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Prêts / Aides
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Historique global des demandes des membres
            </h1>
            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Cette page est réservée au bureau. Elle centralise l'historique complet
              des demandes d'aides et de prêts de tous les membres.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/caisse"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Retour à Caisse
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
          Chargement de l'historique...
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Total demandes
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Aides
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.aides}</p>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Prêts
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.prets}</p>
            </article>

            <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Approuvées
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.approuves}</p>
            </article>

            <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                En attente
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{stats.enAttente}</p>
            </article>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_180px]">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Rechercher un membre, un motif, une référence
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                  placeholder="Ex: NTOL, maladie, PRET-..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                >
                  <option value="TOUS">Tous</option>
                  <option value="AIDE">Aides</option>
                  <option value="PRET">Prêts</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                >
                  <option value="TOUS">Tous</option>
                  <option value="ATTENTE">En attente</option>
                  <option value="APPROUV">Approuvées</option>
                  <option value="REFUS">Refusées</option>
                  <option value="REMBOURS">Remboursées</option>
                </select>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Rechercher
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Historique
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Toutes les demandes de tous les membres
                </h2>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {filteredHistorique.length} résultat(s)
              </div>
            </div>

            {!filteredHistorique.length ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucun élément trouvé pour le filtre actuel.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {filteredHistorique.map((item) => (
                  <article
                    key={`${item.type}-${item.id}`}
                    className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Type
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {item.type === "AIDE" ? "Aide / Secours" : "Prêt"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Membre
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {item.membre_nom}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.numero_membre}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Statut
                          </p>
                          <div className="mt-2">
                            <span
                              className={[
                                "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                                getStatutClasses(item.statut),
                              ].join(" ")}
                            >
                              {item.statut || "-"}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Montant demandé
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatMoney(item.montant_demande)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">
                            Montant accordé
                          </p>
                          <p className="mt-1 text-sm font-bold text-emerald-700">
                            {formatMoney(item.montant_accorde)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Référence
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {item.reference}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 md:col-span-2 xl:col-span-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Motif / Objet
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {item.motif}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Date demande
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatDate(item.created_at)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Date traitement
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {formatDate(item.date_traitement)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          Action
                        </p>

                        {item.document_link ? (
                          <div className="mt-4">
                            <Link
                              href={item.document_link}
                              className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            >
                              Ouvrir la demande complète signée
                            </Link>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                            Pas de document à ouvrir pour cette aide.
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

