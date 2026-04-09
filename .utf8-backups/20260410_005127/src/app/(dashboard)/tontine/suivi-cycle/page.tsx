"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ResultatCycle = {
  cycle_id: string;
  total_sessions: number;
  total_lots: number;
  total_gagnants_uniques: number;
  mise_brute_totale: number;
  relances_totales: number;
  gains_reels_totaux: number;
};

type ResultatMembreSession = {
  cycle_id: string;
  session_id: string;
  session_libelle: string;
  periode_reference: string;
  ordre_session: number;
  membre_id: string;
  nom_complet: string;
  total_lots_gagnes_session: number;
  mise_brute_totale_gagnee_session: number;
  total_relances_session: number;
  gain_reel_total_session: number;
  derniere_date_cloture_session: string | null;
};

type ResultatMembreCycle = {
  cycle_id: string;
  membre_id: string;
  nom_complet: string;
  total_lots_gagnes_cycle: number;
  total_sessions_gagnees_cycle: number;
  mise_brute_totale_gagnee_cycle: number;
  total_relances_cycle: number;
  gain_reel_total_cycle: number;
  premiere_session_gagnee: number | null;
  derniere_session_gagnee: number | null;
  derniere_date_cloture: string | null;
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
  mise_brute_lot: number;
  montant_total_relances: number;
  gain_reel: number;
  date_ouverture: string | null;
  date_cloture: string | null;
  rang_gain_dans_session: number;
};

type AnomalieSession = {
  cycle_id: string;
  session_id: string;
  session_libelle: string;
  periode_reference: string;
  ordre_session: number;
  membre_id: string;
  nom_complet: string;
  total_lots_gagnes_session: number;
  mise_brute_totale_gagnee_session: number;
  total_relances_session: number;
  gain_reel_total_session: number;
};

function formatMontant(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR");
}

function getSessionTone(totalLotsGagnes: number) {
  if (totalLotsGagnes > 1) {
    return "border-rose-200 bg-rose-50";
  }

  if (totalLotsGagnes === 1) {
    return "border-emerald-200 bg-emerald-50";
  }

  return "border-slate-200 bg-slate-50";
}

export default function TontineSuiviCyclePage() {

const [sessionsSuivi, setSessionsSuivi] = useState<any[]>([]);

useEffect(() => {
  async function loadSuiviSessions() {
    const { data, error } = await supabase
      .from("v_tontine_suivi_sessions")
      .select("*")
      .order("ordre_session", { ascending: true });

    if (!error) {
      setSessionsSuivi(data || []);
    } else {
      console.error("Erreur suivi sessions:", error);
    }
  }

  loadSuiviSessions();
}, []);

  const [cycles, setCycles] = useState<ResultatCycle[]>([]);
  const [membresSessions, setMembresSessions] = useState<ResultatMembreSession[]>([]);
  const [membresCycles, setMembresCycles] = useState<ResultatMembreCycle[]>([]);
  const [lots, setLots] = useState<ResultatLot[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalieSession[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [
          cyclesRes,
          membresSessionsRes,
          membresCyclesRes,
          lotsRes,
          anomaliesRes,
        ] = await Promise.all([
          supabase
            .from("v_tontine_resultats_cycles")
            .select("*")
            .order("cycle_id", { ascending: false }),
          supabase
            .from("v_tontine_resultats_membres_sessions")
            .select("*")
            .order("cycle_id", { ascending: false })
            .order("ordre_session", { ascending: true })
            .order("gain_reel_total_session", { ascending: false }),
          supabase
            .from("v_tontine_resultats_membres_cycles")
            .select("*")
            .order("cycle_id", { ascending: false })
            .order("gain_reel_total_cycle", { ascending: false }),
          supabase
            .from("v_tontine_resultats_lots")
            .select("*")
            .order("cycle_id", { ascending: false })
            .order("ordre_session", { ascending: true })
            .order("numero_lot", { ascending: true }),
          supabase
            .from("v_tontine_anomalies_gains_multiples_session")
            .select("*")
            .order("cycle_id", { ascending: false })
            .order("ordre_session", { ascending: true }),
        ]);

        if (cyclesRes.error) throw cyclesRes.error;
        if (membresSessionsRes.error) throw membresSessionsRes.error;
        if (membresCyclesRes.error) throw membresCyclesRes.error;
        if (lotsRes.error) throw lotsRes.error;
        if (anomaliesRes.error) throw anomaliesRes.error;

        const cyclesData = (cyclesRes.data ?? []) as ResultatCycle[];
        const membresSessionsData = (membresSessionsRes.data ?? []) as ResultatMembreSession[];
        const membresCyclesData = (membresCyclesRes.data ?? []) as ResultatMembreCycle[];
        const lotsData = (lotsRes.data ?? []) as ResultatLot[];
        const anomaliesData = (anomaliesRes.data ?? []) as AnomalieSession[];

        setCycles(cyclesData);
        setMembresSessions(membresSessionsData);
        setMembresCycles(membresCyclesData);
        setLots(lotsData);
        setAnomalies(anomaliesData);

        if (cyclesData.length > 0) {
          const firstCycleId = cyclesData[0].cycle_id;
          setSelectedCycleId((prev) => prev || firstCycleId);

          const firstSession = membresSessionsData.find((x) => x.cycle_id === firstCycleId);
          if (firstSession) {
            setSelectedSessionId((prev) => prev || firstSession.session_id);
          }
        }
      } catch (err: any) {
        console.error("Erreur suivi cycle:", err);
        setError(err?.message || "Erreur lors du chargement des résultats tontine");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const cycleActif = useMemo(
    () => cycles.find((c) => c.cycle_id === selectedCycleId) ?? null,
    [cycles, selectedCycleId]
  );

  const sessionsDuCycle = useMemo(() => {
    const seen = new Map<
      string,
      { session_id: string; session_libelle: string; ordre_session: number; periode_reference: string }
    >();

    membresSessions
      .filter((m) => m.cycle_id === selectedCycleId)
      .forEach((m) => {
        if (!seen.has(m.session_id)) {
          seen.set(m.session_id, {
            session_id: m.session_id,
            session_libelle: m.session_libelle,
            ordre_session: m.ordre_session,
            periode_reference: m.periode_reference,
          });
        }
      });

    return Array.from(seen.values()).sort((a, b) => a.ordre_session - b.ordre_session);
  }, [membresSessions, selectedCycleId]);

  useEffect(() => {
    if (!selectedCycleId) {
      setSelectedSessionId("");
      return;
    }

    const firstSession = sessionsDuCycle[0];
    if (!firstSession) {
      setSelectedSessionId("");
      return;
    }

    const hasSelected = sessionsDuCycle.some((s) => s.session_id === selectedSessionId);
    if (!hasSelected) {
      setSelectedSessionId(firstSession.session_id);
    }
  }, [selectedCycleId, sessionsDuCycle, selectedSessionId]);

  const sessionActive = useMemo(
    () => sessionsDuCycle.find((s) => s.session_id === selectedSessionId) ?? null,
    [sessionsDuCycle, selectedSessionId]
  );

  const membresSessionFiltres = useMemo(
    () =>
      membresSessions.filter(
        (m) => m.cycle_id === selectedCycleId && m.session_id === selectedSessionId
      ),
    [membresSessions, selectedCycleId, selectedSessionId]
  );

  const membresCycleFiltres = useMemo(
    () => membresCycles.filter((m) => m.cycle_id === selectedCycleId),
    [membresCycles, selectedCycleId]
  );

  const lotsSessionFiltres = useMemo(
    () => lots.filter((l) => l.cycle_id === selectedCycleId && l.session_id === selectedSessionId),
    [lots, selectedCycleId, selectedSessionId]
  );

  const anomaliesSessionFiltrees = useMemo(
    () =>
      anomalies.filter(
        (a) => a.cycle_id === selectedCycleId && a.session_id === selectedSessionId
      ),
    [anomalies, selectedCycleId, selectedSessionId]
  );

  const topGagnantSession = useMemo(
    () => membresSessionFiltres[0] ?? null,
    [membresSessionFiltres]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.20em] text-emerald-700">
            Tontine
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-emerald-950 md:text-4xl">
            Résultats session & cycle
          </h1>
          <p className="mt-3 max-w-4xl text-sm text-emerald-900/70 md:text-base">
            Vue métier complète des gagnants, gains réels, relances et contrôle strict de la règle :
            dans une session à plusieurs lots, un membre peut enchérir sur plusieurs lots mais ne peut
            gagner qu’un seul lot dans cette session.
          </p>
        </section>

        
<section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
  <h2 className="text-xl font-semibold text-emerald-950 mb-4">
    Pilotage du cycle (caisse & lots)
  </h2>

  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b text-slate-600">
          <th className="py-2">Session</th>
          <th className="py-2">Période</th>
          <th className="py-2">Caisse</th>
          <th className="py-2">Lots théoriques</th>
          <th className="py-2">Lots effectifs</th>
          <th className="py-2">Statut session</th>
          <th className="py-2">Enchères</th>
        </tr>
      </thead>
      <tbody>
        {sessionsSuivi.map((s) => (
          <tr key={s.session_id} className="border-b">
            <td className="py-2 font-semibold">#{s.ordre_session}</td>
            <td className="py-2">{s.periode_reference}</td>
            <td className="py-2 text-emerald-700 font-semibold">
              {formatMontant(s.caisse_accumulee)}
            </td>
            <td className="py-2">{s.nb_lots_theorique}</td>
            <td className="py-2">{s.nb_lots_effectif ?? 0}</td>
            <td className="py-2">{s.statut_session}</td>
            <td className="py-2">{s.statut_encheres}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>

<section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">Cycle</p>
            <p className="mt-1 text-xs text-slate-500">
              Sélection du cycle de tontine à analyser.
            </p>

            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="mt-4 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
            >
              {cycles.map((cycle) => (
                <option key={cycle.cycle_id} value={cycle.cycle_id}>
                  {cycle.cycle_id}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">Session mensuelle</p>
            <p className="mt-1 text-xs text-slate-500">
              Une session correspond à un mois de tontine avec enchères ouvertes.
            </p>

            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="mt-4 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
            >
              {sessionsDuCycle.map((session) => (
                <option key={session.session_id} value={session.session_id}>
                  Session #{session.ordre_session} — {session.session_libelle} — {session.periode_reference}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Chargement des résultats tontine...
          </section>
        ) : error ? (
          <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700 shadow-sm">
            {error}
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Sessions cycle
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {cycleActif?.total_sessions ?? 0}
                </p>
              </article>

              <article className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Lots cycle
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {cycleActif?.total_lots ?? 0}
                </p>
              </article>

              <article className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Gagnants uniques cycle
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {cycleActif?.total_gagnants_uniques ?? 0}
                </p>
              </article>

              <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Gains réels cycle
                </p>
                <p className="mt-2 text-lg font-bold text-amber-700">
                  {formatMontant(cycleActif?.gains_reels_totaux ?? 0)}
                </p>
              </article>

              <article className="rounded-[24px] border border-sky-200 bg-sky-50 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Session sélectionnée
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {sessionActive
                    ? `#${sessionActive.ordre_session} — ${sessionActive.periode_reference}`
                    : "Aucune"}
                </p>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-emerald-950">
                    Résultats par membre dans la session
                  </h2>
                  <p className="text-sm text-emerald-900/70">
                    Ici se vérifie la règle métier : un seul lot gagné maximum par membre dans la session.
                  </p>
                </div>

                {membresSessionFiltres.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
                    Aucun gagnant enregistré pour cette session.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {membresSessionFiltres.map((membre) => (
                      <article
                        key={`${membre.session_id}-${membre.membre_id}`}
                        className={`rounded-[22px] border p-4 shadow-sm ${getSessionTone(
                          membre.total_lots_gagnes_session
                        )}`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-bold text-slate-900">
                                {membre.nom_complet}
                              </p>

                              {membre.total_lots_gagnes_session === 1 ? (
                                <span className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                  Conforme
                                </span>
                              ) : null}

                              {membre.total_lots_gagnes_session > 1 ? (
                                <span className="inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                                  Anomalie
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              Lots gagnés dans la session : {membre.total_lots_gagnes_session}
                            </p>
                          </div>

                          <div className="text-left md:text-right">
                            <p className="text-lg font-bold text-emerald-700">
                              {formatMontant(membre.gain_reel_total_session)}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                              gain réel session
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">
                              Mise brute gagnée
                            </p>
                            <p className="mt-1 text-sm font-bold text-emerald-800">
                              {formatMontant(membre.mise_brute_totale_gagnee_session)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Total relances
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {formatMontant(membre.total_relances_session)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Dernière clôture
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {formatDate(membre.derniere_date_cloture_session)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-emerald-950">
                      Leader session
                    </h2>
                    <p className="text-sm text-emerald-900/70">
                      Membre avec le gain réel le plus élevé dans la session sélectionnée.
                    </p>
                  </div>

                  {!topGagnantSession ? (
                    <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
                      Aucun leader disponible pour cette session.
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Gagnant principal session
                      </p>
                      <p className="mt-2 text-xl font-bold text-emerald-950">
                        {topGagnantSession.nom_complet}
                      </p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-emerald-950">
                        {formatMontant(topGagnantSession.gain_reel_total_session)}
                      </p>
                      <p className="mt-1 text-sm text-emerald-900/70">
                        Session #{topGagnantSession.ordre_session} — {topGagnantSession.periode_reference}
                      </p>
                    </div>
                  )}
                </section>

                <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-emerald-950">
                      Contrôle métier session
                    </h2>
                    <p className="text-sm text-emerald-900/70">
                      Cette zone doit rester vide. Toute ligne ici signale plusieurs lots gagnés dans la même session.
                    </p>
                  </div>

                  {anomaliesSessionFiltrees.length === 0 ? (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center text-sm text-emerald-800">
                      Aucune anomalie sur la session. La règle est respectée.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {anomaliesSessionFiltrees.map((anomalie) => (
                        <article
                          key={`${anomalie.session_id}-${anomalie.membre_id}`}
                          className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 shadow-sm"
                        >
                          <p className="text-base font-bold text-rose-700">
                            {anomalie.nom_complet}
                          </p>
                          <p className="mt-1 text-sm text-rose-700">
                            Lots gagnés détectés : {anomalie.total_lots_gagnes_session}
                          </p>
                          <p className="mt-2 text-sm text-rose-700">
                            Gain réel session : {formatMontant(anomalie.gain_reel_total_session)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </section>

            <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-emerald-950">
                  Détail des lots gagnés dans la session
                </h2>
                <p className="text-sm text-emerald-900/70">
                  Visualisation détaillée des lots attribués pour le mois sélectionné.
                </p>
              </div>

              {lotsSessionFiltres.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
                  Aucun lot gagné à afficher pour cette session.
                </div>
              ) : (
                <div className="space-y-3">
                  {lotsSessionFiltres.map((lot) => (
                    <article
                      key={lot.lot_id}
                      className="rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-bold text-slate-900">
                              {lot.session_libelle} — {lot.lot_libelle}
                            </p>
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              Rang gagnant session : {lot.rang_gain_dans_session}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            Session #{lot.ordre_session} • Période {lot.periode_reference}
                          </p>
                          <p className="mt-1 text-sm text-emerald-700">
                            Gagnant : <span className="font-semibold">{lot.nom_complet}</span>
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-lg font-bold text-amber-700">
                            {formatMontant(lot.gain_reel)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                            gain réel
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Départ
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatMontant(lot.montant_depart_enchere)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Mise brute
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatMontant(lot.mise_brute_lot)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Relances
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatMontant(lot.montant_total_relances)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Clôture
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatDate(lot.date_cloture)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-emerald-950">
                  Synthèse globale du cycle
                </h2>
                <p className="text-sm text-emerald-900/70">
                  Vue consolidée sur tout le cycle, sans changer la règle métier qui reste appliquée à la session.
                </p>
              </div>

              {membresCycleFiltres.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
                  Aucun résultat cycle à afficher.
                </div>
              ) : (
                <div className="space-y-3">
                  {membresCycleFiltres.map((membre) => (
                    <article
                      key={`${membre.cycle_id}-${membre.membre_id}`}
                      className="rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-base font-bold text-slate-900">
                            {membre.nom_complet}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Sessions gagnées : {membre.total_sessions_gagnees_cycle} • Lots gagnés cycle : {membre.total_lots_gagnes_cycle}
                          </p>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-lg font-bold text-emerald-700">
                            {formatMontant(membre.gain_reel_total_cycle)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                            gain réel cycle
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-emerald-700">
                            Mise brute gagnée
                          </p>
                          <p className="mt-1 text-sm font-bold text-emerald-800">
                            {formatMontant(membre.mise_brute_totale_gagnee_cycle)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Relances cycle
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatMontant(membre.total_relances_cycle)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Première session
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {membre.premiere_session_gagnee ?? "—"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Dernière clôture
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatDate(membre.derniere_date_cloture)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

