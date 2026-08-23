"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PageHeader from "@/components/ui/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import BureauInteretsPrets from "@/components/bureau/BureauInteretsPrets";

type Redistribution = {
  id: string;
  membre_id: string;
  montant_redistribue: number;
  statut_redistribution: string;
  annee_generation: number | null;
  annee_affectation_prevue: number | null;
  date_redistribution: string | null;
  situation: string;

  membre: {
    id: string;
    numero_membre: string | null;
    nom_complet: string;
  } | null;

  destination: {
    id: string;
    code: string;
    nom: string;
  } | null;
};

type Execution = {
  id: string;
  redistribution_id: string;
  mode_execution: string;
  action: string;
  montant: number;
  date_entree: string;
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

  destination: {
    id: string;
    code: string;
    nom: string;
  } | null;
};

type BureauResponse = {
  success: boolean;
  message?: string;

  data?: {
    synthese: {
      calculees: {
        nombre: number;
        montant: number;
      };

      validees: {
        nombre: number;
        montant: number;
      };

      versees: {
        nombre: number;
        montant: number;
      };
    };

    redistributions:
      Redistribution[];

    journal:
      Execution[];

    membres: Array<{
      id: string;
      numero_membre: string | null;
      nom_complet: string;
    }>;

    annees: number[];
  };
};

function money(value: unknown) {
  const number =
    Number(value ?? 0);

  return (
    new Intl.NumberFormat(
      "fr-FR"
    ).format(
      Number.isFinite(number)
        ? number
        : 0
    ) + " FCFA"
  );
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

export default function BureauPage() {
  const [data, setData] =
    useState<
      BureauResponse["data"] | null
    >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    anneeSelectionnee,
    setAnneeSelectionnee,
  ] = useState("TOUS");

  const [
    statutSelectionne,
    setStatutSelectionne,
  ] = useState("TOUS");

  const [
    membreSelectionne,
    setMembreSelectionne,
  ] = useState("TOUS");

  const [
    executingId,
    setExecutingId,
  ] = useState<string | null>(
    null
  );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/bureau/redistributions",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const json =
        (await response.json()) as BureauResponse;

      if (
        !response.ok ||
        !json.success ||
        !json.data
      ) {
        throw new Error(
          json.message ||
            "Impossible de charger le Dashboard Bureau."
        );
      }

      setData(json.data);
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du chargement du Dashboard Bureau."
      );
    } finally {
      setLoading(false);
    }
  }

  async function executerRedistribution(
    row: Redistribution
  ) {
    const confirme =
      window.confirm(
        `Exécuter la redistribution de ${money(
          row.montant_redistribue
        )} pour ${
          row.membre
            ?.nom_complet ??
          "ce membre"
        } vers ${
          row.destination
            ?.nom ??
          "la rubrique sélectionnée"
        } ?`
      );

    if (!confirme) return;

    try {
      setExecutingId(row.id);
      setError("");

      const response =
        await fetch(
          "/api/bureau/redistributions",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              redistribution_id:
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
            "Impossible d'exécuter cette redistribution."
        );
      }

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors de l'exécution."
      );
    } finally {
      setExecutingId(null);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const redistributionsFiltrees =
    useMemo(() => {
      const rows =
        data?.redistributions ?? [];

      return rows.filter(
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
            statutSelectionne !==
              "TOUS" &&
            row.statut_redistribution !==
              statutSelectionne
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
      );
    }, [
      data,
      anneeSelectionnee,
      statutSelectionne,
      membreSelectionne,
    ]);

  const avoirsATraiter =
    useMemo(
      () =>
        redistributionsFiltrees.filter(
          (row) =>
            row.statut_redistribution ===
              "CALCULEE" ||
            row.statut_redistribution ===
              "VALIDEE"
        ),
      [redistributionsFiltrees]
    );


  if (loading && !data) {
    return (
      <LoadingState
        message="Chargement du Dashboard Bureau..."
        size="md"
        variant="default"
      />
    );
  }

  const synthese =
    data?.synthese;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Bureau"
        subtitle="Page de surveillance et de contrôle des opérations ASF-NTOL réservée aux membres du Bureau."
        size="lg"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
            Destination à choisir
          </p>

          <p className="mt-2 text-3xl font-black text-amber-950">
            {synthese?.calculees
              .nombre ?? 0}
          </p>

          <p className="mt-1 text-sm font-semibold text-amber-800">
            {money(
              synthese?.calculees
                .montant
            )}
          </p>
        </article>

        <article className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-sky-700">
            Versement à effectuer
          </p>

          <p className="mt-2 text-3xl font-black text-sky-950">
            {synthese?.validees
              .nombre ?? 0}
          </p>

          <p className="mt-1 text-sm font-semibold text-sky-800">
            {money(
              synthese?.validees
                .montant
            )}
          </p>
        </article>

        <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
            Redistributions versées
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-950">
            {synthese?.versees
              .nombre ?? 0}
          </p>

          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {money(
              synthese?.versees
                .montant
            )}
          </p>
        </article>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            Filtres
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-900">
            Consultation des redistributions
          </h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Année d'affectation
            </span>

            <select
              value={
                anneeSelectionnee
              }
              onChange={(event) =>
                setAnneeSelectionnee(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="TOUS">
                Toutes
              </option>

              {(data?.annees ?? []).map(
                (annee) => (
                  <option
                    key={annee}
                    value={annee}
                  >
                    {annee}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Statut
            </span>

            <select
              value={
                statutSelectionne
              }
              onChange={(event) =>
                setStatutSelectionne(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="TOUS">
                Tous
              </option>

              <option value="CALCULEE">
                Destination à choisir
              </option>

              <option value="VALIDEE">
                Versement à effectuer
              </option>

              <option value="VERSEE">
                Versée
              </option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Membre
            </span>

            <select
              value={
                membreSelectionne
              }
              onChange={(event) =>
                setMembreSelectionne(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="TOUS">
                Tous les membres
              </option>

              {(data?.membres ?? [])
                .sort((a, b) =>
                  a.nom_complet.localeCompare(
                    b.nom_complet
                  )
                )
                .map((membre) => (
                  <option
                    key={membre.id}
                    value={membre.id}
                  >
                    {membre.nom_complet}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
              Surveillance
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-900">
              Avoirs à traiter
            </h2>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            {avoirsATraiter.length} en attente
          </span>
        </div>

        {avoirsATraiter.length ===
        0 ? (
          <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Aucun avoir en attente pour les filtres sélectionnés.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {avoirsATraiter.map(
              (row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(4,minmax(120px,1fr))_180px] lg:items-center">
                    <div>
                      <p className="font-black text-slate-950">
                        {row.membre
                          ?.nom_complet ??
                          "Membre inconnu"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {row.membre
                          ?.numero_membre ??
                          "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Montant
                      </p>

                      <p className="mt-1 font-black">
                        {money(
                          row.montant_redistribue
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Généré
                      </p>

                      <p className="mt-1 font-black">
                        {row.annee_generation ??
                          "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Affectation
                      </p>

                      <p className="mt-1 font-black">
                        {row.annee_affectation_prevue ??
                          "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Destination
                      </p>

                      <p className="mt-1 font-black">
                        {row.destination
                          ?.nom ??
                          "À choisir"}
                      </p>
                    </div>

                    <div>
                      {row.statut_redistribution ===
                      "CALCULEE" ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
                          Choix du membre attendu
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={
                            executingId ===
                            row.id
                          }
                          onClick={() =>
                            executerRedistribution(
                              row
                            )
                          }
                          className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                        >
                          {executingId ===
                          row.id
                            ? "Exécution..."
                            : "Exécuter"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <BureauInteretsPrets
        anneeSelectionnee={anneeSelectionnee}
        membreSelectionne={membreSelectionne}
      />
    </div>
  );
}
