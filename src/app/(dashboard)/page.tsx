"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";

type ContributionRow = {
  annee: number;
  membre_id: string;
  nom_complet: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_attendu_annuel: number | null;
  report_precedent: number;
  encaissements_annee: number;
  interets_prets_credites_annee: number;
  total_actif: number;
  reste_a_verser: number | null;
  excedent_verse: number | null;
  statut_contribution: string | null;
  obligation_parametree: boolean;
};

type PretRow = {
  annee: number;
  annee_precedente: number;
  membre_id: string;
  nom_complet: string;
  report_prets_a_rembourser: number;
  prets_octroyes_annee: number;
  remboursements_annee: number;
  prets_a_rembourser_fin_exercice: number;
};

type TontineBilanRow = {
  annee: number;
  membre_id: string;
  nom_complet: string;
  cotisations: number;
  gain: number;
  statut: string;
};

type RedistributionDestination = {
  id: string;
  code: string;
  nom: string;
};

type RedistributionRow = {
  id: string;
  cycle_id: string;
  membre_id: string;
  montant_redistribue: number;
  base_calcul_total_relances: number;
  nombre_beneficiaires: number;
  date_redistribution: string | null;
  statut: string;
  commentaire: string | null;
  rubrique_destination_id: string | null;
  caisse_destination_id: string | null;
  annee_generation: number;
  annee_affectation_prevue: number;

  destination: {
    rubrique_id: string;
    code: string;
    nom: string;
  } | null;
};

type AideRow = {
  id: string;
  montant_demande: number;
  montant_accorde: number | null;
  motif: string;
  statut: string;
  created_at: string | null;
};

type DashboardResponse = {
  success: boolean;
  message?: string;
  data?: {
    annees: number[];
    anneeSelectionnee: number;

    utilisateur: {
      is_bureau: boolean;
    };

    membre: {
      id: string;
      numero_membre: string | null;
      nom: string;
      prenom: string;
      nom_complet: string;
      photo_url: string | null;
      est_tontineur_defaut: boolean;
      statut_associatif: string;
      actif: boolean;
    };

    contributions: {
      synthese: {
        nb_obligations_parametrees: number;
        montant_attendu: number;
        report_precedent: number;
        encaissements_annee: number;
        interets_prets_credites: number;
        total_actif: number;
        reste_a_verser: number | null;
        statut: "NON_EVALUE" | "A_JOUR" | "A_REGULARISER";
      };

      rubriques: ContributionRow[];
    };

    prets: {
      lignes: PretRow[];
    };

    interets: {
      total_credite_annee: number;
      rubriques: Array<{
        rubrique_id: string;
        rubrique_nom: string;
        montant: number;
      }>;
    };

    aides: {
      total_demande: number;
      total_accorde: number;
      demandes: AideRow[];
    };

    tontine: {
      est_tontineur_cycle: boolean;
      est_tontineur_defaut: boolean;
      cycles: any[];
      participations: any[];
      bilan: TontineBilanRow[];

      redistributions?: {
        lignes: RedistributionRow[];

        destinations: RedistributionDestination[];
      };
    };
  };
};

function money(value: unknown) {
  const n = Number(value ?? 0);

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function statusLabel(
  statut: "NON_EVALUE" | "A_JOUR" | "A_REGULARISER"
) {
  if (statut === "A_JOUR") {
    return {
      label: "À jour",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (statut === "A_REGULARISER") {
    return {
      label: "À régulariser",
      className:
        "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    label: "Situation informative",
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-slate-900">
        {value}
      </p>

      {subtle ? (
        <p className="mt-1 text-xs text-slate-500">
          {subtle}
        </p>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardResponse["data"] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [annee, setAnnee] = useState<number | null>(null);

  const [
    redistributionSavingId,
    setRedistributionSavingId,
  ] = useState<string | null>(null);

  const [
    redistributionError,
    setRedistributionError,
  ] = useState("");

  async function loadDashboard(anneeChoisie?: number | null) {
    try {
      setLoading(true);
      setError("");

      const url = anneeChoisie
        ? `/api/dashboard?annee=${anneeChoisie}`
        : "/api/dashboard";

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json =
        (await response.json()) as DashboardResponse;

      if (!response.ok || !json.success || !json.data) {
        throw new Error(
          json.message || "Impossible de charger le Dashboard."
        );
      }

      setData(json.data);
      setAnnee(json.data.anneeSelectionnee);
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du chargement du Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function validerDestinationRedistribution(
    redistributionId: string,
    rubriqueDestinationId: string
  ) {
    try {
      setRedistributionSavingId(redistributionId);
      setRedistributionError("");

      const response = await fetch("/api/dashboard", {
        method: "POST",

        cache: "no-store",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          redistribution_id:
            redistributionId,

          rubrique_destination_id:
            rubriqueDestinationId,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.message ||
            "Impossible d'enregistrer votre choix."
        );
      }

      await loadDashboard(annee);
    } catch (err: any) {
      setRedistributionError(
        err?.message ||
          "Erreur lors de l'enregistrement de la destination."
      );
    } finally {
      setRedistributionSavingId(null);
    }
  }

  async function verserRedistribution(
    redistributionId: string,
    montant: number,
    destinationNom: string
  ) {
    const confirme = window.confirm(
      `Confirmez-vous le versement de ${money(
        montant
      )} vers ${destinationNom} ?`
    );

    if (!confirme) {
      return;
    }

    try {
      setRedistributionSavingId(
        redistributionId
      );

      setRedistributionError("");

      const response = await fetch(
        "/api/dashboard",
        {
          method: "POST",

          cache: "no-store",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            action:
              "VERSER_REDISTRIBUTION",

            redistribution_id:
              redistributionId,
          }),
        }
      );

      const json = await response.json();

      if (
        !response.ok ||
        !json?.success
      ) {
        throw new Error(
          json?.message ||
            "Impossible d'effectuer le versement."
        );
      }

      await loadDashboard(annee);
    } catch (err: any) {
      setRedistributionError(
        err?.message ||
          "Erreur lors du versement de la redistribution."
      );
    } finally {
      setRedistributionSavingId(null);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const synthese = data?.contributions.synthese;

  const statut = useMemo(() => {
    return statusLabel(
      synthese?.statut ?? "NON_EVALUE"
    );
  }, [synthese?.statut]);

  const redistributions =
    data?.tontine.redistributions?.lignes ?? [];

  const destinationsRedistribution =
    data?.tontine.redistributions?.destinations ?? [];

  const pret = data?.prets.lignes?.[0] ?? null;

  const tontine = data?.tontine.bilan?.[0] ?? null;

  const hasTontine =
    Boolean(tontine) ||
    redistributions.length > 0 ||
    data?.tontine.est_tontineur_cycle === true ||
    data?.tontine.est_tontineur_defaut === true;

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-600 shadow-sm">
          Chargement de votre situation...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-800">
            Impossible de charger le Dashboard
          </p>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <button
            onClick={() => loadDashboard()}
            className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data || !synthese) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 pb-24 md:space-y-6 md:pb-10">
      {/* =====================================================
          ENTETE
      ====================================================== */}

      <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm">
        <div className="p-5 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {data.membre.photo_url ? (
                <img
                  src={data.membre.photo_url}
                  alt={data.membre.nom_complet}
                  className="h-16 w-16 shrink-0 rounded-2xl border border-white object-cover shadow-sm md:h-20 md:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black text-emerald-800 md:h-20 md:w-20">
                  {data.membre.nom_complet
                    ?.charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Ma situation ASF-NTOL
                </p>

                <h1 className="mt-1 truncate text-2xl font-black text-slate-950 md:text-3xl">
                  {data.membre.nom_complet}
                </h1>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
                    {data.membre.statut_associatif}
                  </span>

                  {data.utilisateur.is_bureau ? (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
                      Bureau
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <label className="flex-1 md:flex-none">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                  Exercice
                </span>

                <select
                  value={annee ?? ""}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setAnnee(next);
                    loadDashboard(next);
                  }}
                  className="h-11 min-w-[125px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500"
                >
                  {data.annees.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <LogoutButton />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ETAT GENERAL
      ====================================================== */}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionTitle
            eyebrow={`Exercice ${data.anneeSelectionnee}`}
            title="Vue d'ensemble"
            description="Votre situation personnelle pour l'année sélectionnée."
          />

          <span
            className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statut.className}`}
          >
            {statut.label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label="Report antérieur"
            value={money(synthese.report_precedent)}
          />

          <Metric
            label="Versements année"
            value={money(synthese.encaissements_annee)}
          />

          <Metric
            label="Total suivi"
            value={money(synthese.total_actif)}
          />

          <Metric
            label="Reste à verser"
            value={
              synthese.reste_a_verser === null
                ? "—"
                : money(synthese.reste_a_verser)
            }
            subtle={
              synthese.reste_a_verser === null
                ? "Aucune obligation paramétrée"
                : undefined
            }
          />
        </div>
      </section>

      {/* =====================================================
    CONTRIBUTIONS
====================================================== */}

<section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
  <SectionTitle
    eyebrow="Contributions"
    title="Situation par rubrique"
    description="Report, versements et obligations de l'exercice sélectionné."
  />

  {data.contributions.rubriques.length === 0 ? (
    <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
      Aucun mouvement enregistré pour cet exercice.
    </p>
  ) : (
    <>
      {/* =========================
          VERSION PC / TABLETTE
      ========================== */}
      <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 md:block">

        {/* En-tête */}
        <div className="grid grid-cols-[minmax(260px,1.8fr)_repeat(4,minmax(110px,1fr))] bg-slate-100">
          <div className="px-5 py-4 text-xs font-black uppercase tracking-[0.1em] text-slate-600">
            Rubrique
          </div>

          <div className="px-3 py-4 text-center text-xs font-black uppercase tracking-[0.1em] text-slate-600">
            Report {data.anneeSelectionnee - 1}
          </div>

          <div className="px-3 py-4 text-center text-xs font-black uppercase tracking-[0.1em] text-slate-600">
            Versé {data.anneeSelectionnee}
          </div>

          <div className="px-3 py-4 text-center text-xs font-black uppercase tracking-[0.1em] text-slate-600">
            Attendu {data.anneeSelectionnee}
          </div>

          <div className="px-3 py-4 text-center text-xs font-black uppercase tracking-[0.1em] text-slate-600">
            Reste {data.anneeSelectionnee}
          </div>
        </div>

        {/* Lignes */}
        {data.contributions.rubriques.map((row, index) => (
          <div
            key={`${row.annee}-${row.rubrique_id}`}
            className={`grid grid-cols-[minmax(260px,1.8fr)_repeat(4,minmax(110px,1fr))] items-center border-t border-slate-200 ${
              index % 2 === 0 ? "bg-white" : "bg-slate-50/60"
            }`}
          >
            <div className="px-5 py-4">
              <p className="font-black leading-5 text-slate-900">
                {row.rubrique_nom}
              </p>

              {row.obligation_parametree ? (
                <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  Obligation paramétrée
                </span>
              ) : null}
            </div>

            <div className="px-3 py-4 text-center">
              <p className="tabular-nums text-base font-black text-slate-900">
                {money(row.report_precedent)}
              </p>
            </div>

            <div className="px-3 py-4 text-center">
              <p className="tabular-nums text-base font-black text-slate-900">
                {money(row.encaissements_annee)}
              </p>
            </div>

            <div className="px-3 py-4 text-center">
              <p className="tabular-nums text-base font-black text-slate-900">
                {row.montant_attendu_annuel === null
                  ? "—"
                  : money(row.montant_attendu_annuel)}
              </p>
            </div>

            <div className="px-3 py-4 text-center">
              <p
                className={`tabular-nums text-base font-black ${
                  row.reste_a_verser !== null &&
                  Number(row.reste_a_verser) > 0
                    ? "text-amber-700"
                    : "text-slate-900"
                }`}
              >
                {row.reste_a_verser === null
                  ? "—"
                  : money(row.reste_a_verser)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* =========================
          VERSION MOBILE
      ========================== */}
      <div className="mt-5 space-y-3 md:hidden">
        {data.contributions.rubriques.map((row) => (
          <div
            key={`${row.annee}-${row.rubrique_id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <p className="font-black text-slate-900">
              {row.rubrique_nom}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Report {data.anneeSelectionnee - 1}
                </p>
                <p className="mt-1 tabular-nums font-black text-slate-900">
                  {money(row.report_precedent)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Versé {data.anneeSelectionnee}
                </p>
                <p className="mt-1 tabular-nums font-black text-slate-900">
                  {money(row.encaissements_annee)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Attendu {data.anneeSelectionnee}
                </p>
                <p className="mt-1 tabular-nums font-black text-slate-900">
                  {row.montant_attendu_annuel === null
                    ? "—"
                    : money(row.montant_attendu_annuel)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                  Reste {data.anneeSelectionnee}
                </p>
                <p
                  className={`mt-1 tabular-nums font-black ${
                    row.reste_a_verser !== null &&
                    Number(row.reste_a_verser) > 0
                      ? "text-amber-700"
                      : "text-slate-900"
                  }`}
                >
                  {row.reste_a_verser === null
                    ? "—"
                    : money(row.reste_a_verser)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</section>

{/* =====================================================
    TONTINE + PRET
====================================================== */}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[26px] border border-sky-200 bg-white p-5 shadow-sm md:p-6">
          <SectionTitle
            eyebrow="Tontine"
            title={`Situation ${data.anneeSelectionnee}`}
          />

          {!hasTontine ? (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Vous ne participez pas à la Tontine pour cet exercice.
            </p>
          ) : tontine ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                label="Cotisations"
                value={money(tontine.cotisations)}
              />

              <Metric
                label="Gain"
                value={money(tontine.gain)}
              />

              <div className="col-span-2 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-sky-700">
                  Statut
                </p>

                <p className="mt-2 text-lg font-black text-sky-950">
                  {tontine.statut || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold text-slate-800">
                Aucun résultat de cycle disponible
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Le cycle de l'année n'est pas encore renseigné ou finalisé.
              </p>
            </div>
          )}

          {redistributions.length > 0 ? (
            <div className="mt-6 border-t border-sky-100 pt-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                  Redistribution des enchères
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Affectation prévue pour {data.anneeSelectionnee}.
                </p>
              </div>

              {redistributionError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {redistributionError}
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                {redistributions.map((row) => {
                  const saving =
                    redistributionSavingId === row.id;

                  const statutLabel =
                    row.statut === "CALCULEE"
                      ? "À affecter"
                      : row.statut === "VALIDEE"
                      ? "Choix validé"
                      : row.statut === "VERSEE"
                      ? "Versée"
                      : row.statut;

                  return (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                            Enchères {row.annee_generation}
                          </p>

                          <p className="mt-1 text-2xl font-black text-slate-950">
                            {money(row.montant_redistribue)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Affectation {row.annee_affectation_prevue}
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-800">
                          {statutLabel}
                        </span>
                      </div>

                      {row.statut === "CALCULEE" ? (
                        <div className="mt-4">
                          <p className="text-sm font-bold text-slate-800">
                            Choisissez la rubrique à créditer :
                          </p>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {destinationsRedistribution.map(
                              (destination) => (
                                <button
                                  key={destination.id}
                                  type="button"
                                  disabled={saving}
                                  onClick={() =>
                                    validerDestinationRedistribution(
                                      row.id,
                                      destination.id
                                    )
                                  }
                                  className="rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {saving
                                    ? "Enregistrement..."
                                    : destination.nom}
                                </button>
                              )
                            )}
                          </div>

                          <p className="mt-3 text-xs leading-5 text-slate-500">
                            Ce choix valide uniquement la destination.
                            Aucun versement n'est encore effectué dans la caisse.
                          </p>
                        </div>
                      ) : row.destination ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                            Destination
                          </p>

                          <p className="mt-1 font-black text-slate-900">
                            {row.destination.nom}
                          </p>

                          {row.statut === "VALIDEE" ? (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-amber-700">
                                Destination validée. Le versement n'a pas encore été effectué.
                              </p>

                              <button
                                type="button"
                                disabled={
                                  redistributionSavingId ===
                                  row.id
                                }
                                onClick={() =>
                                  verserRedistribution(
                                    row.id,
                                    Number(
                                      row.montant_redistribue
                                    ),
                                    row.destination?.nom ??
                                      "la rubrique sélectionnée"
                                  )
                                }
                                className="mt-3 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {redistributionSavingId ===
                                row.id
                                  ? "Versement en cours..."
                                  : "Verser ma redistribution"}
                              </button>
                            </div>
                          ) : null}

                          {row.statut === "VERSEE" ? (
                            <p className="mt-2 text-xs font-semibold text-emerald-700">
                              Redistribution créditée.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Link
            href="/tontine"
            className="mt-5 inline-flex rounded-xl border border-sky-200 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-50"
          >
            Voir la Tontine
          </Link>
        </section>

        <section className="rounded-[26px] border border-violet-200 bg-white p-5 shadow-sm md:p-6">
          <SectionTitle
            eyebrow="Prêts"
            title="Ma situation"
          />

          {pret ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric
                label="Report dette"
                value={money(
                  pret.report_prets_a_rembourser
                )}
              />

              <Metric
                label="Prêts reçus"
                value={money(
                  pret.prets_octroyes_annee
                )}
              />

              <Metric
                label="Remboursé"
                value={money(
                  pret.remboursements_annee
                )}
              />

              <Metric
                label="Restant dû"
                value={money(
                  pret.prets_a_rembourser_fin_exercice
                )}
              />
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Aucun prêt enregistré pour cet exercice.
            </p>
          )}

          <Link
            href="/prets-aides"
            className="mt-5 inline-flex rounded-xl border border-violet-200 px-4 py-2 text-sm font-bold text-violet-800 hover:bg-violet-50"
          >
            Voir mes prêts et aides
          </Link>
        </section>
      </div>

      {/* =====================================================
          INTERETS + AIDES
      ====================================================== */}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[26px] border border-amber-200 bg-white p-5 shadow-sm md:p-6">
          <SectionTitle
            eyebrow="Gains"
            title="Intérêts sur prêts"
            description="Intérêts réellement crédités à votre profit pendant l'exercice."
          />

          <div className="mt-5">
            <Metric
              label="Total crédité"
              value={money(
                data.interets.total_credite_annee
              )}
            />
          </div>

          {data.interets.rubriques.length > 0 ? (
            <div className="mt-4 space-y-2">
              {data.interets.rubriques.map((row) => (
                <div
                  key={row.rubrique_id}
                  className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3"
                >
                  <span className="text-sm font-semibold text-amber-950">
                    {row.rubrique_nom}
                  </span>

                  <span className="font-black text-amber-950">
                    {money(row.montant)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[26px] border border-rose-200 bg-white p-5 shadow-sm md:p-6">
          <SectionTitle
            eyebrow="Aides"
            title="Demandes et aides reçues"
          />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric
              label="Demandé"
              value={money(data.aides.total_demande)}
            />

            <Metric
              label="Accordé"
              value={money(data.aides.total_accorde)}
            />
          </div>

          {data.aides.demandes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Aucune demande d'aide pendant cet exercice.
            </p>
          ) : null}
        </section>
      </div>

      {/* =====================================================
          RACCOURCIS
      ====================================================== */}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <SectionTitle
          eyebrow="Accès rapides"
          title="Consulter les détails"
        />

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link
            href="/imputations"
            className="rounded-2xl border border-slate-200 p-4 text-center text-sm font-black text-slate-800 hover:bg-slate-50"
          >
            Historique
          </Link>

          <Link
            href="/prets-aides"
            className="rounded-2xl border border-slate-200 p-4 text-center text-sm font-black text-slate-800 hover:bg-slate-50"
          >
            Prêts / Aides
          </Link>

          <Link
            href="/tontine"
            className="rounded-2xl border border-slate-200 p-4 text-center text-sm font-black text-slate-800 hover:bg-slate-50"
          >
            Tontine
          </Link>

          {data.utilisateur.is_bureau ? (
            <Link
              href="/bilan"
              className="rounded-2xl border border-slate-200 p-4 text-center text-sm font-black text-slate-800 hover:bg-slate-50"
            >
              Bilan
            </Link>
          ) : (
            <Link
              href="/documents"
              className="rounded-2xl border border-slate-200 p-4 text-center text-sm font-black text-slate-800 hover:bg-slate-50"
            >
              Documents
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}