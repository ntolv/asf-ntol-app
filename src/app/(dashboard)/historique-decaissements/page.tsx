"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type MembreOption = {
  id: string;
  nom_complet: string;
};

type RubriqueOption = {
  id: string;
  nom: string;
};

type Decaissement = {
  id: string;

  caisse_id: string;
  caisse_libelle: string;

  rubrique_id: string;
  rubrique_nom: string;

  membre_id: string | null;
  membre_nom_complet:
    | string
    | null;

  montant:
    | number
    | string;

  motif: string;

  date_decaissement: string;

  statut:
    | "VALIDE"
    | "ANNULE"
    | string;

  annule_at:
    | string
    | null;

  motif_annulation:
    | string
    | null;

  tontine_lot_id:
    | string
    | null;

  reference_paiement:
    | string
    | null;

  origine:
    | "MANUEL"
    | "PRET"
    | "TONTINE"
    | "AIDE"
    | string;

  can_corriger: boolean;
  can_annuler: boolean;

  can_revenir_arriere:
    boolean;

  derniere_action_restaurable:
    | string
    | null;

  protection_source:
    boolean;
};

type Resume = {
  total_valide: number;
  total_annule: number;
  nombre_valides: number;
  nombre_annules: number;
};

const MOIS = [
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

function formatMontant(
  value: unknown
) {
  const amount =
    Number(value ?? 0);

  if (
    !Number.isFinite(amount)
  ) {
    return "0 FCFA";
  }

  return (
    new Intl.NumberFormat(
      "fr-FR",
      {
        maximumFractionDigits: 0,
      }
    ).format(amount) +
    " FCFA"
  );
}

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

function dateInputValue(
  value: string
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function origineLabel(
  origine: string
) {
  switch (
    String(
      origine ?? ""
    ).toUpperCase()
  ) {
    case "PRET":
      return "Prêt";

    case "TONTINE":
      return "Tontine";

    case "AIDE":
      return "Aide";

    default:
      return "Manuel";
  }
}

export default function HistoriqueDecaissementsPage() {
  const currentYear =
    String(
      new Date().getFullYear()
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    accessDenied,
    setAccessDenied,
  ] =
    useState(false);

  const [
    rows,
    setRows,
  ] =
    useState<
      Decaissement[]
    >([]);

  const [
    annees,
    setAnnees,
  ] =
    useState<
      string[]
    >([]);

  const [
    membres,
    setMembres,
  ] =
    useState<
      MembreOption[]
    >([]);

  const [
    rubriques,
    setRubriques,
  ] =
    useState<
      RubriqueOption[]
    >([]);

  const [
    resume,
    setResume,
  ] =
    useState<Resume>({
      total_valide: 0,
      total_annule: 0,
      nombre_valides: 0,
      nombre_annules: 0,
    });

  const [
    annee,
    setAnnee,
  ] =
    useState(
      currentYear
    );

  const [
    mois,
    setMois,
  ] =
    useState("");

  const [
    membreId,
    setMembreId,
  ] =
    useState("");

  const [
    rubriqueId,
    setRubriqueId,
  ] =
    useState("");

  const [
    statut,
    setStatut,
  ] =
    useState("TOUS");

  const [
    selected,
    setSelected,
  ] =
    useState<
      Decaissement | null
    >(null);

  const [
    modal,
    setModal,
  ] =
    useState<
      | "CORRIGER"
      | "ANNULER"
      | "REVENIR"
      | null
    >(null);

  const [
    correctionMontant,
    setCorrectionMontant,
  ] =
    useState("");

  const [
    correctionRubriqueId,
    setCorrectionRubriqueId,
  ] =
    useState("");

  const [
    correctionMembreId,
    setCorrectionMembreId,
  ] =
    useState("");

  const [
    correctionDate,
    setCorrectionDate,
  ] =
    useState("");

  const [
    correctionMotifOperation,
    setCorrectionMotifOperation,
  ] =
    useState("");

  const [
    motifAction,
    setMotifAction,
  ] =
    useState("");

  const loadFormData =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/decaissements/form-data",
            {
              cache:
                "no-store",
            }
          );

        const json =
          await response.json();

        if (
          response.status ===
          403
        ) {
          setAccessDenied(
            true
          );
          return;
        }

        if (
          !response.ok ||
          !json?.success
        ) {
          throw new Error(
            json?.message ||
              "Impossible de charger les filtres."
          );
        }

        setMembres(
          json.membres ??
            []
        );

        setRubriques(
          json.rubriques ??
            []
        );
      },
      []
    );

  const loadHistory =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const params =
            new URLSearchParams();

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

          if (membreId) {
            params.set(
              "membre_id",
              membreId
            );
          }

          if (rubriqueId) {
            params.set(
              "rubrique_id",
              rubriqueId
            );
          }

          if (statut) {
            params.set(
              "statut",
              statut
            );
          }

          const response =
            await fetch(
              `/api/decaissements?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const json =
            await response.json();

          if (
            response.status ===
            403
          ) {
            setAccessDenied(
              true
            );
            return;
          }

          if (
            !response.ok ||
            !json?.success
          ) {
            throw new Error(
              json?.message ||
                "Impossible de charger l'historique."
            );
          }

          setRows(
            json.data ??
              []
          );

          setAnnees(
            json.annees ??
              []
          );

          setResume({
            total_valide:
              Number(
                json?.resume
                  ?.total_valide ??
                  0
              ),

            total_annule:
              Number(
                json?.resume
                  ?.total_annule ??
                  0
              ),

            nombre_valides:
              Number(
                json?.resume
                  ?.nombre_valides ??
                  0
              ),

            nombre_annules:
              Number(
                json?.resume
                  ?.nombre_annules ??
                  0
              ),
          });
        } catch (
          loadError: any
        ) {
          setError(
            loadError
              ?.message ||
              "Erreur de chargement."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        annee,
        mois,
        membreId,
        rubriqueId,
        statut,
      ]
    );

  useEffect(() => {
    loadFormData()
      .catch(
        (
          loadError: any
        ) => {
          setError(
            loadError
              ?.message ||
              "Erreur de chargement."
          );
        }
      );
  }, [
    loadFormData,
  ]);

  useEffect(() => {
    loadHistory();
  }, [
    loadHistory,
  ]);

  const totalAffiche =
    useMemo(
      () =>
        rows.reduce(
          (
            total,
            row
          ) =>
            total +
            Number(
              row.montant ??
                0
            ),
          0
        ),
      [
        rows,
      ]
    );

  function openCorrection(
    row: Decaissement
  ) {
    setSelected(row);

    setCorrectionMontant(
      String(
        row.montant ??
          ""
      )
    );

    setCorrectionRubriqueId(
      row.rubrique_id ??
        ""
    );

    setCorrectionMembreId(
      row.membre_id ??
        ""
    );

    setCorrectionDate(
      dateInputValue(
        row.date_decaissement
      )
    );

    setCorrectionMotifOperation(
      row.motif ??
        ""
    );

    setMotifAction("");
    setModal(
      "CORRIGER"
    );
  }

  function openAnnulation(
    row: Decaissement
  ) {
    setSelected(row);
    setMotifAction("");
    setModal(
      "ANNULER"
    );
  }

  function openRetour(
    row: Decaissement
  ) {
    setSelected(row);
    setMotifAction("");
    setModal(
      "REVENIR"
    );
  }

  function closeModal() {
    if (
      actionLoading
    ) {
      return;
    }

    setModal(null);
    setSelected(null);
    setMotifAction("");
  }

  async function submitCorrection() {
    if (!selected) {
      return;
    }

    if (
      !motifAction.trim()
    ) {
      setError(
        "Le motif de la correction est obligatoire."
      );
      return;
    }

    setActionLoading(
      true
    );
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/decaissements/corriger",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                decaissement_id:
                  selected.id,

                motif:
                  motifAction,

                nouveau_montant:
                  Number(
                    correctionMontant
                  ),

                nouvelle_rubrique_id:
                  correctionRubriqueId,

                nouveau_membre_id:
                  correctionMembreId ||
                  null,

                nouvelle_date:
                  correctionDate,

                nouveau_motif_operation:
                  correctionMotifOperation,
              }),
          }
        );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.message ||
            "Correction impossible."
        );
      }

      setMessage(
        json?.message ||
          "Décaissement corrigé."
      );

      closeModal();
      await loadHistory();
    } catch (
      actionError: any
    ) {
      setError(
        actionError
          ?.message ||
          "Correction impossible."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  async function submitSimpleAction(
    endpoint: string
  ) {
    if (!selected) {
      return;
    }

    if (
      !motifAction.trim()
    ) {
      setError(
        "Le motif est obligatoire."
      );
      return;
    }

    setActionLoading(
      true
    );
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          endpoint,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                decaissement_id:
                  selected.id,

                motif:
                  motifAction,
              }),
          }
        );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.message ||
            "Opération impossible."
        );
      }

      setMessage(
        json?.message ||
          "Opération effectuée."
      );

      closeModal();
      await loadHistory();
    } catch (
      actionError: any
    ) {
      setError(
        actionError
          ?.message ||
          "Opération impossible."
      );
    } finally {
      setActionLoading(
        false
      );
    }
  }

  if (accessDenied) {
    return (
      <div className="p-4 md:p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-800">
            Accès refusé
          </h1>

          <p className="mt-2 text-red-700">
            L’historique des décaissements est réservé au Bureau :
            Président, Trésorier et Administrateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Historique des décaissements
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Consultation, correction et traçabilité des sorties de caisse.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase text-slate-500">
              Décaissements valides
            </div>

            <div className="mt-2 text-xl font-bold">
              {formatMontant(
                resume.total_valide
              )}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {resume.nombre_valides} mouvement(s)
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase text-slate-500">
              Décaissements annulés
            </div>

            <div className="mt-2 text-xl font-bold">
              {formatMontant(
                resume.total_annule
              )}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {resume.nombre_annules} mouvement(s)
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase text-slate-500">
              Lignes affichées
            </div>

            <div className="mt-2 text-xl font-bold">
              {rows.length}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase text-slate-500">
              Total affiché
            </div>

            <div className="mt-2 text-xl font-bold">
              {formatMontant(
                totalAffiche
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Année
              </span>

              <select
                value={annee}
                onChange={(event) => {
                  setAnnee(
                    event.target.value
                  );

                  if (
                    !event.target.value
                  ) {
                    setMois("");
                  }
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">
                  Toutes les années
                </option>

                {annees.map(
                  (
                    year
                  ) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Mois
              </span>

              <select
                value={mois}
                disabled={
                  !annee
                }
                onChange={(event) =>
                  setMois(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-slate-100"
              >
                {MOIS.map(
                  (
                    option
                  ) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Membre
              </span>

              <select
                value={membreId}
                onChange={(event) =>
                  setMembreId(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">
                  Tous les membres
                </option>

                {membres.map(
                  (
                    membre
                  ) => (
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

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Rubrique
              </span>

              <select
                value={rubriqueId}
                onChange={(event) =>
                  setRubriqueId(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">
                  Toutes les rubriques
                </option>

                {rubriques.map(
                  (
                    rubrique
                  ) => (
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

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-600">
                Statut
              </span>

              <select
                value={statut}
                onChange={(event) =>
                  setStatut(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="TOUS">
                  Tous
                </option>

                <option value="VALIDE">
                  Valides
                </option>

                <option value="ANNULE">
                  Annulés
                </option>
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">
              Chargement de l’historique...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">
              Aucun décaissement pour les filtres sélectionnés.
            </div>
          ) : (
            rows.map(
              (
                row
              ) => (
                <article
                  key={row.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ${
                    String(
                      row.statut
                    ).toUpperCase() ===
                    "ANNULE"
                      ? "opacity-70"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">

                        <span className="text-lg font-bold">
                          {formatMontant(
                            row.montant
                          )}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            String(
                              row.statut
                            ).toUpperCase() ===
                            "ANNULE"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {String(
                            row.statut
                          ).toUpperCase()}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {origineLabel(
                            row.origine
                          )}
                        </span>
                      </div>

                      <div className="text-sm font-medium text-slate-900">
                        {row.rubrique_nom}
                      </div>

                      <div className="text-sm text-slate-600">
                        {row.membre_nom_complet ||
                          "Aucun bénéficiaire renseigné"}
                      </div>

                      <div className="text-sm text-slate-600">
                        {row.motif}
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>
                          Date :{" "}
                          {formatDate(
                            row.date_decaissement
                          )}
                        </span>

                        <span>
                          Caisse :{" "}
                          {row.caisse_libelle}
                        </span>

                        {row.reference_paiement && (
                          <span>
                            Référence :{" "}
                            {row.reference_paiement}
                          </span>
                        )}
                      </div>

                      {String(
                        row.statut
                      ).toUpperCase() ===
                        "ANNULE" && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                          Annulé le{" "}
                          {formatDate(
                            row.annule_at
                          )}
                          {row.motif_annulation
                            ? ` — ${row.motif_annulation}`
                            : ""}
                        </div>
                      )}

                      {row.protection_source &&
                        String(
                          row.statut
                        ).toUpperCase() ===
                          "VALIDE" && (
                          <div className="text-xs text-amber-700">
                            Mouvement lié au module{" "}
                            {origineLabel(
                              row.origine
                            )}
                            . Les données métier sensibles sont protégées.
                          </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {row.can_corriger && (
                        <button
                          type="button"
                          onClick={() =>
                            openCorrection(
                              row
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                          Corriger
                        </button>
                      )}

                      {row.can_annuler && (
                        <button
                          type="button"
                          onClick={() =>
                            openAnnulation(
                              row
                            )
                          }
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Annuler
                        </button>
                      )}

                      {row.can_revenir_arriere && (
                        <button
                          type="button"
                          onClick={() =>
                            openRetour(
                              row
                            )
                          }
                          className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Revenir en arrière
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            )
          )}
        </div>
      </div>

      {modal &&
        selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    {modal ===
                    "CORRIGER"
                      ? "Corriger le décaissement"
                      : modal ===
                          "ANNULER"
                        ? "Annuler le décaissement"
                        : "Revenir en arrière"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatMontant(
                      selected.montant
                    )}{" "}
                    —{" "}
                    {
                      selected.rubrique_nom
                    }
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    closeModal
                  }
                  className="rounded-lg border px-3 py-1.5 text-sm"
                >
                  Fermer
                </button>
              </div>

              {modal ===
                "CORRIGER" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">

                  <label className="space-y-1">
                    <span className="text-sm font-medium">
                      Montant
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={
                        correctionMontant
                      }
                      disabled={
                        selected.protection_source
                      }
                      onChange={(event) =>
                        setCorrectionMontant(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium">
                      Date du décaissement
                    </span>

                    <input
                      type="date"
                      value={
                        correctionDate
                      }
                      onChange={(event) =>
                        setCorrectionDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium">
                      Rubrique
                    </span>

                    <select
                      value={
                        correctionRubriqueId
                      }
                      disabled={
                        selected.protection_source
                      }
                      onChange={(event) =>
                        setCorrectionRubriqueId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
                    >
                      {rubriques.map(
                        (
                          rubrique
                        ) => (
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

                  <label className="space-y-1">
                    <span className="text-sm font-medium">
                      Bénéficiaire
                    </span>

                    <select
                      value={
                        correctionMembreId
                      }
                      disabled={
                        selected.protection_source
                      }
                      onChange={(event) =>
                        setCorrectionMembreId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"
                    >
                      <option value="">
                        Aucun bénéficiaire
                      </option>

                      {membres.map(
                        (
                          membre
                        ) => (
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

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium">
                      Motif du décaissement
                    </span>

                    <textarea
                      rows={3}
                      value={
                        correctionMotifOperation
                      }
                      onChange={(event) =>
                        setCorrectionMotifOperation(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border px-3 py-2"
                    />
                  </label>

                  {selected.protection_source && (
                    <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Ce mouvement provient du module{" "}
                      {origineLabel(
                        selected.origine
                      )}
                      . Le montant, la rubrique et le bénéficiaire ne peuvent pas être modifiés ici.
                    </div>
                  )}
                </div>
              )}

              {modal ===
                "ANNULER" && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  Le mouvement restera visible dans l’historique mais ne sera plus comptabilisé dans les caisses et bilans.
                </div>
              )}

              {modal ===
                "REVENIR" && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  La dernière modification disponible sera annulée et la version précédente sera restaurée.
                  {selected.derniere_action_restaurable
                    ? ` Action concernée : ${selected.derniere_action_restaurable}.`
                    : ""}
                </div>
              )}

              <label className="mt-5 block space-y-1">
                <span className="text-sm font-medium">
                  {modal ===
                  "CORRIGER"
                    ? "Motif de la correction"
                    : modal ===
                        "ANNULER"
                      ? "Motif de l’annulation"
                      : "Motif du retour arrière"}
                </span>

                <textarea
                  rows={3}
                  value={
                    motifAction
                  }
                  onChange={(event) =>
                    setMotifAction(
                      event.target.value
                    )
                  }
                  placeholder="Motif obligatoire"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    closeModal
                  }
                  className="rounded-lg border px-4 py-2 text-sm font-medium"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() => {
                    if (
                      modal ===
                      "CORRIGER"
                    ) {
                      submitCorrection();
                      return;
                    }

                    if (
                      modal ===
                      "ANNULER"
                    ) {
                      submitSimpleAction(
                        "/api/decaissements/annuler"
                      );
                      return;
                    }

                    submitSimpleAction(
                      "/api/decaissements/revenir-arriere"
                    );
                  }}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {actionLoading
                    ? "Traitement..."
                    : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}