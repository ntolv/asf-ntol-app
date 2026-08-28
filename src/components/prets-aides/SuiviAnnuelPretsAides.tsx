"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Membre = {
  id?: string;
  nom_complet?: string | null;
  numero_membre?: string | null;
};

type Financement = {
  id?: string;
  rubrique_id: string;
  rubrique_nom?: string;
  caisse_id: string;
  caisse_libelle?: string;
  montant_finance: number;
  decaissement_id?: string | null;
};

type Pret = {
  id: string;
  membre_id?: string | null;
  date_octroi?: string | null;
  montant_accorde: number;
  solde_restant: number;
  statut_pret?: string | null;
  origine_pret?: string | null;
  reference_import_historique?: string | null;
  financements: Financement[];
  peut_rembourser: boolean;
  peut_reaffecter: boolean;
  membres?: Membre | null;
};

type Aide = {
  id: string;
  membre_id?: string | null;
  date_aide?: string | null;
  montant_accorde: number;
  statut_aide?: string | null;
  commentaire?: string | null;
  origine_aide?: string | null;
  reference_import_historique?: string | null;
  financements: Financement[];
  peut_reaffecter: boolean;
  membres?: Membre | null;
};

type Repartition = {
  rubrique_id: string;
  rubrique_nom: string;
  caisse_id: string;
  caisse_libelle: string;
  prets: number;
  aides: number;
  total: number;
};

type RubriqueFinancement = {
  rubrique_id: string;
  rubrique_nom: string;
  caisse_id: string;
  caisse_libelle: string;
  solde_actuel: number;
};

type SyntheseData = {
  exercice: number;
  exercices: number[];
  is_bureau: boolean;
  scope: "TOUS" | "MOI";
  synthese: {
    nombre_prets: number;
    montant_prets: number;
    nombre_aides: number;
    montant_aides: number;
    total_finance: number;
    reste_a_rembourser: number;
  };
  repartition: Repartition[];
  prets: Pret[];
  aides: Aide[];
  rubriques_financement: RubriqueFinancement[];
};

type VentilationEdit = {
  rubrique_id: string;
  montant: string;
};

type ReaffectationState = {
  type: "PRET" | "AIDE";
  id: string;
  libelle: string;
  montantGlobal: number;
  ventilation: VentilationEdit[];
};

type PreviewCaisse = {
  caisse_id?: string;
  caisse?: string;
  rubrique_id?: string;
  rubrique?: string;
  solde_actuel?: number;
  ancienne_attribution?: number;
  nouvelle_attribution?: number;
  solde_apres?: number;
  deficit?: number;
};

type PreviewData = {
  montant_global?: number;
  total_nouvelle_ventilation?: number;
  montant_global_conserve?: boolean;
  caisses?: PreviewCaisse[];
  deficits?: PreviewCaisse[];
  confirmation_deficit_requise?: boolean;
};

function money(value: unknown) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("fr-FR");
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

function nomMembre(
  membre: Membre | null | undefined,
  membreId?: string | null
) {
  if (membre?.nom_complet) {
    return membre.nom_complet;
  }

  if (!membreId) {
    return "Association / bénéficiaire externe";
  }

  return "Membre";
}

export default function SuiviAnnuelPretsAides() {
  const anneeCourante = new Date().getFullYear();

  const [exercice, setExercice] =
    useState<number>(anneeCourante);

  const [data, setData] =
    useState<SyntheseData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ==========================================================
  // REMBOURSEMENT
  // ==========================================================

  const [pretRemboursement, setPretRemboursement] =
    useState<Pret | null>(null);

  const [montantRemboursement, setMontantRemboursement] =
    useState("");

  const [commentaireRemboursement, setCommentaireRemboursement] =
    useState("");

  const [remboursementLoading, setRemboursementLoading] =
    useState(false);

  // ==========================================================
  // REAFFECTATION
  // ==========================================================

  const [reaffectation, setReaffectation] =
    useState<ReaffectationState | null>(null);

  const [preview, setPreview] =
    useState<PreviewData | null>(null);

  const [reaffectationLoading, setReaffectationLoading] =
    useState(false);

  const [motifReaffectation, setMotifReaffectation] =
    useState("");

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  const charger = useCallback(
    async (annee: number) => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/prets-aides/synthese?exercice=${annee}`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );

        const json = await readJson(response);

        if (
          !response.ok ||
          !json?.success ||
          !json?.data
        ) {
          throw new Error(
            json?.message ||
              "Impossible de charger le suivi annuel."
          );
        }

        setData(json.data);
      } catch (err: any) {
        setData(null);
        setError(
          err?.message ||
            "Erreur lors du chargement."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void charger(exercice);
  }, [charger, exercice]);

  // ==========================================================
  // REMBOURSEMENT
  // ==========================================================

  function ouvrirRemboursement(pret: Pret) {
    setPretRemboursement(pret);
    setMontantRemboursement("");
    setCommentaireRemboursement("");
    setMessage("");
    setError("");
  }

  async function enregistrerRemboursement(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!pretRemboursement) return;

    const montant =
      Number(montantRemboursement);

    if (
      !Number.isFinite(montant) ||
      montant <= 0
    ) {
      setError(
        "Saisissez un montant de remboursement valide."
      );
      return;
    }

    try {
      setRemboursementLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/prets/remboursements",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },

          body: JSON.stringify({
            pret_id:
              pretRemboursement.id,

            montant,

            commentaire:
              commentaireRemboursement,
          }),
        }
      );

      const json =
        await readJson(response);

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.message ||
            "Impossible d'enregistrer le remboursement."
        );
      }

      const ventilation =
        json?.data?.ventilation;

      const capital =
        Number(
          ventilation
            ?.montant_capital_rembourse ??
            0
        );

      const interets =
        Number(
          ventilation
            ?.montant_interets_paye ??
            0
        );

      setMessage(
        `Remboursement enregistré : ${money(
          montant
        )}. Capital : ${money(
          capital
        )}. Intérêts : ${money(
          interets
        )}.`
      );

      setPretRemboursement(null);
      setMontantRemboursement("");
      setCommentaireRemboursement("");

      await charger(exercice);
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du remboursement."
      );
    } finally {
      setRemboursementLoading(false);
    }
  }

  // ==========================================================
  // REAFFECTATION
  // ==========================================================

  function ouvrirReaffectationPret(
    pret: Pret
  ) {
    setReaffectation({
      type: "PRET",
      id: pret.id,
      libelle:
        `Prêt du ${formatDate(
          pret.date_octroi
        )}`,
      montantGlobal:
        Number(
          pret.montant_accorde ?? 0
        ),
      ventilation:
        (pret.financements ?? []).map(
          (item) => ({
            rubrique_id:
              item.rubrique_id,
            montant:
              String(
                Number(
                  item.montant_finance ??
                    0
                )
              ),
          })
        ),
    });

    setPreview(null);
    setMotifReaffectation("");
    setError("");
    setMessage("");
  }

  function ouvrirReaffectationAide(
    aide: Aide
  ) {
    setReaffectation({
      type: "AIDE",
      id: aide.id,
      libelle:
        aide.commentaire ||
        `Aide du ${formatDate(
          aide.date_aide
        )}`,
      montantGlobal:
        Number(
          aide.montant_accorde ?? 0
        ),
      ventilation:
        (aide.financements ?? []).map(
          (item) => ({
            rubrique_id:
              item.rubrique_id,
            montant:
              String(
                Number(
                  item.montant_finance ??
                    0
                )
              ),
          })
        ),
    });

    setPreview(null);
    setMotifReaffectation("");
    setError("");
    setMessage("");
  }

  function modifierVentilation(
    index: number,
    patch: Partial<VentilationEdit>
  ) {
    setReaffectation(
      (current) => {
        if (!current) {
          return current;
        }

        const ventilation =
          current.ventilation.map(
            (item, i) =>
              i === index
                ? {
                    ...item,
                    ...patch,
                  }
                : item
          );

        return {
          ...current,
          ventilation,
        };
      }
    );

    setPreview(null);
  }

  function ajouterLigne() {
    setReaffectation(
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          ventilation: [
            ...current.ventilation,
            {
              rubrique_id: "",
              montant: "",
            },
          ],
        };
      }
    );

    setPreview(null);
  }

  function supprimerLigne(
    index: number
  ) {
    setReaffectation(
      (current) => {
        if (!current) {
          return current;
        }

        if (
          current.ventilation.length <=
          1
        ) {
          return current;
        }

        return {
          ...current,

          ventilation:
            current.ventilation.filter(
              (_, i) => i !== index
            ),
        };
      }
    );

    setPreview(null);
  }

  const totalVentilation =
    useMemo(() => {
      if (!reaffectation) return 0;

      return reaffectation
        .ventilation
        .reduce(
          (total, item) =>
            total +
            Number(item.montant || 0),
          0
        );
    }, [reaffectation]);

  function payloadVentilation() {
    if (!reaffectation) {
      return [];
    }

    return reaffectation
      .ventilation
      .map((item) => ({
        rubrique_id:
          item.rubrique_id,

        montant:
          Number(item.montant),
      }));
  }

  function verifierVentilation() {
    if (!reaffectation) {
      return "Aucune opération sélectionnée.";
    }

    if (
      reaffectation.ventilation.length ===
      0
    ) {
      return "Ajoutez au moins une rubrique.";
    }

    const rubriques =
      new Set<string>();

    for (
      const item of
      reaffectation.ventilation
    ) {
      if (!item.rubrique_id) {
        return "Sélectionnez une rubrique pour chaque ligne.";
      }

      if (
        rubriques.has(
          item.rubrique_id
        )
      ) {
        return "Une rubrique ne peut apparaître qu'une seule fois.";
      }

      rubriques.add(
        item.rubrique_id
      );

      const montant =
        Number(item.montant);

      if (
        !Number.isFinite(montant) ||
        montant <= 0
      ) {
        return "Chaque attribution doit avoir un montant supérieur à zéro.";
      }
    }

    if (
      Math.abs(
        totalVentilation -
          reaffectation.montantGlobal
      ) > 0.005
    ) {
      return (
        `Le total de la ventilation doit rester ` +
        `${money(
          reaffectation.montantGlobal
        )}.`
      );
    }

    return null;
  }

  async function previsualiser() {
    if (!reaffectation) return;

    const validation =
      verifierVentilation();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setReaffectationLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/prets-aides/reaffectation",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            type_operation:
              reaffectation.type,

            operation_id:
              reaffectation.id,

            ventilation:
              payloadVentilation(),

            preview_only:
              true,
          }),
        }
      );

      const json =
        await readJson(response);

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.message ||
            "Prévisualisation impossible."
        );
      }

      setPreview(
        json.data as PreviewData
      );
    } catch (err: any) {
      setPreview(null);

      setError(
        err?.message ||
          "Erreur de prévisualisation."
      );
    } finally {
      setReaffectationLoading(false);
    }
  }

  async function validerReaffectation(
    confirmerDeficit: boolean
  ) {
    if (!reaffectation) return;

    const validation =
      verifierVentilation();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setReaffectationLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        "/api/prets-aides/reaffectation",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            type_operation:
              reaffectation.type,

            operation_id:
              reaffectation.id,

            ventilation:
              payloadVentilation(),

            confirmer_deficit:
              confirmerDeficit,

            preview_only:
              false,

            motif:
              motifReaffectation ||
              "Rééquilibrage des rubriques depuis Suivi prêts et aides",
          }),
        }
      );

      const json =
        await readJson(response);

      if (
        response.status === 409 &&
        json?.confirmation_deficit_requise
      ) {
        setPreview(
          json?.preview ?? null
        );

        setError(
          "Confirmation obligatoire : la réaffectation laissera au moins une caisse déficitaire."
        );

        return;
      }

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.message ||
            "Réaffectation impossible."
        );
      }

      setMessage(
        "Réaffectation enregistrée. Le montant global de l'opération n'a pas été modifié."
      );

      setReaffectation(null);
      setPreview(null);
      setMotifReaffectation("");

      await charger(exercice);
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors de la réaffectation."
      );
    } finally {
      setReaffectationLoading(false);
    }
  }

  const deficits =
    preview?.deficits ?? [];

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <section className="mb-8 space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Pilotage annuel
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Prêts et aides accordés
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Montants réellement accordés et ventilation par rubrique.
            </p>
          </div>

          <div className="w-full sm:w-48">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Exercice
            </label>

            <select
              value={exercice}
              onChange={(event) => {
                setExercice(
                  Number(
                    event.target.value
                  )
                );

                setReaffectation(null);
                setPretRemboursement(null);
                setPreview(null);
                setMessage("");
                setError("");
              }}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
            >
              {(data?.exercices?.length
                ? data.exercices
                : [exercice]
              ).map((annee) => (
                <option
                  key={annee}
                  value={annee}
                >
                  {annee}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Chargement du suivi annuel...
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Prêts octroyés
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {money(
                  data.synthese
                    .montant_prets
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {
                  data.synthese
                    .nombre_prets
                }{" "}
                prêt(s)
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Aides octroyées
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {money(
                  data.synthese
                    .montant_aides
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {
                  data.synthese
                    .nombre_aides
                }{" "}
                aide(s)
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total financé
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {money(
                  data.synthese
                    .total_finance
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Prêts + aides
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Reste à rembourser
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {money(
                  data.synthese
                    .reste_a_rembourser
                )}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Solde des prêts de l'exercice
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Répartition par rubrique
            </h3>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">
                      Rubrique
                    </th>

                    <th className="px-3 py-3 text-right">
                      Prêts
                    </th>

                    <th className="px-3 py-3 text-right">
                      Aides
                    </th>

                    <th className="px-3 py-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.repartition.map(
                    (item) => (
                      <tr
                        key={`${item.rubrique_id}-${item.caisse_id}`}
                        className="border-b border-slate-100"
                      >
                        <td className="px-3 py-3 text-sm font-semibold text-slate-800">
                          {
                            item.rubrique_nom
                          }
                        </td>

                        <td className="px-3 py-3 text-right text-sm">
                          {money(
                            item.prets
                          )}
                        </td>

                        <td className="px-3 py-3 text-right text-sm">
                          {money(
                            item.aides
                          )}
                        </td>

                        <td className="px-3 py-3 text-right text-sm font-bold">
                          {money(
                            item.total
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {data.repartition.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-sm text-slate-500"
                      >
                        Aucun financement sur cet exercice.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Prêts de {exercice}
            </h3>

            <div className="mt-4 space-y-4">
              {data.prets.map(
                (pret) => (
                  <article
                    key={pret.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">
                          {nomMembre(
                            pret.membres,
                            pret.membre_id
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(
                            pret.date_octroi
                          )}{" "}
                          ·{" "}
                          {pret.statut_pret ||
                            "-"}
                        </p>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-lg font-black text-slate-900">
                          {money(
                            pret.montant_accorde
                          )}
                        </p>

                        <p className="text-sm text-slate-500">
                          Reste :{" "}
                          {money(
                            pret.solde_restant
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {pret.financements.map(
                        (financement) => (
                          <span
                            key={
                              financement.id ??
                              `${financement.rubrique_id}-${financement.montant_finance}`
                            }
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {financement.rubrique_nom} :{" "}
                            {money(
                              financement.montant_finance
                            )}
                          </span>
                        )
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/prets/amortissement/${pret.id}`}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Détails / échéancier
                      </Link>

                      {pret.peut_rembourser ? (
                        <button
                          type="button"
                          onClick={() =>
                            ouvrirRemboursement(
                              pret
                            )
                          }
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          Rembourser
                        </button>
                      ) : null}

                      {pret.peut_reaffecter ? (
                        <button
                          type="button"
                          onClick={() =>
                            ouvrirReaffectationPret(
                              pret
                            )
                          }
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                        >
                          Réaffecter le financement
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              )}

              {data.prets.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  Aucun prêt réel octroyé en {exercice}.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">
              Aides de {exercice}
            </h3>

            <div className="mt-4 space-y-4">
              {data.aides.map(
                (aide) => (
                  <article
                    key={aide.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-bold text-slate-900">
                          {aide.commentaire ||
                            "Aide"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(
                            aide.date_aide
                          )}{" "}
                          ·{" "}
                          {nomMembre(
                            aide.membres,
                            aide.membre_id
                          )}
                        </p>
                      </div>

                      <p className="text-lg font-black text-slate-900">
                        {money(
                          aide.montant_accorde
                        )}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {aide.financements.map(
                        (financement) => (
                          <span
                            key={
                              financement.id ??
                              `${financement.rubrique_id}-${financement.montant_finance}`
                            }
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {financement.rubrique_nom} :{" "}
                            {money(
                              financement.montant_finance
                            )}
                          </span>
                        )
                      )}
                    </div>

                    {aide.peut_reaffecter ? (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() =>
                            ouvrirReaffectationAide(
                              aide
                            )
                          }
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                        >
                          Réaffecter le financement
                        </button>
                      </div>
                    ) : null}
                  </article>
                )
              )}

              {data.aides.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  Aucune aide réelle octroyée en {exercice}.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {pretRemboursement ? (
        <div className="rounded-[28px] border-2 border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Enregistrer un remboursement
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Solde affiché :{" "}
                {money(
                  pretRemboursement.solde_restant
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setPretRemboursement(
                  null
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
            >
              Fermer
            </button>
          </div>

          <form
            onSubmit={
              enregistrerRemboursement
            }
            className="mt-5 grid gap-4 lg:grid-cols-2"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Montant encaissé
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={
                  montantRemboursement
                }
                onChange={(event) =>
                  setMontantRemboursement(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Commentaire
              </label>

              <input
                type="text"
                value={
                  commentaireRemboursement
                }
                onChange={(event) =>
                  setCommentaireRemboursement(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
              />
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={
                  remboursementLoading
                }
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {remboursementLoading
                  ? "Enregistrement..."
                  : "Enregistrer le remboursement"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {reaffectation &&
      data?.is_bureau ? (
        <div className="rounded-[28px] border-2 border-slate-300 bg-white p-5 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Réaffecter le financement
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {reaffectation.libelle}
              </p>

              <p className="mt-1 font-bold text-slate-900">
                Montant global intangible :{" "}
                {money(
                  reaffectation.montantGlobal
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setReaffectation(null);
                setPreview(null);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
              Fermer
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {reaffectation.ventilation.map(
              (ligne, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_220px_auto]"
                >
                  <select
                    value={
                      ligne.rubrique_id
                    }
                    onChange={(event) =>
                      modifierVentilation(
                        index,
                        {
                          rubrique_id:
                            event.target
                              .value,
                        }
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
                  >
                    <option value="">
                      Choisir une rubrique
                    </option>

                    {data.rubriques_financement.map(
                      (rubrique) => (
                        <option
                          key={
                            rubrique.rubrique_id
                          }
                          value={
                            rubrique.rubrique_id
                          }
                        >
                          {
                            rubrique.rubrique_nom
                          }{" "}
                          — solde actuel{" "}
                          {money(
                            rubrique.solde_actuel
                          )}
                        </option>
                      )
                    )}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      ligne.montant
                    }
                    onChange={(event) =>
                      modifierVentilation(
                        index,
                        {
                          montant:
                            event.target
                              .value,
                        }
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-3 py-3"
                    placeholder="Montant"
                  />

                  <button
                    type="button"
                    disabled={
                      reaffectation
                        .ventilation
                        .length <= 1
                    }
                    onClick={() =>
                      supprimerLigne(
                        index
                      )
                    }
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-40"
                  >
                    Supprimer
                  </button>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={ajouterLigne}
            className="mt-3 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            + Ajouter une rubrique
          </button>

          <div className="mt-4 rounded-2xl bg-slate-100 p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <span className="font-semibold text-slate-700">
                Total nouvelle ventilation
              </span>

              <span
                className={
                  Math.abs(
                    totalVentilation -
                      reaffectation.montantGlobal
                  ) <= 0.005
                    ? "font-black text-emerald-700"
                    : "font-black text-red-700"
                }
              >
                {money(
                  totalVentilation
                )}{" "}
                /{" "}
                {money(
                  reaffectation.montantGlobal
                )}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Motif de la réaffectation
            </label>

            <input
              type="text"
              value={
                motifReaffectation
              }
              onChange={(event) =>
                setMotifReaffectation(
                  event.target.value
                )
              }
              placeholder="Ex. Rééquilibrage des caisses"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                reaffectationLoading
              }
              onClick={() =>
                void previsualiser()
              }
              className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Vérifier les soldes
            </button>

            {preview &&
            deficits.length === 0 ? (
              <button
                type="button"
                disabled={
                  reaffectationLoading
                }
                onClick={() =>
                  void validerReaffectation(
                    false
                  )
                }
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Valider la réaffectation
              </button>
            ) : null}
          </div>

          {preview ? (
            <div className="mt-5">
              <h4 className="font-bold text-slate-900">
                Impact sur les caisses
              </h4>

              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="px-3 py-3">
                        Caisse
                      </th>

                      <th className="px-3 py-3 text-right">
                        Solde actuel
                      </th>

                      <th className="px-3 py-3 text-right">
                        Ancienne
                      </th>

                      <th className="px-3 py-3 text-right">
                        Nouvelle
                      </th>

                      <th className="px-3 py-3 text-right">
                        Solde après
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(preview.caisses ?? []).map(
                      (caisse) => (
                        <tr
                          key={
                            caisse.caisse_id
                          }
                          className="border-b border-slate-100"
                        >
                          <td className="px-3 py-3 text-sm font-semibold">
                            {caisse.caisse}
                          </td>

                          <td className="px-3 py-3 text-right text-sm">
                            {money(
                              caisse.solde_actuel
                            )}
                          </td>

                          <td className="px-3 py-3 text-right text-sm">
                            {money(
                              caisse.ancienne_attribution
                            )}
                          </td>

                          <td className="px-3 py-3 text-right text-sm">
                            {money(
                              caisse.nouvelle_attribution
                            )}
                          </td>

                          <td
                            className={`px-3 py-3 text-right text-sm font-bold ${
                              Number(
                                caisse.solde_apres ??
                                  0
                              ) < 0
                                ? "text-red-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {money(
                              caisse.solde_apres
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {deficits.length > 0 ? (
                <div className="mt-5 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
                  <p className="font-black text-red-800">
                    Attention : caisse déficitaire
                  </p>

                  {deficits.map(
                    (deficit) => (
                      <p
                        key={
                          deficit.caisse_id
                        }
                        className="mt-2 text-sm font-semibold text-red-700"
                      >
                        {deficit.caisse} : déficit après réaffectation de{" "}
                        {money(
                          deficit.deficit
                        )}
                      </p>
                    )
                  )}

                  <p className="mt-3 text-sm text-red-800">
                    La réaffectation reste possible, mais vous devez confirmer que vous acceptez ce déficit.
                  </p>

                  <button
                    type="button"
                    disabled={
                      reaffectationLoading
                    }
                    onClick={() =>
                      void validerReaffectation(
                        true
                      )
                    }
                    className="mt-4 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    Confirmer malgré le déficit
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                  Aucune caisse ne sera déficitaire après cette réaffectation.
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
