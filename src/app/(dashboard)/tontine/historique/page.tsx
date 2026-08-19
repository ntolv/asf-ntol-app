"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CycleInfo = {
  id: string;
  code: string;
  libelle: string;
  annee_reference: number | null;
  mode_gestion: "APPLICATION" | "IMPORT_HISTORIQUE";
  statut_cycle: string;
};

type ResultatCycle = {
  cycle_id: string;
  total_sessions: number;
  total_lots: number;
  total_gagnants_uniques: number;
  mise_brute_totale: number | null;
  relances_totales: number | null;
  gains_reels_totaux: number;
};

type ResultatSession = {
  cycle_id: string;
  session_id: string;
  annee_reference: number | null;
  mode_gestion: string;
  session_libelle: string;
  periode_reference: string;
  ordre_session: number;
  total_lots_attribues: number;
  mise_brute_totale_session: number | null;
  mise_brute_unitaire_session: number | null;
  mise_min_session: number | null;
  mise_max_session: number | null;
  mises_differentes: boolean;
  encheres_totales_session: number | null;
  gains_reels_totaux_session: number;
};

type ResultatLot = {
  cycle_id: string;
  session_id: string;
  session_libelle: string;
  periode_reference: string;
  ordre_session: number;
  lot_id: string;
  numero_lot: number;
  lot_libelle: string;
  statut_lot: string;
  membre_id: string;
  nom_complet: string;
  montant_depart_enchere: number;
  mise_brute_lot: number | null;
  montant_total_relances: number | null;
  gain_reel: number;
  date_ouverture: string | null;
  date_cloture: string | null;
  rang_gain_dans_session: number;
};

type ResultatMembreCycle = {
  cycle_id: string;
  membre_id: string;
  nom_complet: string;
  total_lots_gagnes_cycle: number;
  total_sessions_gagnees_cycle: number;
  mise_brute_totale_gagnee_cycle: number | null;
  total_relances_cycle: number | null;
  gain_reel_total_cycle: number;
  premiere_session_gagnee: number | null;
  derniere_session_gagnee: number | null;
  derniere_date_cloture: string | null;
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "À reconstruire";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function periodeLabel(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) return value;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);

  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function HistoriqueTontinePage() {
  const [cycles, setCycles] = useState<CycleInfo[]>([]);
  const [resultatsCycles, setResultatsCycles] = useState<ResultatCycle[]>([]);
  const [sessions, setSessions] = useState<ResultatSession[]>([]);
  const [lots, setLots] = useState<ResultatLot[]>([]);
  const [membres, setMembres] = useState<ResultatMembreCycle[]>([]);

  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [
          cyclesRes,
          resultatsCyclesRes,
          sessionsRes,
          lotsRes,
          membresRes,
        ] = await Promise.all([
          supabase
            .from("tontine_cycles")
            .select("id,code,libelle,annee_reference,mode_gestion,statut_cycle")
            .order("annee_reference", { ascending: false }),

          supabase
            .from("v_tontine_resultats_cycles")
            .select("*"),

          supabase
            .from("v_tontine_resultats_sessions")
            .select("*")
            .order("ordre_session", { ascending: true }),

          supabase
            .from("v_tontine_resultats_lots")
            .select("*")
            .order("ordre_session", { ascending: true })
            .order("numero_lot", { ascending: true }),

          supabase
            .from("v_tontine_resultats_membres_cycles")
            .select("*")
            .order("gain_reel_total_cycle", { ascending: false }),
        ]);

        if (cyclesRes.error) throw cyclesRes.error;
        if (resultatsCyclesRes.error) throw resultatsCyclesRes.error;
        if (sessionsRes.error) throw sessionsRes.error;
        if (lotsRes.error) throw lotsRes.error;
        if (membresRes.error) throw membresRes.error;

        const cyclesData = (cyclesRes.data ?? []) as CycleInfo[];

        setCycles(cyclesData);
        setResultatsCycles(
          (resultatsCyclesRes.data ?? []) as ResultatCycle[]
        );
        setSessions((sessionsRes.data ?? []) as ResultatSession[]);
        setLots((lotsRes.data ?? []) as ResultatLot[]);
        setMembres((membresRes.data ?? []) as ResultatMembreCycle[]);

        if (cyclesData.length > 0) {
          setSelectedCycleId((current) => current || cyclesData[0].id);
        }
      } catch (err: any) {
        console.error("Erreur historique tontine:", err);
        setError(
          err?.message ||
            "Impossible de charger l'historique de la tontine."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const cycleSelectionne = useMemo(
    () => cycles.find((cycle) => cycle.id === selectedCycleId) ?? null,
    [cycles, selectedCycleId]
  );

  const resultatCycle = useMemo(
    () =>
      resultatsCycles.find(
        (cycle) => cycle.cycle_id === selectedCycleId
      ) ?? null,
    [resultatsCycles, selectedCycleId]
  );

  const sessionsCycle = useMemo(
    () =>
      sessions
        .filter((session) => session.cycle_id === selectedCycleId)
        .sort((a, b) => a.ordre_session - b.ordre_session),
    [sessions, selectedCycleId]
  );

  const lotsCycle = useMemo(
    () =>
      lots.filter((lot) => lot.cycle_id === selectedCycleId),
    [lots, selectedCycleId]
  );

  const membresCycle = useMemo(
    () =>
      membres.filter((membre) => membre.cycle_id === selectedCycleId),
    [membres, selectedCycleId]
  );

  const lotsParSession = useMemo(() => {
    const map = new Map<string, ResultatLot[]>();

    lotsCycle.forEach((lot) => {
      const existing = map.get(lot.session_id) ?? [];
      existing.push(lot);
      map.set(lot.session_id, existing);
    });

    return map;
  }, [lotsCycle]);

  const reconstructionComplete =
    resultatCycle?.mise_brute_totale !== null &&
    resultatCycle?.mise_brute_totale !== undefined &&
    resultatCycle?.relances_totales !== null &&
    resultatCycle?.relances_totales !== undefined;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-6 md:px-6">
      
      <div className="mx-auto max-w-7xl space-y-6">

        <section className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.20em] text-emerald-700">
            Tontine
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 md:text-4xl">
            Historique Tontine
          </h1>

          <p className="mt-3 max-w-4xl text-sm text-emerald-900/70 md:text-base">
            Résultats financiers des cycles de tontine : mises brutes,
            enchères cumulées, gains réels, gagnants et détail des lots.
          </p>
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
          <label
            htmlFor="cycle-historique"
            className="text-sm font-semibold text-emerald-950"
          >
            Année / cycle
          </label>

          <select
            id="cycle-historique"
            value={selectedCycleId}
            onChange={(event) => setSelectedCycleId(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none md:max-w-md"
          >
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.annee_reference ?? "Sans année"} — {cycle.libelle}
              </option>
            ))}
          </select>

          {cycleSelectionne ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                {cycleSelectionne.mode_gestion === "IMPORT_HISTORIQUE"
                  ? "Historique importé"
                  : "Cycle application"}
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">
                {cycleSelectionne.statut_cycle}
              </span>

              <span
                className={
                  reconstructionComplete
                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800"
                    : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800"
                }
              >
                {reconstructionComplete
                  ? "Données financières complètes"
                  : "Reconstruction incomplète"}
              </span>
            </div>
          ) : null}
        </section>

        {loading ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Chargement de l'historique Tontine...
          </section>
        ) : error ? (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700 shadow-sm">
            {error}
          </section>
        ) : !resultatCycle ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Aucun résultat disponible pour ce cycle.
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Mise brute totale
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-950">
                  {money(resultatCycle.mise_brute_totale)}
                </p>
              </article>

              <article className="rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Enchères cumulées
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-700">
                  {money(resultatCycle.relances_totales)}
                </p>
              </article>

              <article className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Gains réels totaux
                </p>
                <p className="mt-2 text-2xl font-bold text-sky-800">
                  {money(resultatCycle.gains_reels_totaux)}
                </p>
              </article>

              <article className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Lots attribués
                </p>
                <p className="mt-2 text-2xl font-bold text-violet-800">
                  {resultatCycle.total_lots}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {resultatCycle.total_gagnants_uniques} gagnant(s) unique(s)
                </p>
              </article>
            </section>

            <section className="rounded-[28px] border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Redistribution finale des enchères
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-900">
                {money(resultatCycle.relances_totales)}
              </p>
              <p className="mt-2 text-sm text-amber-900/70">
                Montant cumulé des enchères du cycle à redistribuer selon
                les règles de la tontine.
              </p>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-emerald-950">
                  Sessions du cycle
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Détail mensuel des gagnants, mises, enchères et gains réels.
                </p>
              </div>

              <div className="grid gap-4">
                {sessionsCycle.map((session) => {
                  const lotsSession =
                    lotsParSession.get(session.session_id) ?? [];

                  return (
                    <article
                      key={session.session_id}
                      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Session #{session.ordre_session}
                          </p>

                          <h3 className="mt-1 text-xl font-bold capitalize text-slate-900">
                            {periodeLabel(session.periode_reference)}
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            {session.total_lots_attribues} lot(s)
                          </span>

                          {session.mises_differentes ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                              Mises différentes
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Mise brute
                          </p>
                          <p className="mt-1 font-bold text-slate-900">
                            {session.mises_differentes
                              ? `${money(session.mise_min_session)} à ${money(
                                  session.mise_max_session
                                )}`
                              : money(session.mise_brute_unitaire_session)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Enchères
                          </p>
                          <p className="mt-1 font-bold text-amber-700">
                            {money(session.encheres_totales_session)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                            Gains réels
                          </p>
                          <p className="mt-1 font-bold text-emerald-800">
                            {money(session.gains_reels_totaux_session)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {lotsSession.map((lot) => (
                          <div
                            key={lot.lot_id}
                            className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                  Lot {lot.numero_lot}
                                </p>

                                <p className="mt-1 font-bold text-slate-900">
                                  {lot.nom_complet}
                                </p>
                              </div>

                              <p className="text-lg font-bold text-emerald-800">
                                {money(lot.gain_reel)}
                              </p>
                            </div>

                            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                              <div>
                                <span className="text-slate-500">Mise : </span>
                                <span className="font-semibold">
                                  {money(lot.mise_brute_lot)}
                                </span>
                              </div>

                              <div>
                                <span className="text-slate-500">
                                  Enchère :{" "}
                                </span>
                                <span className="font-semibold">
                                  {money(lot.montant_total_relances)}
                                </span>
                              </div>

                              <div>
                                <span className="text-slate-500">
                                  Gain réel :{" "}
                                </span>
                                <span className="font-semibold">
                                  {money(lot.gain_reel)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-emerald-950">
                  Résultats par membre
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Synthèse de chaque gagnant pour le cycle sélectionné.
                </p>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3 pr-4">Membre</th>
                      <th className="py-3 pr-4">Lots</th>
                      <th className="py-3 pr-4">Mises</th>
                      <th className="py-3 pr-4">Enchères</th>
                      <th className="py-3">Gains réels</th>
                    </tr>
                  </thead>

                  <tbody>
                    {membresCycle.map((membre) => (
                      <tr
                        key={membre.membre_id}
                        className="border-b border-slate-100"
                      >
                        <td className="py-4 pr-4 font-semibold text-slate-900">
                          {membre.nom_complet}
                        </td>

                        <td className="py-4 pr-4">
                          {membre.total_lots_gagnes_cycle}
                        </td>

                        <td className="py-4 pr-4">
                          {money(membre.mise_brute_totale_gagnee_cycle)}
                        </td>

                        <td className="py-4 pr-4">
                          {money(membre.total_relances_cycle)}
                        </td>

                        <td className="py-4 font-bold text-emerald-800">
                          {money(membre.gain_reel_total_cycle)}
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
    </main>
  );
}
