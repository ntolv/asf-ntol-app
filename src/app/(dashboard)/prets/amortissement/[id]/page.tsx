"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Financement = {
  financement_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  caisse_id: string;
  montant_finance: number;
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
  pret_id: string | null;
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
  situation_arretee_au: string;
  financements: Financement[];
  lignes: LigneAmortissement[];
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data?: AmortissementData;
};

function formatMoney(value: number | null | undefined) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
    }).format(Math.round(Number(value || 0))) + " FCFA"
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

async function readJsonSafe(response: Response) {
  const rawText = await response.text();

  try {
    return rawText ? JSON.parse(rawText) : null;
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
  const [demandeId, setDemandeId] = useState("");
  const [data, setData] =
    useState<AmortissementData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const resolvedParams = await params;
        const id = String(resolvedParams?.id ?? "").trim();

        if (!id) {
          throw new Error(
            "Identifiant de demande manquant."
          );
        }

        if (!cancelled) {
          setDemandeId(id);
        }

        const response = await fetch(
          `/api/prets/amortissement/${id}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const json = (await readJsonSafe(
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

        if (!cancelled) {
          setData(json.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setData(null);
          setError(
            err?.message ||
              "Erreur lors du chargement du tableau."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [params]);

  const totalFinancement = useMemo(() => {
    return (data?.financements ?? []).reduce(
      (total, item) =>
        total + Number(item.montant_finance || 0),
      0
    );
  }, [data]);

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
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {demandeId ? (
              <Link
                href={`/prets/demande/${demandeId}`}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Ouvrir la demande signée
              </Link>
            ) : null}

            <Link
              href="/prets-aides"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Retour à Prêts / Aides
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
          Calcul du tableau d&apos;amortissement...
        </div>
      ) : !data ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          Tableau indisponible.
        </div>
      ) : (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">
              Tableau d&apos;amortissement
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Référence
                </p>
                <p className="mt-1 break-all text-sm font-bold text-slate-900">
                  {data.reference}
                </p>
              </div>

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
                  Date d&apos;approbation
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatDate(data.date_approbation)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Montant demandé
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatMoney(data.montant_demande)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  Montant accordé
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-700">
                  {formatMoney(data.montant_accorde)}
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

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2 xl:col-span-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Situation arrêtée au
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatDate(data.situation_arretee_au)}
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
                  {data.financements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-6 text-center text-sm text-slate-500"
                      >
                        Aucune répartition enregistrée.
                      </td>
                    </tr>
                  ) : (
                    data.financements.map((item) => (
                      <tr key={item.financement_id}>
                        <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                          {item.rubrique_nom}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          {formatMoney(item.montant_finance)}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr>
                    <td className="bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                      Total
                    </td>

                    <td className="bg-emerald-50 px-4 py-3 text-right text-sm font-bold text-emerald-800">
                      {formatMoney(totalFinancement)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Amortissement mensuel
            </h2>

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
                  {data.lignes.map((ligne) => (
                    <tr
                      key={`${ligne.annee}-${ligne.mois}`}
                    >
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                        {ligne.mois_libelle}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm text-slate-700">
                        {formatMoney(ligne.solde_debut)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-amber-700">
                        + {formatMoney(ligne.interet)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-semibold text-emerald-700">
                        - {formatMoney(ligne.remboursement)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-bold text-slate-900">
                        {formatMoney(ligne.solde_fin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
