"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Session = {
  id: string;
  libelle: string;
  periode: string;
  ordre_session: number;
  statut_session: string;
  nombre_lots: number;
  date_debut_encheres?: string | null;
  duree_par_lot_minutes?: number | null;
  lot_en_cours_index?: number | null;
  statut_encheres?: string | null;
  montant_depart_enchere_session?: number | null;
  derniere_enchere_at?: string | null;
};

type Lot = {
  id: string;
  session_id: string;
  periode: string;
  lot: number;
  libelle: string | null;
  montant_depart_enchere: number;
  mise_brute_lot: number;
  statut_lot: string;
  gagnant: string | null;
  montant_total_relances: number;
  gain_reel: number;
};

type Enchere = {
  id: string;
  lot_id: string;
  nom_complet: string;
  montant_total_offert: number;
  montant_relance: number;
  rang: number | null;
  statut: string;
};

function formatMontant(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Non démarré";
  return new Date(value).toLocaleString("fr-FR");
}

function getBadgeClass(value?: string | null) {
  const statut = String(value || "").toUpperCase();

  if (statut === "EN_COURS" || statut === "OUVERTE" || statut === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (statut === "TERMINE" || statut === "CLOTUREE" || statut === "CLÔTURÉE") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  if (statut === "PLANIFIEE" || statut === "PLANIFIÉE") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatCountdown(ms: number | null) {
  if (ms === null) return "Non démarré";
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function secondsSince(dateIso?: string | null) {
  if (!dateIso) return null;
  const diffMs = Date.now() - new Date(dateIso).getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

export default function EncheresPage() {
  const { member, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [encheres, setEncheres] = useState<Enchere[]>([]);
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingEncheres, setLoadingEncheres] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [autoClosing, setAutoClosing] = useState(false);

  const [lotBidValues, setLotBidValues] = useState<Record<string, string>>({});
  const [nowMs, setNowMs] = useState(Date.now());
  const [lastClassementUpdateAt, setLastClassementUpdateAt] = useState<string | null>(null);

  const loadSessions = async (silent = false) => {
    if (!silent) {
      setLoadingSessions(true);
    }

    try {
      const res = await fetch("/api/tontine/sessions");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement sessions:", err);
      if (!silent) {
        setSessions([]);
      }
    } finally {
      if (!silent) {
        setLoadingSessions(false);
      }
    }
  };

  const sessionActive =
    sessions.find(
      (s) =>
        (s.statut_session === "EN_COURS" || s.statut_session === "OUVERTE") &&
        s.statut_encheres !== "TERMINE"
    ) || null;

  const loadLots = async (sessionId?: string | null, silent = false) => {
    if (!sessionId) {
      setLots([]);
      return;
    }

    if (!silent) {
      setLoadingLots(true);
    }

    try {
      const res = await fetch(`/api/tontine/lots?session_id=${sessionId}`);
      const data = await res.json();
      setLots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement lots:", err);
      if (!silent) {
        setLots([]);
      }
    } finally {
      if (!silent) {
        setLoadingLots(false);
      }
    }
  };

  const loadEncheres = async (lotId: string, silent = false) => {
    if (!silent) {
      setLoadingEncheres(true);
    }

    try {
      const res = await fetch(`/api/tontine/encheres?lot_id=${lotId}`);
      const data = await res.json();
      setEncheres(Array.isArray(data) ? data : []);
      setSelectedLot(lotId);
      setLastClassementUpdateAt(new Date().toISOString());
    } catch (err) {
      console.error("Erreur chargement enchères:", err);
      if (!silent) {
        setEncheres([]);
      }
      setSelectedLot(lotId);
    } finally {
      if (!silent) {
        setLoadingEncheres(false);
      }
    }
  };

  useEffect(() => {
    loadSessions(false);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelectedLot(null);
    setEncheres([]);
    setLotBidValues({});
    setLastClassementUpdateAt(null);
    setAutoClosing(false);
  }, [sessionActive?.id]);

  useEffect(() => {
    loadLots(sessionActive?.id, false);
  }, [sessionActive?.id]);

  useEffect(() => {
    if (!sessionActive?.id) return;
    if (sessionActive.statut_encheres !== "EN_COURS") return;

    const intervalId = window.setInterval(() => {
      loadSessions(true);
      loadLots(sessionActive.id, true);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [sessionActive?.id, sessionActive?.statut_encheres]);

  useEffect(() => {
    if (!selectedLot) return;
    if (sessionActive?.statut_encheres !== "EN_COURS") return;

    const intervalId = window.setInterval(() => {
      loadEncheres(selectedLot, true);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [selectedLot, sessionActive?.statut_encheres]);

  const referenceTimerAt = useMemo(() => {
    return sessionActive?.derniere_enchere_at || sessionActive?.date_debut_encheres || null;
  }, [sessionActive?.derniere_enchere_at, sessionActive?.date_debut_encheres]);

  const inactivityLimitMs = useMemo(() => {
    if (!sessionActive?.duree_par_lot_minutes) return null;
    return Number(sessionActive.duree_par_lot_minutes) * 60 * 1000;
  }, [sessionActive?.duree_par_lot_minutes]);

  const remainingMs = useMemo(() => {
    if (!referenceTimerAt || inactivityLimitMs === null) return null;
    const elapsed = nowMs - new Date(referenceTimerAt).getTime();
    return Math.max(0, inactivityLimitMs - elapsed);
  }, [referenceTimerAt, inactivityLimitMs, nowMs]);

  const timerText = useMemo(() => formatCountdown(remainingMs), [remainingMs]);
  const liveAgeSeconds = useMemo(() => secondsSince(lastClassementUpdateAt), [lastClassementUpdateAt, nowMs]);

  useEffect(() => {
    const autoCloseSession = async () => {
      if (!sessionActive?.id) return;
      if (sessionActive.statut_encheres !== "EN_COURS") return;
      if (remainingMs === null) return;
      if (remainingMs > 0) return;
      if (autoClosing) return;

      setAutoClosing(true);

      try {
        const res = await fetch("/api/tontine/close-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionActive.id,
          }),
        });

        const data = await res.json();

        if (!res.ok || data?.error) {
          alert(data?.error || "Erreur clôture automatique de la session");
          setAutoClosing(false);
          return;
        }

        await loadSessions(true);
        await loadLots(sessionActive.id, true);
        if (selectedLot) {
          await loadEncheres(selectedLot, true);
        }
        alert("Le délai sans nouvelle enchère est dépassé. La session a été clôturée automatiquement.");
      } catch (err) {
        console.error(err);
        alert("Erreur clôture automatique de la session");
        setAutoClosing(false);
      }
    };

    autoCloseSession();
  }, [remainingMs, sessionActive?.id, sessionActive?.statut_encheres, autoClosing, selectedLot]);

  const updateLotBidValue = (lotId: string, value: string) => {
    setLotBidValues((prev) => ({
      ...prev,
      [lotId]: value,
    }));
  };

  const incrementLotBidValue = (lotId: string, increment: number) => {
    const current = Number(lotBidValues[lotId] || 0);
    setLotBidValues((prev) => ({
      ...prev,
      [lotId]: String(current + increment),
    }));
  };

  const encherirSurLot = async (lotId: string) => {
    try {
      if (authLoading) {
        alert("Chargement utilisateur en cours...");
        return;
      }

      if (!member?.id) {
        alert("Membre connecté introuvable.");
        return;
      }

      if (!sessionActive?.id || sessionActive.statut_encheres !== "EN_COURS") {
        alert("Les enchères ne sont pas en cours.");
        return;
      }

      const lot = lots.find((item) => item.id === lotId);
      const montantRelance = Number(lotBidValues[lotId] || 0);

      if (!lot) {
        alert("Lot introuvable.");
        return;
      }

      if (!montantRelance || montantRelance <= 0) {
        alert("Saisis un montant de renchérissement supérieur à 0 FCFA.");
        return;
      }

      if (montantRelance < 500) {
        alert("Le renchérissement minimum est de 500 FCFA.");
        return;
      }

      setActionLoading(true);

      const res = await fetch("/api/tontine/encheres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lot_id: lotId,
          membre_id: member.id,
          montant_relance: montantRelance,
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.error) {
        alert(data?.error || "Erreur création enchère");
        return;
      }

      updateLotBidValue(lotId, "");
      await loadSessions(true);
      await loadLots(sessionActive.id, true);
      await loadEncheres(lotId, true);
    } catch (err) {
      console.error(err);
      alert("Erreur création enchère");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-emerald-950 md:text-4xl">
                Enchères
              </h1>
              <p className="mt-2 text-sm text-emerald-900/70 md:text-base">
                Salle d’enchères utilisateur : session active, lots actifs, renchérissement et classement live.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
              Salle d’enchères
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-emerald-950">Session active</h2>
            <p className="text-sm text-emerald-900/70">
              Toutes les enchères en cours se pilotent désormais depuis cette page.
            </p>
          </div>

          {!sessionActive ? (
            <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
              Aucune session active.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
                <p className="text-sm text-emerald-900/65">Session</p>
                <p className="mt-1 text-base font-semibold text-emerald-950">{sessionActive.libelle}</p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
                <p className="text-sm text-emerald-900/65">Période</p>
                <p className="mt-1 text-base font-semibold text-emerald-950">{sessionActive.periode}</p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
                <p className="text-sm text-emerald-900/65">Départ minimum</p>
                <p className="mt-1 text-base font-semibold text-emerald-950">
                  {formatMontant(sessionActive.montant_depart_enchere_session)}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
                <p className="text-sm text-emerald-900/65">Dernière enchère</p>
                <p className="mt-1 text-base font-semibold text-emerald-950">
                  {formatDateTime(sessionActive.derniere_enchere_at || sessionActive.date_debut_encheres)}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm ring-1 ring-emerald-100">
                <p className="text-sm text-emerald-900/65">Timer global</p>
                <p className="mt-1 text-2xl font-bold text-emerald-950">{timerText}</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-emerald-950">Lots de la session active</h2>
            <p className="text-sm text-emerald-900/70">
              Tous les lots mis aux enchères apparaissent exclusivement ici.
            </p>
          </div>

          {!sessionActive ? (
            <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
              Aucune session active pour afficher des lots.
            </div>
          ) : loadingLots ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 px-6 py-8 text-sm text-emerald-900/70">
              Chargement des lots...
            </div>
          ) : lots.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
              Aucun lot trouvé pour cette session.
            </div>
          ) : (
            <div className="space-y-4">
              {lots.map((lot) => (
                <div
                  key={lot.id}
                  className={
                    selectedLot === lot.id
                      ? "rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm ring-2 ring-emerald-200"
                      : "rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"
                  }
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-bold text-emerald-950">
                        Lot {lot.lot}{lot.libelle ? ` — ${lot.libelle}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-emerald-900/65">Session : {lot.periode}</p>
                    </div>

                    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getBadgeClass(lot.statut_lot)}`}>
                      {lot.statut_lot}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <p className="text-sm text-emerald-900/65">Départ enchère</p>
                      <p className="mt-1 text-base font-semibold text-emerald-950">
                        {formatMontant(lot.montant_depart_enchere)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <p className="text-sm text-emerald-900/65">Mise brute</p>
                      <p className="mt-1 text-base font-semibold text-emerald-950">
                        {formatMontant(lot.mise_brute_lot)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <p className="text-sm text-emerald-900/65">Total relances</p>
                      <p className="mt-1 text-base font-semibold text-emerald-950">
                        {formatMontant(lot.montant_total_relances)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <p className="text-sm text-emerald-900/65">Montant net</p>
                      <p className="mt-1 text-base font-semibold text-emerald-950">
                        {formatMontant(lot.gain_reel)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => loadEncheres(lot.id)}
                      className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                    >
                      Voir enchères
                    </button>
                  </div>

                  {sessionActive.statut_encheres === "EN_COURS" && (
                    <div className="mt-4 rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm">
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-emerald-950">Renchérir sur ce lot</h3>
                        <p className="text-sm text-emerald-900/70">
                          Le montant saisi est un ajout au meilleur total actuel. Exemple : départ 5000 + ajout 500 = total 5500 FCFA.
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <input
                          type="number"
                          min={500}
                          step={500}
                          value={lotBidValues[lot.id] ?? ""}
                          onChange={(e) => updateLotBidValue(lot.id, e.target.value)}
                          placeholder="Montant d'ajout"
                          className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => encherirSurLot(lot.id)}
                          disabled={actionLoading || authLoading || !member?.id}
                          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {actionLoading ? "Traitement..." : "Enchérir sur ce lot"}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => incrementLotBidValue(lot.id, 500)}
                          className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm"
                        >
                          +500 FCFA
                        </button>
                        <button
                          type="button"
                          onClick={() => incrementLotBidValue(lot.id, 1000)}
                          className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm"
                        >
                          +1000 FCFA
                        </button>
                      </div>
                    </div>
                  )}

                  {lot.gagnant ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900">
                      <span className="font-medium text-emerald-800">Gagnant : </span>
                      <strong>{lot.gagnant}</strong>
                    </div>
                  ) : null}

                  {selectedLot === lot.id && (
                    <div className="mt-5 border-t border-emerald-100 pt-5">
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-emerald-950">Classement enchères</h3>
                          <p className="text-sm text-emerald-900/70">
                            Classement live du lot sélectionné.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                            Live
                          </span>
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                            {liveAgeSeconds === null ? "Mise à jour en attente" : `Dernière mise à jour il y a ${liveAgeSeconds}s`}
                          </span>
                        </div>
                      </div>

                      {loadingEncheres ? (
                        <p className="text-sm text-emerald-900/70">Chargement des enchères...</p>
                      ) : encheres.length === 0 ? (
                        <p className="text-sm text-emerald-900/70">Aucune enchère.</p>
                      ) : (
                        <div className="space-y-3">
                          {encheres.map((e, index) => {
                            const isLeader = index === 0;
                            return (
                              <div
                                key={e.id}
                                className={
                                  isLeader
                                    ? "rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm ring-2 ring-emerald-200"
                                    : "rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
                                }
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="min-w-0">
                                    {isLeader && (
                                      <span className="mb-2 inline-flex rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                                        Leader actuel
                                      </span>
                                    )}

                                    <p className={isLeader ? "text-lg font-bold text-emerald-950" : "text-base font-semibold text-emerald-950"}>
                                      #{e.rang ?? index + 1} — {e.nom_complet}
                                    </p>

                                    <p className="mt-1 text-sm text-emerald-900/65">
                                      Ajout : {formatMontant(e.montant_relance)}
                                    </p>
                                  </div>

                                  <div className="text-left md:text-right">
                                    <p className={isLeader ? "text-2xl font-extrabold tracking-tight text-emerald-950" : "text-xl font-bold text-emerald-950"}>
                                      {formatMontant(e.montant_total_offert)}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">Statut : {e.statut}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
