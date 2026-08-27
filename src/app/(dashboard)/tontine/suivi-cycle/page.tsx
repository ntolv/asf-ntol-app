"use client";

import { useEffect, useMemo, useState } from "react";

type Cycle = {
  cycle_id: string;
  code: string | null;
  libelle: string | null;
  annee_reference: number | null;
  date_debut: string | null;
  date_fin: string | null;
  nb_sessions_prevues: number | null;
  montant_brut_tontine_reference: string | number | null;
  mise_brute_reference: string | number | null;
  statut_cycle: string | null;
  actif: boolean | null;
  mode_gestion: string | null;
  total_sessions: number | null;
  total_participants: number | null;
};

type Session = {
  id: string;
  cycle_id: string;
  ordre_session: number;
  periode_reference: string;
  statut_session: string | null;
  statut_encheres: string | null;
  mise_brute_session: string | number | null;
  nb_lots_effectif: number | null;
  cumul_caisse?: string | number | null;
  cumul_caisse_progressif?: string | number | null;
};

type Lot = {
  id?: string;
  lot_id?: string;
  cycle_id: string;
  periode_reference?: string | null;
  numero_lot?: number | null;
  gagnant_nom?: string | null;
  membre_nom?: string | null;
  nom_complet?: string | null;
  mise_brute_lot?: string | number | null;
  montant_total_relances?: string | number | null;
  gain_reel?: string | number | null;
  statut_lot?: string | null;
};

type MembreResultat = {
  cycle_id: string;
  membre_id?: string;
  membre_nom?: string | null;
  nom_complet?: string | null;
  statut_cycle_membre?: string | null;
  total_gains?: string | number | null;
  gain_total?: string | number | null;
};

type Suivi = {
  cycle_id: string;
  ordre_mois: number;
  mois_libelle: string | null;
  date_theorique: string | null;
  nb_tontineurs: number | null;
  montant_par_tontineur: string | number | null;
  contribution_globale_mensuelle: string | number | null;
  contribution_globale_cycle: string | number | null;
  mise_brute_unitaire: string | number | null;
  nb_beneficiaires_mois: number | null;
  mise_brute_mois: string | number | null;
  solde_caisse_fin_mois: string | number | null;
  multi_mise_possible: boolean | null;
};

type CycleData = {
  cycle: Cycle;
  sessions: Session[];
  lots: Lot[];
  membres: MembreResultat[];
  suivi: Suivi[];
};

function formatFcfa(
  value: number | string | null | undefined
) {
  const n = Number(value ?? 0);

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(n)} FCFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR");
}

function statusClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();

  if (
    s === "TERMINEE" ||
    s === "CLOTURE" ||
    s === "CLOTUREE"
  ) {
    return "bg-green-100 text-green-800";
  }

  if (s === "EN_COURS" || s === "ACTIF") {
    return "bg-blue-100 text-blue-800";
  }

  if (s === "PLANIFIEE") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

export default function SuiviCyclePage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] =
    useState("");

  const [data, setData] =
    useState<CycleData | null>(null);

  const [loadingCycles, setLoadingCycles] =
    useState(true);

  const [loadingData, setLoadingData] =
    useState(false);

  const [error, setError] = useState("");


  // ==========================================================
  // CHARGER TOUS LES CYCLES
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadCycles() {
      try {
        setLoadingCycles(true);
        setError("");

        const res = await fetch(
          "/api/tontine/cycles",
          {
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (!res.ok || json?.success === false) {
          throw new Error(
            json?.error ??
              "Erreur de chargement des cycles."
          );
        }

        const rows: Cycle[] =
          Array.isArray(json?.cycles)
            ? json.cycles
            : [];

        if (cancelled) return;

        setCycles(rows);

        // Par défaut :
        // 1. cycle actif si présent
        // 2. sinon le plus récent
        if (rows.length > 0) {
          const actif =
            rows.find(
              (cycle) =>
                cycle.actif === true &&
                cycle.statut_cycle !== "CLOTURE"
            ) ?? rows[0];

          setSelectedCycleId(
            (current) =>
              current || actif.cycle_id
          );
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Erreur inconnue."
        );
      } finally {
        if (!cancelled) {
          setLoadingCycles(false);
        }
      }
    }

    loadCycles();

    return () => {
      cancelled = true;
    };
  }, []);


  // ==========================================================
  // CHARGER LE CYCLE SELECTIONNE
  // ==========================================================

  useEffect(() => {
    if (!selectedCycleId) {
      setData(null);
      return;
    }

    let cancelled = false;

    async function loadCycleData() {
      try {
        setLoadingData(true);
        setError("");

        const res = await fetch(
          `/api/tontine/suivi-cycle?cycle_id=${encodeURIComponent(
            selectedCycleId
          )}`,
          {
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (!res.ok || json?.success === false) {
          throw new Error(
            json?.error ??
              "Erreur de chargement du cycle."
          );
        }

        if (cancelled) return;

        setData({
          cycle: json.cycle,
          sessions: Array.isArray(json.sessions)
            ? json.sessions
            : [],
          lots: Array.isArray(json.lots)
            ? json.lots
            : [],
          membres: Array.isArray(json.membres)
            ? json.membres
            : [],
          suivi: Array.isArray(json.suivi)
            ? json.suivi
            : [],
        });
      } catch (err) {
        if (cancelled) return;

        setData(null);

        setError(
          err instanceof Error
            ? err.message
            : "Erreur inconnue."
        );
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadCycleData();

    return () => {
      cancelled = true;
    };
  }, [selectedCycleId]);


  const cycle = data?.cycle ?? null;
  const sessions = data?.sessions ?? [];
  const lots = data?.lots ?? [];
  const suivi = data?.suivi ?? [];


  const totalLots = useMemo(
    () =>
      sessions.reduce(
        (sum, session) =>
          sum +
          Number(session.nb_lots_effectif ?? 0),
        0
      ),
    [sessions]
  );


  const lotsGagnes = useMemo(
    () =>
      lots.filter(
        (lot) =>
          Boolean(
            lot.gagnant_nom ??
              lot.membre_nom ??
              lot.nom_complet
          )
      ).length,
    [lots]
  );


  if (loadingCycles) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-xl border bg-white p-5">
          Chargement des cycles Tontine...
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* ======================================================
          TITRE
      ====================================================== */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Suivi cycle Tontine
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Sélectionnez un cycle pour consulter son
          déroulement complet.
        </p>
      </div>


      {/* ======================================================
          SELECTION CYCLE
      ====================================================== */}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Cycle à analyser
        </label>

        <select
          value={selectedCycleId}
          onChange={(e) =>
            setSelectedCycleId(e.target.value)
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:max-w-xl"
        >
          {cycles.map((item) => (
            <option
              key={item.cycle_id}
              value={item.cycle_id}
            >
              {item.libelle ??
                item.code ??
                `Cycle ${
                  item.annee_reference ?? ""
                }`}
              {" — "}
              {item.statut_cycle ?? "—"}
            </option>
          ))}
        </select>
      </div>


      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}


      {loadingData && (
        <div className="rounded-xl border bg-white p-5">
          Chargement du cycle sélectionné...
        </div>
      )}


      {!loadingData && cycle && (

        <>
          {/* ==================================================
              IDENTITE CYCLE
          ================================================== */}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Cycle
              </div>

              <div className="mt-2 text-lg font-bold text-slate-900">
                {cycle.libelle ??
                  cycle.code ??
                  "Cycle Tontine"}
              </div>

              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                    cycle.statut_cycle
                  )}`}
                >
                  {cycle.statut_cycle ?? "—"}
                </span>
              </div>
            </div>


            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Période
              </div>

              <div className="mt-2 font-semibold">
                {formatDate(cycle.date_debut)}
                {" → "}
                {formatDate(cycle.date_fin)}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                {cycle.total_sessions ?? 0} session(s)
              </div>
            </div>


            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Participants
              </div>

              <div className="mt-2 text-2xl font-bold">
                {cycle.total_participants ?? 0}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                tontineur(s)
              </div>
            </div>


            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Mise brute
              </div>

              <div className="mt-2 text-xl font-bold">
                {formatFcfa(
                  cycle.mise_brute_reference
                )}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                par lot
              </div>
            </div>

          </div>


          {/* ==================================================
              KPI
          ================================================== */}

          <div className="grid gap-4 md:grid-cols-3">

            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">
                Lots prévus / réalisés
              </div>

              <div className="mt-1 text-2xl font-bold">
                {totalLots}
              </div>
            </div>


            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">
                Lots gagnés
              </div>

              <div className="mt-1 text-2xl font-bold">
                {lotsGagnes}
              </div>
            </div>


            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">
                Mode de gestion
              </div>

              <div className="mt-1 text-lg font-bold">
                {cycle.mode_gestion ?? "—"}
              </div>
            </div>

          </div>


          {/* ==================================================
              SUIVI FINANCIER STRUCTUREL
          ================================================== */}

          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="font-bold text-slate-900">
                Suivi du cycle
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Accumulation de la caisse servant à
                déterminer les lots supplémentaires.
              </p>
            </div>

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm">

                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      Mois
                    </th>

                    <th className="px-4 py-3 text-right">
                      Tontineurs
                    </th>

                    <th className="px-4 py-3 text-right">
                      Cotisation
                    </th>

                    <th className="px-4 py-3 text-right">
                      Entrée mensuelle
                    </th>

                    <th className="px-4 py-3 text-right">
                      Lots
                    </th>

                    <th className="px-4 py-3 text-right">
                      Mise brute utilisée
                    </th>

                    <th className="px-4 py-3 text-right">
                      Cumul caisse
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {suivi.map((row) => (

                    <tr
                      key={`${row.cycle_id}-${row.ordre_mois}`}
                      className="border-t"
                    >
                      <td className="px-4 py-3 font-medium">
                        {row.mois_libelle ??
                          row.date_theorique ??
                          `Session ${row.ordre_mois}`}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {row.nb_tontineurs ?? 0}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatFcfa(
                          row.montant_par_tontineur
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatFcfa(
                          row.contribution_globale_mensuelle
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {row.nb_beneficiaires_mois ?? 0}

                        {row.multi_mise_possible && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            multi-lot
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatFcfa(
                          row.mise_brute_mois
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-bold">
                        {formatFcfa(
                          row.solde_caisse_fin_mois
                        )}
                      </td>
                    </tr>

                  ))}

                  {suivi.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Aucun suivi disponible pour ce cycle.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>
          </div>


          {/* ==================================================
              SESSIONS
          ================================================== */}

          <div className="rounded-xl border bg-white shadow-sm">

            <div className="border-b px-4 py-3">
              <h2 className="font-bold text-slate-900">
                Sessions
              </h2>
            </div>

            <div className="overflow-x-auto">

              <table className="min-w-full text-sm">

                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">

                  <tr>
                    <th className="px-4 py-3">
                      #
                    </th>

                    <th className="px-4 py-3">
                      Période
                    </th>

                    <th className="px-4 py-3">
                      Session
                    </th>

                    <th className="px-4 py-3">
                      Enchères
                    </th>

                    <th className="px-4 py-3 text-right">
                      Mise brute
                    </th>

                    <th className="px-4 py-3 text-right">
                      Lots
                    </th>

                    <th className="px-4 py-3 text-right">
                      Cumul caisse
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {sessions.map((session) => (

                    <tr
                      key={session.id}
                      className="border-t"
                    >

                      <td className="px-4 py-3">
                        {session.ordre_session}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {session.periode_reference}
                      </td>

                      <td className="px-4 py-3">

                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(
                            session.statut_session
                          )}`}
                        >
                          {session.statut_session ?? "—"}
                        </span>

                      </td>

                      <td className="px-4 py-3">

                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(
                            session.statut_encheres
                          )}`}
                        >
                          {session.statut_encheres ?? "—"}
                        </span>

                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatFcfa(
                          session.mise_brute_session
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {session.nb_lots_effectif ?? 0}
                      </td>

                      <td className="px-4 py-3 text-right font-bold">
                        {formatFcfa(
                          session.cumul_caisse_progressif ??
                            session.cumul_caisse
                        )}
                      </td>

                    </tr>

                  ))}

                  {sessions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Aucune session pour ce cycle.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </>
      )}

    </div>
  );
}