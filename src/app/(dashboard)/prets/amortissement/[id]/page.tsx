"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type Financement = {
  financement_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  caisse_id: string;
  montant_finance: number;
};

type Remboursement = {
  id: string;
  date_remboursement: string;
  montant_rembourse: number;
  mode_paiement?: string | null;
  reference_paiement?: string | null;
};

type LigneAmortissement = {
  annee: number;
  mois: number;
  mois_libelle: string;
  solde_debut: number;
  interet: number;
  remboursement: number;
  solde_fin: number;
};

type AmortissementData = {
  demande_id: string;
  pret_id: string;
  is_bureau: boolean;

  reference: string;

  membre: {
    id: string;
    nom_complet: string;
    numero_membre: string;
  };

  date_approbation: string;

  montant_demande: number;
  montant_accorde: number;

  taux_mensuel: number;

  solde_restant: number;
  statut_pret: string;

  date_prochain_recalcul_interet:
    string | null;

  situation_arretee_au: string;

  financements: Financement[];
  remboursements: Remboursement[];
  lignes: LigneAmortissement[];
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: AmortissementData;
};

function formatMoney(
  value: number | null | undefined
) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(
      Math.round(Number(value || 0))
    ) + " FCFA"
  );
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
    }
  ).format(date);
}

async function readJsonSafe(
  response: Response
) {
  const rawText =
    await response.text();

  try {
    return rawText
      ? JSON.parse(rawText)
      : null;
  } catch {
    throw new Error(
      "La route appelée ne renvoie pas du JSON."
    );
  }
}

export default function AmortissementPretPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [
    demandeId,
    setDemandeId,
  ] = useState("");

  const [
    data,
    setData,
  ] =
    useState<AmortissementData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    remboursementMontant,
    setRemboursementMontant,
  ] = useState("");

  const [
    remboursementCommentaire,
    setRemboursementCommentaire,
  ] = useState("");

  const [
    remboursementLoading,
    setRemboursementLoading,
  ] = useState(false);

  const [
    remboursementMessage,
    setRemboursementMessage,
  ] = useState("");

  async function loadData(
    id: string,
    showLoader = true
  ) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response =
        await fetch(
          `/api/prets/amortissement/${id}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const json =
        (await readJsonSafe(
          response
        )) as ApiResponse | null;

      if (
        !response.ok ||
        !json?.success ||
        !json.data
      ) {
        throw new Error(
          json?.message ||
            "Impossible de charger le tableau d’amortissement."
        );
      }

      setData(json.data);
    } catch (err: any) {
      setData(null);

      setError(
        err?.message ||
          "Erreur lors du chargement du tableau."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const resolvedParams =
          await params;

        const id = String(
          resolvedParams?.id ?? ""
        ).trim();

        if (!id) {
          throw new Error(
            "Identifiant de demande manquant."
          );
        }

        if (cancelled) {
          return;
        }

        setDemandeId(id);

        await loadData(id);
      } catch (err: any) {
        if (!cancelled) {
          setLoading(false);

          setError(
            err?.message ||
              "Erreur lors du chargement."
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [params]);

  const totalFinancement =
    useMemo(() => {
      return (
        data?.financements ?? []
      ).reduce(
        (total, item) =>
          total +
          Number(
            item.montant_finance ||
              0
          ),
        0
      );
    }, [data]);

  async function enregistrerRemboursement(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!data?.pret_id) {
      return;
    }

    const montant =
      Number(
        remboursementMontant
          .replace(/\s/g, "")
          .replace(",", ".")
      );

    if (
      !Number.isFinite(montant) ||
      montant <= 0
    ) {
      setRemboursementMessage(
        "Saisissez un montant valide."
      );
      return;
    }

    if (
      montant >
      Number(
        data.solde_restant || 0
      )
    ) {
      setRemboursementMessage(
        "Le montant dépasse le solde restant."
      );
      return;
    }

    try {
      setRemboursementLoading(true);
      setRemboursementMessage("");

      const response =
        await fetch(
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
                data.pret_id,

              montant,

              commentaire:
                remboursementCommentaire,
            }),
          }
        );

      const json =
        await readJsonSafe(response);

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.message ||
            "Impossible d’enregistrer le remboursement."
        );
      }

      setRemboursementMontant("");
      setRemboursementCommentaire("");

      setRemboursementMessage(
        "Remboursement enregistré avec succès."
      );

      await loadData(
        demandeId,
        false
      );
    } catch (err: any) {
      setRemboursementMessage(
        err?.message ||
          "Erreur lors de l’enregistrement du remboursement."
      );
    } finally {
      setRemboursementLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Prêt
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Tableau d&apos;amortissement
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Situation réelle du prêt et des remboursements enregistrés.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
                        {data?.demande_id ? (
              <Link
                href={`/prets/demande/${data.demande_id}`}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Ouvrir la demande signée
              </Link>
            ) : null}


            <Link
              href="/prets-aides"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Retour au suivi financier
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 shadow-sm">
          Chargement du tableau d&apos;amortissement...
        </div>
      ) : !data ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          Tableau indisponible.
        </div>
      ) : (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Situation du prêt
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Membre
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {data.membre.nom_complet}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Date d&apos;octroi
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatDate(
                    data.date_approbation
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  Montant accordé
                </p>

                <p className="mt-1 text-lg font-bold text-emerald-700">
                  {formatMoney(
                    data.montant_accorde
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-blue-700">
                  Solde restant
                </p>

                <p className="mt-1 text-lg font-bold text-blue-800">
                  {formatMoney(
                    data.solde_restant
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Taux
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {data.taux_mensuel} % par mois
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Statut
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {data.statut_pret}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-amber-700">
                  Prochaine échéance d&apos;intérêt
                </p>

                <p className="mt-1 text-sm font-bold text-amber-800">
                  {formatDate(
                    data.date_prochain_recalcul_interet
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Situation arrêtée au
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatDate(
                    data.situation_arretee_au
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Répartition du financement
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Rubrique
                    </th>

                    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      Montant financé
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.financements.map(
                    (item) => (
                      <tr
                        key={
                          item.financement_id
                        }
                      >
                        <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                          {
                            item.rubrique_nom
                          }
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          {formatMoney(
                            item.montant_finance
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  <tr>
                    <td className="bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                      Total
                    </td>

                    <td className="bg-emerald-50 px-4 py-3 text-right text-sm font-bold text-emerald-800">
                      {formatMoney(
                        totalFinancement
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Amortissement mensuel
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Seuls les intérêts réellement arrivés à échéance et les remboursements réellement enregistrés sont affichés.
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Mois
                    </th>

                    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      Solde début
                    </th>

                    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      + Intérêt
                    </th>

                    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      - Remboursement
                    </th>

                    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      Solde fin
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.lignes.map(
                    (ligne) => (
                      <tr
                        key={`${ligne.annee}-${ligne.mois}`}
                      >
                        <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                          {
                            ligne.mois_libelle
                          }
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 text-right text-sm text-slate-700">
                          {formatMoney(
                            ligne.solde_debut
                          )}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-amber-700">
                          +{" "}
                          {formatMoney(
                            ligne.interet
                          )}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-emerald-700">
                          -{" "}
                          {formatMoney(
                            ligne.remboursement
                          )}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-bold text-slate-900">
                          {formatMoney(
                            ligne.solde_fin
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Remboursements enregistrés
            </h2>

            {data.remboursements.length ===
            0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Aucun remboursement enregistré.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Date
                      </th>

                      <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Montant
                      </th>

                      <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Mode
                      </th>

                      <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Référence
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.remboursements.map(
                      (item) => (
                        <tr key={item.id}>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm">
                            {formatDate(
                              item.date_remboursement
                            )}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-bold text-emerald-700">
                            {formatMoney(
                              item.montant_rembourse
                            )}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-3 text-sm">
                            {item.mode_paiement ||
                              "-"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                            {item.reference_paiement ||
                              "-"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Enregistrer un remboursement
            </h2>

            {data.is_bureau ? (
              data.statut_pret ===
              "SOLDE" ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  Ce prêt est entièrement remboursé.
                </div>
              ) : (
                <form
                  onSubmit={
                    enregistrerRemboursement
                  }
                  className="mt-4 space-y-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Montant encaissé
                    </label>

                    <input
                      type="number"
                      min="1"
                      max={
                        data.solde_restant
                      }
                      step="1"
                      value={
                        remboursementMontant
                      }
                      onChange={(event) =>
                        setRemboursementMontant(
                          event.target.value
                        )
                      }
                      placeholder="Ex. 1000"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Commentaire
                      <span className="ml-1 font-normal text-slate-400">
                        (facultatif)
                      </span>
                    </label>

                    <textarea
                      value={
                        remboursementCommentaire
                      }
                      onChange={(event) =>
                        setRemboursementCommentaire(
                          event.target.value
                        )
                      }
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>

                  {remboursementMessage ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                      {
                        remboursementMessage
                      }
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={
                      remboursementLoading
                    }
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {remboursementLoading
                      ? "Enregistrement..."
                      : "Enregistrer le remboursement"}
                  </button>
                </form>
              )
            ) : (
              <div className="mt-4">
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500"
                >
                  Enregistrer un remboursement
                </button>

                <p className="mt-2 text-sm text-slate-500">
                  Enregistrement réservé au Président, au Trésorier et à l&apos;Administrateur.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}