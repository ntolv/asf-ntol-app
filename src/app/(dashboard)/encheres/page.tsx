"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type SessionRow = {
  id: string;
  cycle_id?: string | null;
  ordre_session?: number | null;
  libelle?: string | null;
  periode_reference?: string | null;
  statut_session?: string | null;
  statut_encheres?: string | null;
  date_debut_encheres?: string | null;
  duree_par_lot_minutes?: number | null;
  lot_en_cours_index?: number | null;
  montant_depart_enchere_session?: number | string | null;
  mise_brute_session?: number | string | null;
  nb_lots_effectif?: number | string | null;
  [key: string]: unknown;
};

type LotRow = {
  id: string;
  session_id?: string | null;
  numero_lot?: number | null;
  libelle?: string | null;
  statut_lot?: string | null;
  montant_depart_enchere?: number | string | null;
  montant_total_relances?: number | string | null;
  mise_brute_lot?: number | string | null;
  gain_reel?: number | string | null;
  date_ouverture?: string | null;
  date_cloture?: string | null;
  [key: string]: unknown;
};

type EnchereRow = {
  id: string;
  lot_id?: string | null;
  membre_id?: string | null;
  membre_nom?: string | null;
  nom_complet?: string | null;
  montant_total_offert?: number | string | null;
  montant_relance?: number | string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

const BID_STEPS = [500, 1000, 2000];

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function formatMoney(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("fr-FR").format(num) + " FCFA";
}

function formatDateTime(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function readRows<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.lots)) return payload.lots as T[];
  if (Array.isArray(payload?.encheres)) return payload.encheres as T[];
  if (Array.isArray(payload?.sessions)) return payload.sessions as T[];
  return [];
}

function getSessionLabel(session: SessionRow | null) {
  if (!session) return "Aucune session active";
  const base = session.libelle || `Session ${session.ordre_session ?? "-"}`;
  const periode = session.periode_reference ? ` â€” ${session.periode_reference}` : "";
  return `${base}${periode}`;
}

function computeRemainingSeconds(session: SessionRow | null, lots: LotRow[]) {
  if (!session) return 0;
  const status = normalizeStatus(session.statut_encheres);
  if (status !== "EN_COURS") return 0;

  const startedAtRaw =
    String(session.date_debut_encheres ?? "").trim() ||
    String(
      lots.find((lot) => normalizeStatus(lot.statut_lot) === "EN_COURS")?.date_ouverture ?? ""
    ).trim();

  const durationMinutes = Number(session.duree_par_lot_minutes ?? 0);
  if (!startedAtRaw || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;

  const startedAt = new Date(startedAtRaw).getTime();
  if (Number.isNaN(startedAt)) return 0;

  const totalMs = durationMinutes * 60 * 1000;
  const elapsedMs = Date.now() - startedAt;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  return Math.floor(remainingMs / 1000);
}

function formatCountdown(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function EncheresPage() {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>("");
  const [encheres, setEncheres] = useState<EnchereRow[]>([]);

  const [messages, setMessages] = useState({ success: "", error: "" });
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [postingBid, setPostingBid] = useState(false);
  const [bidValues, setBidValues] = useState<Record<string, string>>({});
  const [countdown, setCountdown] = useState(0);
  const autoCloseLock = useRef(false);

  async function readJsonSafe(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function loadSessions() {
    const res = await fetch("/api/tontine/sessions", { cache: "no-store" });
    const json = await readJsonSafe(res);
    if (!res.ok) {
      throw new Error(json?.error || "Impossible de charger les sessions.");
    }
    const rows = readRows<SessionRow>(json);
    setSessions(rows);
    return rows;
  }

  async function loadLots(sessionId: string) {
    const res = await fetch(`/api/tontine/lots?session_id=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    });
    const json = await readJsonSafe(res);
    if (!res.ok) {
      throw new Error(json?.error || "Impossible de charger les lots.");
    }
    const rows = readRows<LotRow>(json);
    setLots(rows);

    setSelectedLotId((current) => {
      if (current && rows.some((lot) => lot.id === current)) return current;
      const currentLot = rows.find((lot) => normalizeStatus(lot.statut_lot) === "EN_COURS");
      return currentLot?.id ?? rows[0]?.id ?? "";
    });

    return rows;
  }

  async function loadEncheres(lotId: string) {
    if (!lotId) {
      setEncheres([]);
      return;
    }

    const res = await fetch(`/api/tontine/encheres?lot_id=${encodeURIComponent(lotId)}`, {
      cache: "no-store",
    });
    const json = await readJsonSafe(res);
    if (!res.ok) {
      setEncheres([]);
      return;
    }

    setEncheres(readRows<EnchereRow>(json));
  }

  const sessionActive = useMemo(() => {
    return (
      sessions.find((session) => {
        const statutSession = normalizeStatus(session.statut_session);
        const statutEncheres = normalizeStatus(session.statut_encheres);
        return statutSession === "EN_COURS" && (statutEncheres === "PLANIFIEE" || statutEncheres === "EN_COURS");
      }) ?? null
    );
  }, [sessions]);

  const selectedLot = useMemo(() => {
    return lots.find((lot) => lot.id === selectedLotId) ?? null;
  }, [lots, selectedLotId]);

  const currentLot = useMemo(() => {
    return lots.find((lot) => normalizeStatus(lot.statut_lot) === "EN_COURS") ?? selectedLot ?? null;
  }, [lots, selectedLot]);

  const sessionReadyToStart = !!sessionActive && normalizeStatus(sessionActive.statut_encheres) === "PLANIFIEE";
  const encheresRunning = !!sessionActive && normalizeStatus(sessionActive.statut_encheres) === "EN_COURS";

  async function reloadAll() {
    setLoading(true);
    setMessages({ success: "", error: "" });

    try {
      const sessionRows = await loadSessions();
      const active =
        sessionRows.find((session) => {
          const statutSession = normalizeStatus(session.statut_session);
          const statutEncheres = normalizeStatus(session.statut_encheres);
          return statutSession === "EN_COURS" && (statutEncheres === "PLANIFIEE" || statutEncheres === "EN_COURS");
        }) ?? null;

      if (active?.id) {
        const lotRows = await loadLots(active.id);
        const chosenLotId =
          lotRows.find((lot) => normalizeStatus(lot.statut_lot) === "EN_COURS")?.id ??
          lotRows[0]?.id ??
          "";
        if (chosenLotId) {
          await loadEncheres(chosenLotId);
        } else {
          setEncheres([]);
        }
      } else {
        setLots([]);
        setEncheres([]);
        setSelectedLotId("");
      }
    } catch (err) {
      setMessages({
        success: "",
        error: err instanceof Error ? err.message : "Erreur de chargement.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadAll();
  }, [refreshKey]);

  useEffect(() => {
    void loadEncheres(selectedLotId);
  }, [selectedLotId]);

  useEffect(() => {
    const remaining = computeRemainingSeconds(sessionActive, lots);
    setCountdown(remaining);

    if (!encheresRunning) return;

    const interval = window.setInterval(() => {
      const nextRemaining = computeRemainingSeconds(sessionActive, lots);
      setCountdown(nextRemaining);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [sessionActive, lots, encheresRunning]);

  useEffect(() => {
    if (!encheresRunning || !sessionActive?.id) return;
    if (countdown > 0) return;
    if (autoCloseLock.current) return;

    autoCloseLock.current = true;
    void handleCloseSession(true);
  }, [countdown, encheresRunning, sessionActive?.id]);

  function getCurrentBidValue(lotId: string) {
    return bidValues[lotId] ?? "";
  }

  function setCurrentBidValue(lotId: string, value: string) {
    setBidValues((prev) => ({ ...prev, [lotId]: value }));
  }

  function incrementLotBidValue(lotId: string, increment: number) {
    const current = Number(getCurrentBidValue(lotId) || 0);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    setCurrentBidValue(lotId, String(safeCurrent + increment));
  }

  async function handleStartEncheres() {
    if (!sessionActive?.id) {
      setMessages({ success: "", error: "Aucune session active Ã  dÃ©marrer." });
      return;
    }

    setStarting(true);
    setMessages({ success: "", error: "" });

    try {
      const res = await fetch("/api/tontine/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionActive.id }),
      });

      const json = await readJsonSafe(res);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || "Impossible de dÃ©marrer les enchÃ¨res.");
      }

      autoCloseLock.current = false;
      setMessages({
        success: "Top dÃ©part chrono lancÃ© avec succÃ¨s.",
        error: "",
      });
      setRefreshKey((v) => v + 1);
    } catch (err) {
      setMessages({
        success: "",
        error: err instanceof Error ? err.message : "Erreur pendant le dÃ©marrage des enchÃ¨res.",
      });
    } finally {
      setStarting(false);
    }
  }

  async function handleCloseSession(fromTimer = false) {
    if (!sessionActive?.id) {
      setMessages({ success: "", error: "Aucune session active Ã  clÃ´turer." });
      autoCloseLock.current = false;
      return;
    }

    setClosing(true);
    if (!fromTimer) {
      setMessages({ success: "", error: "" });
    }

    try {
      const res = await fetch("/api/tontine/close-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionActive.id }),
      });

      const json = await readJsonSafe(res);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || "Impossible de clÃ´turer la session.");
      }

      setMessages({
        success: fromTimer
          ? "Le chrono est arrivÃ© Ã  zÃ©ro. La clÃ´ture globale a Ã©tÃ© dÃ©clenchÃ©e."
          : "Session clÃ´turÃ©e avec succÃ¨s.",
        error: "",
      });
      setRefreshKey((v) => v + 1);
    } catch (err) {
      setMessages({
        success: "",
        error: err instanceof Error ? err.message : "Erreur pendant la clÃ´ture de la session.",
      });
    } finally {
      setClosing(false);
      autoCloseLock.current = false;
    }
  }

  async function handleSubmitBid(lotId: string) {
    if (!sessionActive?.id) {
      setMessages({ success: "", error: "Aucune session active." });
      return;
    }

    const montantRelance = Number(getCurrentBidValue(lotId));
    if (!Number.isFinite(montantRelance) || montantRelance < 500) {
      setMessages({
        success: "",
        error: "Le renchÃ©rissement minimum est de 500 FCFA.",
      });
      return;
    }

    setPostingBid(true);
    setMessages({ success: "", error: "" });

    try {
      const res = await fetch("/api/tontine/encheres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionActive.id,
          lot_id: lotId,
          montant_relance: montantRelance,
        }),
      });

      const json = await readJsonSafe(res);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || "Impossible d'enregistrer l'enchÃ¨re.");
      }

      setCurrentBidValue(lotId, "");
      setMessages({
        success: "EnchÃ¨re enregistrÃ©e avec succÃ¨s.",
        error: "",
      });

      await loadLots(sessionActive.id);
      await loadEncheres(lotId);
    } catch (err) {
      setMessages({
        success: "",
        error: err instanceof Error ? err.message : "Erreur pendant l'enchÃ¨re.",
      });
    } finally {
      setPostingBid(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 xl:px-8">
        <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                EnchÃ¨res
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                ExÃ©cution rÃ©elle des enchÃ¨res
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Cette page pilote uniquement l'exÃ©cution rÃ©elle : chargement de la session active,
                top dÃ©part du chrono, enchÃ¨res et clÃ´ture globale.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey((v) => v + 1)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                Actualiser
              </button>

              <Link
                href="/tontine"
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Retour Ã  la page Tontine
              </Link>
            </div>
          </div>

          {(messages.success || messages.error) && (
            <div className="mt-4">
              {messages.success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {messages.success}
                </div>
              ) : null}
              {messages.error ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {messages.error}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Session active
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
              {getSessionLabel(sessionActive)}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Statut session
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {sessionActive ? normalizeStatus(sessionActive.statut_session) : "-"}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Statut enchÃ¨res
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {sessionActive ? normalizeStatus(sessionActive.statut_encheres) : "-"}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  DÃ©marrage enchÃ¨res
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {formatDateTime(sessionActive?.date_debut_encheres)}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  DurÃ©e par lot
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {Number(sessionActive?.duree_par_lot_minutes ?? 0) > 0
                    ? `${sessionActive?.duree_par_lot_minutes} min`
                    : "-"}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Mise brute session
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {formatMoney(sessionActive?.mise_brute_session)}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Montant départ enchères
                </p>
                <p className="mt-2 text-base font-black text-slate-900">
                  {formatMoney(sessionActive?.montant_depart_enchere_session)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStartEncheres}
                disabled={!sessionReadyToStart || starting || loading}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? "DÃ©marrage..." : "Top dÃ©part chrono"}
              </button>

              <button
                type="button"
                onClick={() => void handleCloseSession(false)}
                disabled={!encheresRunning || closing || loading}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {closing ? "ClÃ´ture..." : "ClÃ´turer globalement"}
              </button>
            </div>

            <p className="mt-3 text-xs leading-6 text-slate-500">
              Le bouton <span className="font-semibold text-slate-700">Top dÃ©part chrono</span> reprend
              le rÃ´le de l'ancien dÃ©marrage global. Cette page ne crÃ©e aucune session.
            </p>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Chrono global
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
              {encheresRunning ? "EnchÃ¨res en cours" : "En attente de dÃ©marrage"}
            </h2>

            <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Temps restant
              </p>
              <p className="mt-3 text-5xl font-black tracking-tight text-slate-900">
                {formatCountdown(countdown)}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Le chrono affichÃ© est une visualisation frontend. La clÃ´ture effective doit rester
                validÃ©e par le backend.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Lots chargÃ©s
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">{lots.length}</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Lot en cours
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {currentLot?.numero_lot ?? "-"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Lots
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                Lots de la session active
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Les lots affichÃ©s ici doivent venir uniquement du backend.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Session : <span className="font-bold text-slate-900">{getSessionLabel(sessionActive)}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Chargement...
              </div>
            ) : lots.length === 0 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Aucun lot disponible pour la session active.
              </div>
            ) : (
              lots.map((lot) => {
                const isSelected = selectedLotId === lot.id;
                const lotStatus = normalizeStatus(lot.statut_lot);
                const currentValue = getCurrentBidValue(lot.id);

                return (
                  <article
                    key={lot.id}
                    className={`rounded-[24px] border p-5 transition ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50/70 shadow-sm"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Lot {lot.numero_lot ?? "-"}
                        </p>
                        <h3 className="mt-2 text-lg font-black text-slate-900">
                          {lot.libelle || `Lot ${lot.numero_lot ?? "-"}`}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedLotId(lot.id)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                      >
                        Voir dÃ©tails
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-700">Statut</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                          {lotStatus || "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-700">Mise brute lot</span>
                        <span className="text-sm text-slate-900">{formatMoney(lot.mise_brute_lot)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-700">Montant dÃ©part</span>
                        <span className="text-sm text-slate-900">{formatMoney(lot.montant_depart_enchere)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-700">Relances</span>
                        <span className="text-sm text-slate-900">{formatMoney(lot.montant_total_relances)}</span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        {BID_STEPS.map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => incrementLotBidValue(lot.id, step)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                          >
                            +{new Intl.NumberFormat("fr-FR").format(step)} FCFA
                          </button>
                        ))}
                      </div>

                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">Montant de relance</span>
                        <input
                          type="number"
                          min="500"
                          step="500"
                          value={currentValue}
                          onChange={(e) => setCurrentBidValue(lot.id, e.target.value)}
                          className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400"
                          placeholder="500"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void handleSubmitBid(lot.id)}
                        disabled={!encheresRunning || postingBid}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {postingBid ? "Enregistrement..." : "EnchÃ©rir sur ce lot"}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Classement live
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
              EnchÃ¨res du lot sÃ©lectionnÃ©
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Les donnÃ©es ci-dessous sont rafraÃ®chies depuis le backend pour le lot ciblÃ©.
            </p>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Lot sÃ©lectionnÃ© :{" "}
              <span className="text-slate-900">
                {selectedLot?.libelle || (selectedLot ? `Lot ${selectedLot.numero_lot ?? "-"}` : "-")}
              </span>
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Membre</th>
                  <th className="px-3 py-3 font-semibold">Montant total offert</th>
                  <th className="px-3 py-3 font-semibold">Relance</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {encheres.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Aucune enchÃ¨re pour ce lot.
                    </td>
                  </tr>
                ) : (
                  encheres.map((enchere, index) => (
                    <tr key={enchere.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-4 font-semibold text-slate-900">{index + 1}</td>
                      <td className="px-3 py-4 text-slate-700">
                        {enchere.nom_complet || enchere.membre_nom || "-"}
                      </td>
                      <td className="px-3 py-4 text-slate-700">
                        {formatMoney(enchere.montant_total_offert)}
                      </td>
                      <td className="px-3 py-4 text-slate-700">
                        {formatMoney(enchere.montant_relance)}
                      </td>
                      <td className="px-3 py-4 text-slate-700">
                        {formatDateTime(enchere.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}