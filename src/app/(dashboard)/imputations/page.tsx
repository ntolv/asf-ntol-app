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

  ligne_statut?: string;
  annule_at?: string | null;
  motif_annulation?: string | null;
  modifiable?: boolean;
  retour_arriere_disponible?: boolean;
};

type EncaissementContribution = {
  contribution_id: string;
  membre_id: string;
  membre_nom: string;
  date_contribution: string;
  periode_reference?: string;
  montant_total: number;
  statut: string;

  origine?:
    | "COTISATION"
    | "REDISTRIBUTION_ENCHERES"
    | "REDISTRIBUTION_INTERETS";

  lignes: EncaissementLine[];
};

type EncaissementsResponse = {
  success: boolean;
  count?: number;

  permissions?: {
    can_manage_encaissements?: boolean;
  };

  role_code?: string | null;

  contributions?: EncaissementContribution[];
  message?: string;
};

type ActionResponse = {
  success?: boolean;
  message?: string;

  confirmation_required?: boolean;
  code?: string;

  nombre_encaissements_existants?: number;
  montant_deja_encaisse?: number;

  membre_id?: string;
  rubrique_id?: string;
  periode_reference?: string;
};

type CorrectionState = {
  ligne_id: string;

  membre_nom_avant: string;
  rubrique_nom_avant: string;
  montant_avant: number;

  nouveau_membre_id: string;
  nouvelle_rubrique_id: string;
  nouveau_montant: string;

  motif: string;
};

type AnnulationState = {
  ligne_id: string;
  membre_nom: string;
  rubrique_nom: string;
  montant: number;
  motif: string;
};

type RetourArriereState = {
  ligne_id: string;
  membre_nom: string;
  rubrique_nom: string;
  montant: number;
  motif: string;
};

const MOIS_OPTIONS = [
  { value: "", label: "Tous les mois" },
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`;
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatOrigine(
  origine:
    | EncaissementContribution["origine"]
    | undefined
) {
  if (
    origine ===
    "REDISTRIBUTION_ENCHERES"
  ) {
    return "Redistribution enchères";
  }

  if (
    origine ===
    "REDISTRIBUTION_INTERETS"
  ) {
    return "Crédit intérêts prêts";
  }

  return "Cotisation";
}

function getCurrentYear() {
  return String(
    new Date().getFullYear()
  );
}

function getCurrentMonth() {
  return String(
    new Date().getMonth() + 1
  );
}

export default function ImputationsPage() {
  const [loadingFilters, setLoadingFilters] =
    useState(true);

  const [loadingData, setLoadingData] =
    useState(true);

  const [actionBusy, setActionBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  const [actionSuccess, setActionSuccess] =
    useState("");

  const [membres, setMembres] =
    useState<MembreOption[]>([]);

  const [annees, setAnnees] =
    useState<string[]>([]);

  const [rubriques, setRubriques] =
    useState<RubriqueOption[]>([]);

  const [membreId, setMembreId] =
    useState("");

  const [annee, setAnnee] =
    useState(getCurrentYear());

  const [mois, setMois] =
    useState(getCurrentMonth());

  const [rubriqueId, setRubriqueId] =
    useState("");

  const [contributions, setContributions] =
    useState<EncaissementContribution[]>([]);

  const [canManage, setCanManage] =
    useState(false);

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [correction, setCorrection] =
    useState<CorrectionState | null>(null);

  const [
    correctionDuplicateWarning,
    setCorrectionDuplicateWarning,
  ] = useState<ActionResponse | null>(null);

  const [annulation, setAnnulation] =
    useState<AnnulationState | null>(null);

  const [
    retourArriere,
    setRetourArriere,
  ] =
    useState<RetourArriereState | null>(null);

  const [
    retourArriereDuplicateWarning,
    setRetourArriereDuplicateWarning,
  ] =
    useState<ActionResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadFilters() {
      setLoadingFilters(true);
      setError("");

      try {
        const response = await fetch(
          "/api/imputations/form-data",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as FormDataResponse;

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              "Impossible de charger les filtres"
          );
        }

        if (!mounted) return;

        const apiAnnees =
          result.annees ?? [];

        const currentYear =
          getCurrentYear();

        setMembres(
          result.membres ?? []
        );

        setAnnees(
          apiAnnees.includes(
            currentYear
          )
            ? apiAnnees
            : [
                currentYear,
                ...apiAnnees,
              ]
        );

        setRubriques(
          result.rubriques ?? []
        );
      } catch (err: any) {
        if (!mounted) return;

        setError(
          err?.message ||
            "Erreur de chargement des filtres"
        );
      } finally {
        if (mounted) {
          setLoadingFilters(false);
        }
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
        const params =
          new URLSearchParams();

        if (membreId) {
          params.set(
            "membre_id",
            membreId
          );
        }

        if (annee) {
          params.set(
            "annee",
            annee
          );
        }

        if (mois) {
          params.set(
            "mois",
            mois
          );
        }

        if (rubriqueId) {
          params.set(
            "rubrique_id",
            rubriqueId
          );
        }

        const suffix =
          params.toString()
            ? `?${params.toString()}`
            : "";

        const response = await fetch(
          `/api/imputations${suffix}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as EncaissementsResponse;

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              "Impossible de charger l'historique des encaissements"
          );
        }

        if (!mounted) return;

        setContributions(
          result.contributions ?? []
        );

        setCanManage(
          result.permissions
            ?.can_manage_encaissements ===
            true
        );
      } catch (err: any) {
        if (!mounted) return;

        setError(
          err?.message ||
            "Erreur de chargement de l'historique des encaissements"
        );
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    }

    loadEncaissements();

    return () => {
      mounted = false;
    };
  }, [
    membreId,
    annee,
    mois,
    rubriqueId,
    refreshKey,
  ]);

  const contributionsActives =
    useMemo(() => {
      return contributions.filter(
        (item) =>
          Number(
            item.montant_total ??
              0
          ) > 0
      );
    }, [contributions]);

  const totalEncaisse =
    useMemo(() => {
      return contributions.reduce(
        (sum, item) =>
          sum +
          Number(
            item.montant_total ??
              0
          ),
        0
      );
    }, [contributions]);

  const membresAyantCotise =
    useMemo(() => {
      return new Set(
        contributionsActives
          .filter(
            (item) =>
              item.membre_id
          )
          .map(
            (item) =>
              item.membre_id
          )
      ).size;
    }, [contributionsActives]);

  const ventilationRubriques =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            nom: string;
            total: number;
            ordre: number;
          }
        >();

      contributions.forEach(
        (item) => {
          item.lignes
            .filter(
              (ligne) =>
                String(
                  ligne.ligne_statut ??
                    "VALIDE"
                ).toUpperCase() ===
                "VALIDE"
            )
            .forEach(
              (ligne) => {
                const current =
                  map.get(
                    ligne.rubrique_id
                  ) ?? {
                    nom:
                      ligne.rubrique_nom,

                    total: 0,

                    ordre:
                      Number(
                        ligne.ordre_affichage ??
                          999
                      ),
                  };

                current.total +=
                  Number(
                    ligne.montant_ligne ??
                      0
                  );

                map.set(
                  ligne.rubrique_id,
                  current
                );
              }
            );
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.ordre -
            b.ordre ||
          a.nom.localeCompare(
            b.nom
          )
      );
    }, [contributions]);

  const rubriqueLabel =
    rubriques.find(
      (rubrique) =>
        rubrique.id === rubriqueId
    )?.nom ||
    "Toutes les rubriques";

  const moisLabel =
    MOIS_OPTIONS.find(
      (item) =>
        item.value === mois
    )?.label ||
    "Tous les mois";

  const periodeLabel =
    mois
      ? `${moisLabel} ${annee}`
      : `Année ${annee}`;

  function openCorrection(
    item: EncaissementContribution,
    ligne: EncaissementLine
  ) {
    setActionError("");
    setActionSuccess("");

    setCorrectionDuplicateWarning(
      null
    );

    setCorrection({
      ligne_id:
        ligne.ligne_id,

      membre_nom_avant:
        item.membre_nom,

      rubrique_nom_avant:
        ligne.rubrique_nom,

      montant_avant:
        Number(
          ligne.montant_ligne ??
            0
        ),

      nouveau_membre_id:
        item.membre_id,

      nouvelle_rubrique_id:
        ligne.rubrique_id,

      nouveau_montant:
        String(
          Number(
            ligne.montant_ligne ??
              0
          )
        ),

      motif: "",
    });
  }

  function openAnnulation(
    item: EncaissementContribution,
    ligne: EncaissementLine
  ) {
    setActionError("");
    setActionSuccess("");

    setAnnulation({
      ligne_id:
        ligne.ligne_id,

      membre_nom:
        item.membre_nom,

      rubrique_nom:
        ligne.rubrique_nom,

      montant:
        Number(
          ligne.montant_ligne ??
            0
        ),

      motif: "",
    });
  }

  async function submitCorrection(
    confirmerDoublon = false
  ) {
    if (
      !correction ||
      actionBusy
    ) {
      return;
    }

    setActionError("");
    setActionSuccess("");

    const montant =
      Number(
        correction.nouveau_montant
      );

    if (
      !Number.isFinite(
        montant
      ) ||
      montant <= 0
    ) {
      setActionError(
        "Le montant corrigé doit être supérieur à zéro."
      );
      return;
    }

    if (
      !correction.motif.trim()
    ) {
      setActionError(
        "Le motif de la correction est obligatoire."
      );
      return;
    }

    setActionBusy(true);

    try {
      const response =
        await fetch(
          "/api/imputations/corriger",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              ligne_id:
                correction.ligne_id,

              motif:
                correction.motif.trim(),

              nouveau_montant:
                montant,

              nouvelle_rubrique_id:
                correction.nouvelle_rubrique_id,

              nouveau_membre_id:
                correction.nouveau_membre_id,

              confirmer_doublon:
                confirmerDoublon,
            }),
          }
        );

      const result =
        (await response.json()) as ActionResponse;

      if (
        response.status ===
          409 &&
        result
          ?.confirmation_required ===
          true
      ) {
        setCorrectionDuplicateWarning(
          result
        );

        return;
      }

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Correction impossible."
        );
      }

      setCorrection(null);

      setCorrectionDuplicateWarning(
        null
      );

      setActionSuccess(
        result.message ||
          "Encaissement corrigé avec succès."
      );

      setRefreshKey(
        (value) =>
          value + 1
      );
    } catch (err: any) {
      setActionError(
        err?.message ||
          "Erreur lors de la correction."
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function submitAnnulation() {
    if (
      !annulation ||
      actionBusy
    ) {
      return;
    }

    setActionError("");
    setActionSuccess("");

    if (
      !annulation.motif.trim()
    ) {
      setActionError(
        "Le motif de l'annulation est obligatoire."
      );
      return;
    }

    setActionBusy(true);

    try {
      const response =
        await fetch(
          "/api/imputations/annuler",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              ligne_id:
                annulation.ligne_id,

              motif:
                annulation.motif.trim(),
            }),
          }
        );

      const result =
        (await response.json()) as ActionResponse;

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Annulation impossible."
        );
      }

      setAnnulation(null);

      setActionSuccess(
        result.message ||
          "Encaissement annulé avec succès."
      );

      setRefreshKey(
        (value) =>
          value + 1
      );
    } catch (err: any) {
      setActionError(
        err?.message ||
          "Erreur lors de l'annulation."
      );
    } finally {
      setActionBusy(false);
    }
  }

  function openRetourArriere(
    item: EncaissementContribution,
    ligne: EncaissementLine
  ) {
    setActionError("");
    setActionSuccess("");

    setRetourArriereDuplicateWarning(
      null
    );

    setRetourArriere({
      ligne_id:
        ligne.ligne_id,

      membre_nom:
        item.membre_nom,

      rubrique_nom:
        ligne.rubrique_nom,

      montant:
        Number(
          ligne.montant_ligne ??
            0
        ),

      motif: "",
    });
  }

  async function submitRetourArriere(
    confirmerDoublon = false
  ) {
    if (
      !retourArriere ||
      actionBusy
    ) {
      return;
    }

    setActionError("");
    setActionSuccess("");

    if (
      !retourArriere.motif.trim()
    ) {
      setActionError(
        "Le motif du retour arrière est obligatoire."
      );
      return;
    }

    setActionBusy(true);

    try {
      const response =
        await fetch(
          "/api/imputations/revenir-arriere",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              ligne_id:
                retourArriere.ligne_id,

              motif:
                retourArriere.motif.trim(),

              confirmer_doublon:
                confirmerDoublon,
            }),
          }
        );

      const result =
        (await response.json()) as ActionResponse;

      if (
        response.status ===
          409 &&
        result
          ?.confirmation_required ===
          true
      ) {
        setRetourArriereDuplicateWarning(
          result
        );

        return;
      }

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Retour arrière impossible."
        );
      }

      setRetourArriere(
        null
      );

      setRetourArriereDuplicateWarning(
        null
      );

      setActionSuccess(
        result.message ||
          "Retour arrière effectué avec succès."
      );

      setRefreshKey(
        (value) =>
          value + 1
      );
    } catch (err: any) {
      setActionError(
        err?.message ||
          "Erreur lors du retour arrière."
      );
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Historique des encaissements"
          subtitle="Consultation des encaissements enregistrés, ventilés par membre et par rubrique."
          size="lg"
        />

        {actionSuccess ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">
              {actionSuccess}
            </p>
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-red-700">
              {actionError}
            </p>
          </div>
        ) : null}

        <SectionCard padding="md">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Année
              </span>

              <select
                value={annee}
                onChange={(e) => {
                  const nouvelleAnnee =
                    e.target.value;

                  setAnnee(
                    nouvelleAnnee
                  );

                  setMois(
                    nouvelleAnnee ===
                      getCurrentYear()
                      ? getCurrentMonth()
                      : ""
                  );
                }}
                disabled={
                  loadingFilters
                }
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              >
                {annees.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Mois
              </span>

              <select
                value={mois}
                onChange={(e) =>
                  setMois(
                    e.target.value
                  )
                }
                disabled={
                  loadingFilters ||
                  !annee
                }
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              >
                {MOIS_OPTIONS.map(
                  (item) => (
                    <option
                      key={
                        item.value ||
                        "tous"
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Membre
              </span>

              <select
                value={membreId}
                onChange={(e) =>
                  setMembreId(
                    e.target.value
                  )
                }
                disabled={
                  loadingFilters
                }
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              >
                <option value="">
                  Tous les membres
                </option>

                {membres.map(
                  (membre) => (
                    <option
                      key={
                        membre.id
                      }
                      value={
                        membre.id
                      }
                    >
                      {
                        membre.nom_complet
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Rubrique
              </span>

              <select
                value={
                  rubriqueId
                }
                onChange={(e) =>
                  setRubriqueId(
                    e.target.value
                  )
                }
                disabled={
                  loadingFilters
                }
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60"
              >
                <option value="">
                  Toutes les rubriques
                </option>

                {rubriques.map(
                  (rubrique) => (
                    <option
                      key={
                        rubrique.id
                      }
                      value={
                        rubrique.id
                      }
                    >
                      {
                        rubrique.nom
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="flex items-end">
              <ActionButton
                variant="outline"
                size="md"
                fullWidth
                onClick={() => {
                  setMembreId(
                    ""
                  );

                  setAnnee(
                    getCurrentYear()
                  );

                  setMois(
                    getCurrentMonth()
                  );

                  setRubriqueId(
                    ""
                  );
                }}
              >
                Réinitialiser
              </ActionButton>
            </div>
          </div>
        </SectionCard>

        {(loadingFilters ||
          loadingData) && (
          <LoadingState
            message="Chargement des données..."
            size="md"
            variant="default"
          />
        )}

        {!loadingFilters &&
          !loadingData && (
            <SectionCard
              title={`Résumé des encaissements — ${periodeLabel}`}
              subtitle={`Rubrique : ${rubriqueLabel}`}
              padding="md"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Montant total encaissé
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {formatFcfa(
                      totalEncaisse
                    )}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Nombre d'encaissements actifs
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {
                      contributionsActives.length
                    }
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Membres ayant cotisé
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {
                      membresAyantCotise
                    }
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  Ventilation par rubrique
                </p>

                {ventilationRubriques.length ===
                0 ? (
                  <p className="text-sm text-slate-500">
                    Aucun encaissement actif trouvé pour ces filtres.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ventilationRubriques.map(
                      (item) => (
                        <div
                          key={
                            item.nom
                          }
                          className="flex items-center justify-between gap-4 rounded-[12px] bg-white px-4 py-3"
                        >
                          <span className="text-sm font-medium text-slate-700">
                            {
                              item.nom
                            }
                          </span>

                          <span className="text-sm font-bold text-slate-900">
                            {formatFcfa(
                              item.total
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

        {error ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </section>
        ) : null}

        <SectionCard
          title={`Historique détaillé — ${periodeLabel}`}
          subtitle="Les lignes annulées restent visibles pour assurer la traçabilité."
          padding="md"
        >
          {loadingData ? (
            <LoadingState
              message="Chargement de l'historique..."
              size="md"
              variant="default"
            />
          ) : contributions.length ===
            0 ? (
            <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-5">
              <p className="text-sm text-slate-600">
                Aucun encaissement trouvé pour ces filtres.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {contributions.map(
                (item) => (
                  <article
                    key={
                      item.contribution_id
                    }
                    className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-slate-900">
                          {
                            item.membre_nom
                          }
                        </p>

                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                          {formatOrigine(
                            item.origine
                          )}
                        </p>

                        <p className="text-sm text-slate-500">
                          Encaissement du{" "}
                          {formatDate(
                            item.date_contribution
                          )}
                        </p>

                        {item.periode_reference ? (
                          <p className="text-xs text-slate-400">
                            Période :{" "}
                            {
                              item.periode_reference
                            }
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                        <div className="rounded-[12px] border border-white bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            Statut
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {
                              item.statut
                            }
                          </p>
                        </div>

                        <div className="rounded-[12px] border border-white bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                            Total encaissé actif
                          </p>

                          <p className="mt-2 text-sm font-semibold text-emerald-700">
                            {formatFcfa(
                              Number(
                                item.montant_total ??
                                  0
                              )
                            )}
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

                            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Statut
                            </th>

                            {canManage ? (
                              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Actions
                              </th>
                            ) : null}
                          </tr>
                        </thead>

                        <tbody>
                          {item.lignes.map(
                            (ligne) => {
                              const ligneAnnulee =
                                String(
                                  ligne.ligne_statut ??
                                    "VALIDE"
                                ).toUpperCase() ===
                                "ANNULE";

                              return (
                                <tr
                                  key={
                                    ligne.ligne_id
                                  }
                                >
                                  <td
                                    className={`rounded-l-[12px] border border-slate-200 border-r-0 bg-white px-3 py-3 text-sm font-medium ${
                                      ligneAnnulee
                                        ? "text-slate-400 line-through"
                                        : "text-slate-700"
                                    }`}
                                  >
                                    {
                                      ligne.rubrique_nom
                                    }

                                    {ligneAnnulee &&
                                    ligne.motif_annulation ? (
                                      <p className="mt-2 text-xs font-normal text-red-600 no-underline">
                                        Motif :{" "}
                                        {
                                          ligne.motif_annulation
                                        }
                                      </p>
                                    ) : null}

                                    {ligneAnnulee &&
                                    ligne.annule_at ? (
                                      <p className="mt-1 text-xs font-normal text-slate-400 no-underline">
                                        Annulé le{" "}
                                        {formatDateTime(
                                          ligne.annule_at
                                        )}
                                      </p>
                                    ) : null}
                                  </td>

                                  <td
                                    className={`border border-slate-200 border-l-0 bg-white px-3 py-3 text-right text-sm font-semibold ${
                                      ligneAnnulee
                                        ? "text-slate-400 line-through"
                                        : "text-slate-900"
                                    }`}
                                  >
                                    {formatFcfa(
                                      Number(
                                        ligne.montant_ligne ??
                                          0
                                      )
                                    )}
                                  </td>

                                  <td className="border border-slate-200 border-l-0 bg-white px-3 py-3 text-center">
                                    {ligneAnnulee ? (
                                      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                        ANNULÉ
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                        VALIDE
                                      </span>
                                    )}
                                  </td>

                                  {canManage ? (
                                    <td className="rounded-r-[12px] border border-slate-200 border-l-0 bg-white px-3 py-3 text-right">
                                      {ligne.modifiable ===
                                      true ? (
                                        <div className="flex flex-wrap justify-end gap-2">
                                          <ActionButton
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              openCorrection(
                                                item,
                                                ligne
                                              )
                                            }
                                          >
                                            Corriger
                                          </ActionButton>

                                          <ActionButton
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              openAnnulation(
                                                item,
                                                ligne
                                              )
                                            }
                                          >
                                            Annuler
                                          </ActionButton>

                                          {ligne.retour_arriere_disponible ===
                                          true ? (
                                            <ActionButton
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() =>
                                                openRetourArriere(
                                                  item,
                                                  ligne
                                                )
                                              }
                                            >
                                              Revenir en arrière
                                            </ActionButton>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400">
                                          —
                                        </span>
                                      )}
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {correction ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Corriger l'encaissement
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              L'ancienne ligne restera dans l'historique avec le statut ANNULÉ.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Valeurs actuelles
              </p>

              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  Membre :{" "}
                  <strong>
                    {
                      correction.membre_nom_avant
                    }
                  </strong>
                </p>

                <p>
                  Rubrique :{" "}
                  <strong>
                    {
                      correction.rubrique_nom_avant
                    }
                  </strong>
                </p>

                <p>
                  Montant :{" "}
                  <strong>
                    {formatFcfa(
                      correction.montant_avant
                    )}
                  </strong>
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Nouveau destinataire
                </span>

                <select
                  value={
                    correction.nouveau_membre_id
                  }
                  onChange={(e) => {
                    setCorrectionDuplicateWarning(
                      null
                    );

                    setCorrection(
                      (prev) =>
                        prev
                          ? {
                              ...prev,
                              nouveau_membre_id:
                                e.target.value,
                            }
                          : prev
                    );
                  }}
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  {membres.map(
                    (membre) => (
                      <option
                        key={
                          membre.id
                        }
                        value={
                          membre.id
                        }
                      >
                        {
                          membre.nom_complet
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Nouvelle rubrique
                </span>

                <select
                  value={
                    correction.nouvelle_rubrique_id
                  }
                  onChange={(e) => {
                    setCorrectionDuplicateWarning(
                      null
                    );

                    setCorrection(
                      (prev) =>
                        prev
                          ? {
                              ...prev,
                              nouvelle_rubrique_id:
                                e.target.value,
                            }
                          : prev
                    );
                  }}
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  {rubriques.map(
                    (rubrique) => (
                      <option
                        key={
                          rubrique.id
                        }
                        value={
                          rubrique.id
                        }
                      >
                        {
                          rubrique.nom
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Nouveau montant
                </span>

                <input
                  type="number"
                  min="1"
                  step="100"
                  value={
                    correction.nouveau_montant
                  }
                  onChange={(e) => {
                    setCorrectionDuplicateWarning(
                      null
                    );

                    setCorrection(
                      (prev) =>
                        prev
                          ? {
                              ...prev,
                              nouveau_montant:
                                e.target.value,
                            }
                          : prev
                    );
                  }}
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Motif de la correction
                </span>

                <textarea
                  rows={3}
                  value={
                    correction.motif
                  }
                  onChange={(e) =>
                    setCorrection(
                      (prev) =>
                        prev
                          ? {
                              ...prev,
                              motif:
                                e.target.value,
                            }
                          : prev
                    )
                  }
                  placeholder="Ex. Mauvais montant enregistré"
                  className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
                />
              </label>
            </div>

            {correctionDuplicateWarning ? (
              <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900">
                  ⚠️ Doublon détecté
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Un encaissement existe déjà pour ce membre, cette rubrique et cette période.
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Déjà encaissé :{" "}
                  <strong>
                    {formatFcfa(
                      Number(
                        correctionDuplicateWarning.montant_deja_encaisse ??
                          0
                      )
                    )}
                  </strong>
                </p>

                <p className="text-sm text-amber-800">
                  Nombre existant :{" "}
                  <strong>
                    {Number(
                      correctionDuplicateWarning.nombre_encaissements_existants ??
                        0
                    )}
                  </strong>
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <ActionButton
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  disabled={
                    actionBusy
                  }
                  onClick={() => {
                    setCorrection(
                      null
                    );

                    setCorrectionDuplicateWarning(
                      null
                    );

                    setActionError(
                      ""
                    );
                  }}
                >
                  Fermer
                </ActionButton>
              </div>

              <div className="flex-1">
                <ActionButton
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={
                    actionBusy
                  }
                  disabled={
                    actionBusy
                  }
                  onClick={() =>
                    submitCorrection(
                      correctionDuplicateWarning
                        ? true
                        : false
                    )
                  }
                >
                  {correctionDuplicateWarning
                    ? "Corriger quand même"
                    : "Valider la correction"}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {annulation ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Annuler l'encaissement
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              L'opération restera visible dans l'Historique mais ne sera plus comptabilisée.
            </p>

            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                Membre :{" "}
                <strong>
                  {
                    annulation.membre_nom
                  }
                </strong>
              </p>

              <p className="mt-1 text-sm text-red-800">
                Rubrique :{" "}
                <strong>
                  {
                    annulation.rubrique_nom
                  }
                </strong>
              </p>

              <p className="mt-1 text-sm text-red-800">
                Montant :{" "}
                <strong>
                  {formatFcfa(
                    annulation.montant
                  )}
                </strong>
              </p>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Motif de l'annulation
              </span>

              <textarea
                rows={3}
                value={
                  annulation.motif
                }
                onChange={(e) =>
                  setAnnulation(
                    (prev) =>
                      prev
                        ? {
                            ...prev,
                            motif:
                              e.target.value,
                          }
                        : prev
                  )
                }
                placeholder="Ex. Encaissement en double"
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <ActionButton
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  disabled={
                    actionBusy
                  }
                  onClick={() => {
                    setAnnulation(
                      null
                    );

                    setActionError(
                      ""
                    );
                  }}
                >
                  Retour
                </ActionButton>
              </div>

              <div className="flex-1">
                <ActionButton
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={
                    actionBusy
                  }
                  disabled={
                    actionBusy
                  }
                  onClick={
                    submitAnnulation
                  }
                >
                  Annuler l'encaissement
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {retourArriere ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Revenir en arrière
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              La dernière correction de cette ligne sera annulée et la version précédente redeviendra active.
            </p>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                Membre :{" "}
                <strong>
                  {retourArriere.membre_nom}
                </strong>
              </p>

              <p className="mt-1 text-sm text-amber-900">
                Rubrique actuelle :{" "}
                <strong>
                  {retourArriere.rubrique_nom}
                </strong>
              </p>

              <p className="mt-1 text-sm text-amber-900">
                Montant actuel :{" "}
                <strong>
                  {formatFcfa(
                    retourArriere.montant
                  )}
                </strong>
              </p>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Motif du retour arrière
              </span>

              <textarea
                rows={3}
                value={
                  retourArriere.motif
                }
                onChange={(e) => {
                  setRetourArriereDuplicateWarning(
                    null
                  );

                  setRetourArriere(
                    (prev) =>
                      prev
                        ? {
                            ...prev,
                            motif:
                              e.target.value,
                          }
                        : prev
                  );
                }}
                placeholder="Ex. Annulation d'une correction de test"
                className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm"
              />
            </label>

            {retourArriereDuplicateWarning ? (
              <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900">
                  ⚠️ Doublon détecté
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Le retour arrière recréerait un encaissement déjà existant pour ce membre, cette rubrique et cette période.
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Déjà encaissé :{" "}
                  <strong>
                    {formatFcfa(
                      Number(
                        retourArriereDuplicateWarning.montant_deja_encaisse ??
                          0
                      )
                    )}
                  </strong>
                </p>

                <p className="text-sm text-amber-800">
                  Nombre existant :{" "}
                  <strong>
                    {Number(
                      retourArriereDuplicateWarning.nombre_encaissements_existants ??
                        0
                    )}
                  </strong>
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <ActionButton
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  disabled={
                    actionBusy
                  }
                  onClick={() => {
                    setRetourArriere(
                      null
                    );

                    setRetourArriereDuplicateWarning(
                      null
                    );

                    setActionError(
                      ""
                    );
                  }}
                >
                  Fermer
                </ActionButton>
              </div>

              <div className="flex-1">
                <ActionButton
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={
                    actionBusy
                  }
                  disabled={
                    actionBusy
                  }
                  onClick={() =>
                    submitRetourArriere(
                      retourArriereDuplicateWarning
                        ? true
                        : false
                    )
                  }
                >
                  {retourArriereDuplicateWarning
                    ? "Revenir en arrière quand même"
                    : "Confirmer le retour"}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

