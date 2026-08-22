"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Props = {
  anneeSelectionnee: string;
  membreSelectionne: string;
};

type Distribution = {
  id: string;
  membre_id: string;
  montant_interet_distribue: number;
  rubrique_id: string;
  caisse_source_id: string;
  annee_generation: number;
  annee_affectation_prevue: number;
  statut_affectation: string;
  date_distribution: string;
  date_affectation: string | null;

  membre: {
    id: string;
    numero_membre: string | null;
    nom_complet: string;
  } | null;

  rubrique: {
    id: string;
    code: string | null;
    nom: string;
  } | null;
};

type Execution = {
  id: string;
  distribution_id: string;
  montant: number;
  date_credit: string;
  date_execution: string;
  role_snapshot: string | null;

  beneficiaire: {
    id: string;
    numero_membre: string | null;
    nom_complet: string;
  } | null;

  executant: {
    id: string;
    numero_membre: string | null;
    nom_complet: string;
  } | null;

  rubrique: {
    id: string;
    code: string | null;
    nom: string;
  } | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;

  data?: {
    distributions: Distribution[];
    journal: Execution[];
    annees: number[];
  };
};

function money(value: unknown) {
  const number =
    Number(value ?? 0);

  return `${new Intl.NumberFormat(
    "fr-FR"
  ).format(
    Number.isFinite(number)
      ? number
      : 0
  )} FCFA`;
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  } catch {
    return value;
  }
}

export default function BureauInteretsPrets({
  anneeSelectionnee,
  membreSelectionne,
}: Props) {
  const [
    distributions,
    setDistributions,
  ] = useState<Distribution[]>([]);

  const [
    journal,
    setJournal,
  ] = useState<Execution[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    creditingId,
    setCreditingId,
  ] =
    useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/bureau/interets",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const json =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !json.success ||
        !json.data
      ) {
        throw new Error(
          json.message ||
            "Impossible de charger les intérêts."
        );
      }

      setDistributions(
        json.data.distributions ?? []
      );

      setJournal(
        json.data.journal ?? []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du chargement des intérêts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const distributionsFiltrees =
    useMemo(
      () =>
        distributions.filter(
          (row) => {
            if (
              anneeSelectionnee !==
                "TOUS" &&
              String(
                row.annee_affectation_prevue
              ) !==
                anneeSelectionnee
            ) {
              return false;
            }

            if (
              membreSelectionne !==
                "TOUS" &&
              row.membre_id !==
                membreSelectionne
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        distributions,
        anneeSelectionnee,
        membreSelectionne,
      ]
    );

  const journalFiltre =
    useMemo(
      () =>
        journal.filter(
          (row) => {
            if (
              membreSelectionne !==
                "TOUS" &&
              row.beneficiaire?.id !==
                membreSelectionne
            ) {
              return false;
            }

            if (
              anneeSelectionnee !==
                "TOUS" &&
              String(
                new Date(
                  row.date_credit
                ).getFullYear()
              ) !==
                anneeSelectionnee
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        journal,
        anneeSelectionnee,
        membreSelectionne,
      ]
    );

  const aCrediter =
    distributionsFiltrees.filter(
      (row) =>
        row.statut_affectation ===
        "A_CREDITER_N_PLUS_1"
    );

  const credites =
    distributionsFiltrees.filter(
      (row) =>
        row.statut_affectation ===
        "CREDITE"
    );

  const totalACrediter =
    aCrediter.reduce(
      (total, row) =>
        total +
        Number(
          row.montant_interet_distribue ??
            0
        ),
      0
    );

  const totalCredite =
    credites.reduce(
      (total, row) =>
        total +
        Number(
          row.montant_interet_distribue ??
            0
        ),
      0
    );

  async function crediter(
    row: Distribution
  ) {
    const confirme =
      window.confirm(
        `Créditer ${money(
          row.montant_interet_distribue
        )} d'intérêts à ${
          row.membre?.nom_complet ??
          "ce membre"
        } dans ${
          row.rubrique?.nom ??
          "la rubrique prévue"
        } ?`
      );

    if (!confirme) {
      return;
    }

    try {
      setCreditingId(row.id);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          "/api/bureau/interets",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              distribution_id:
                row.id,
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
            "Impossible de créditer cet intérêt."
        );
      }

      setSuccess(
        "Intérêt crédité avec succès."
      );

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du crédit de l'intérêt."
      );
    } finally {
      setCreditingId(null);
    }
  }

  const currentYear =
    new Date().getFullYear();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
          Surveillance
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-900">
          Intérêts de prêts
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Contrôle et crédit N+1 des intérêts
          redistribués aux membres.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
            À créditer N+1
          </p>

          <p className="mt-2 text-3xl font-black text-amber-950">
            {aCrediter.length}
          </p>

          <p className="mt-1 text-sm font-semibold text-amber-800">
            {money(totalACrediter)}
          </p>
        </article>

        <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
            Crédités
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-950">
            {credites.length}
          </p>

          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {money(totalCredite)}
          </p>
        </article>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-black text-slate-900">
          Distributions d'intérêts
        </h3>

        {loading ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Chargement...
          </p>
        ) : distributionsFiltrees.length ===
          0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Aucun intérêt distribué pour les
            filtres sélectionnés.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">
                    Membre
                  </th>

                  <th className="p-3">
                    Rubrique
                  </th>

                  <th className="p-3 text-right">
                    Montant
                  </th>

                  <th className="p-3">
                    Généré en
                  </th>

                  <th className="p-3">
                    À créditer en
                  </th>

                  <th className="p-3">
                    Statut
                  </th>

                  <th className="p-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {distributionsFiltrees.map(
                  (row) => {
                    const pending =
                      row.statut_affectation ===
                      "A_CREDITER_N_PLUS_1";

                    const year =
                      Number(
                        row.annee_affectation_prevue
                      );

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100"
                      >
                        <td className="p-3 font-bold">
                          {row.membre
                            ?.nom_complet ??
                            "—"}
                        </td>

                        <td className="p-3">
                          {row.rubrique
                            ?.nom ??
                            "—"}
                        </td>

                        <td className="p-3 text-right font-black">
                          {money(
                            row.montant_interet_distribue
                          )}
                        </td>

                        <td className="p-3">
                          {row.annee_generation}
                        </td>

                        <td className="p-3">
                          {row.annee_affectation_prevue}
                        </td>

                        <td className="p-3">
                          {row.statut_affectation ===
                          "CREDITE"
                            ? "Crédité"
                            : "À créditer N+1"}
                        </td>

                        <td className="p-3">
                          {!pending ? (
                            <span className="font-semibold text-emerald-700">
                              Terminé
                            </span>
                          ) : year ===
                            currentYear ? (
                            <button
                              type="button"
                              disabled={
                                creditingId ===
                                row.id
                              }
                              onClick={() =>
                                crediter(
                                  row
                                )
                              }
                              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                            >
                              {creditingId ===
                              row.id
                                ? "Crédit..."
                                : "Créditer"}
                            </button>
                          ) : year >
                            currentYear ? (
                            <span className="font-semibold text-slate-500">
                              Disponible en{" "}
                              {year}
                            </span>
                          ) : (
                            <span className="font-semibold text-red-700">
                              À régulariser
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-black text-slate-900">
          Journal des crédits d'intérêts
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          Traçabilité des crédits réellement
          exécutés par le Bureau.
        </p>

        {journalFiltre.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            Aucun crédit d'intérêt exécuté pour
            les filtres sélectionnés.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">
                    Date
                  </th>

                  <th className="p-3">
                    Bénéficiaire
                  </th>

                  <th className="p-3">
                    Exécuté par
                  </th>

                  <th className="p-3">
                    Rubrique
                  </th>

                  <th className="p-3 text-right">
                    Montant
                  </th>
                </tr>
              </thead>

              <tbody>
                {journalFiltre.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100"
                    >
                      <td className="p-3">
                        {formatDate(
                          row.date_execution
                        )}
                      </td>

                      <td className="p-3 font-bold">
                        {row.beneficiaire
                          ?.nom_complet ??
                          "—"}
                      </td>

                      <td className="p-3">
                        {row.executant
                          ?.nom_complet ??
                          "—"}
                      </td>

                      <td className="p-3">
                        {row.rubrique
                          ?.nom ??
                          "—"}
                      </td>

                      <td className="p-3 text-right font-black">
                        {money(
                          row.montant
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}