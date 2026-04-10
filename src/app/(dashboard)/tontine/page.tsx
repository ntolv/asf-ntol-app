"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CycleParams = {
  id?: string;
  annee_cycle?: number | string | null;
  libelle_cycle?: string | null;
  montant_fixe_par_tontineur?: number | string | null;
  nb_tontineurs_inscrits?: number | string | null;
  date_debut_cycle?: string | null;
  date_fin_cycle?: string | null;
  mise_brute_cycle?: number | string | null;
  fichier_suivi_url?: string | null;
  [key: string]: unknown;
};

type SessionRow = {
  id: string;
  cycle_id?: string | null;
  ordre_session?: number | null;
  libelle?: string | null;
  periode_reference?: string | null;
  statut_session?: string | null;
  statut_encheres?: string | null;
  mise_brute_session?: number | string | null;
  mise_brute_cycle?: number | string | null;
  nb_lots_effectif?: number | null;
  montant_depart_enchere_session?: number | string | null;
  cumul_caisse?: number | string | null;
  [key: string]: unknown;
};

type GagnantRow = {
  id?: string;
  membre_nom?: string | null;
  nom_complet?: string | null;
  lot_libelle?: string | null;
  lot_numero?: number | null;
  montant_enchere?: number | string | null;
  gain_reel?: number | string | null;
  [key: string]: unknown;
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: "Planifiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
};

function normalizeStatus(value: unknown): "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "AUTRE" {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "PLANIFIEE") return "PLANIFIEE";
  if (raw === "EN_COURS") return "EN_COURS";
  if (raw === "TERMINEE") return "TERMINEE";
  return "AUTRE";
}

function formatStatus(value: unknown) {
  const normalized = normalizeStatus(value);
  return STATUS_LABELS[normalized] ?? String(value ?? "-");
}

function formatMoney(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("fr-FR").format(num) + " FCFA";
}

function formatDateInput(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function extractRows<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.sessions)) return payload.sessions as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  return [];
}

function extractObject<T>(payload: any): T | null {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data as T;
  if (!Array.isArray(payload)) return payload as T;
  return null;
}

export default function TontinePage() {
  const [loading, setLoading] = useState(true);
  const [savingCycle, setSavingCycle] = useState(false);
  const [activatingSession, setActivatingSession] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [cycleParams, setCycleParams] = useState<CycleParams | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionsPlanifiees, setSessionsPlanifiees] = useState<SessionRow[]>([]);
  const [gagnants, setGagnants] = useState<GagnantRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const [form, setForm] = useState({
    annee_cycle: "",
    libelle_cycle: "",
    montant_fixe_par_tontineur: "",
    date_debut_cycle: "",
    date_fin_cycle: "",
  });

  async function readJsonSafe(response: Response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function loadCycleParams() {
    const res = await fetch("/api/tontine/cycle-parametres", { cache: "no-store" });
    const json = await readJsonSafe(res);

    if (!res.ok) {
      throw new Error(json?.error || "Impossible de charger les paramètres du cycle.");
    }

    const payload = extractObject<CycleParams>(json) ?? null;
    setCycleParams(payload);

    setForm({
      annee_cycle: payload?.annee_cycle ? String(payload.annee_cycle) : "",
      libelle_cycle: payload?.libelle_cycle ? String(payload.libelle_cycle) : "",
      montant_fixe_par_tontineur: payload?.montant_fixe_par_tontineur
        ? String(payload.montant_fixe_par_tontineur)
        : "",
      date_debut_cycle: formatDateInput(payload?.date_debut_cycle as string | null | undefined),
      date_fin_cycle: formatDateInput(payload?.date_fin_cycle as string | null | undefined),
    });

    return payload;
  }

  async function loadSessions() {
    const res = await fetch("/api/tontine/sessions", { cache: "no-store" });
    const json = await readJsonSafe(res);

    if (!res.ok) {
      throw new Error(json?.error || "Impossible de charger les sessions.");
    }

    setSessions(extractRows<SessionRow>(json));
  }

  async function loadSessionsPlanifiees() {
    const res = await fetch("/api/tontine/sessions-planifiees", { cache: "no-store" });
    const json = await readJsonSafe(res);

    if (!res.ok) {
      throw new Error(json?.error || "Impossible de charger les sessions planifiées.");
    }

    const rows = extractRows<SessionRow>(json);
    setSessionsPlanifiees(rows);

    const firstPlanned = rows.find((row) => normalizeStatus(row.statut_session) === "PLANIFIEE");

    setSelectedSessionId((current) => {
      if (current && rows.some((row) => row.id === current)) return current;
      return firstPlanned?.id ?? "";
    });
  }

  async function loadGagnants(sessionId?: string) {
    if (!sessionId) {
      setGagnants([]);
      return;
    }

    const res = await fetch(`/api/tontine/gagnants-session?session_id=${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    });

    const json = await readJsonSafe(res);

    if (!res.ok) {
      setGagnants([]);
      return;
    }

    setGagnants(extractRows<GagnantRow>(json));
  }

  async function reloadAll() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const cycle = await loadCycleParams();

      if (!cycle) {
        setSessions([]);
        setSessionsPlanifiees([]);
        setSelectedSessionId("");
        setGagnants([]);
        return;
      }

      await loadSessions();
      await loadSessionsPlanifiees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
      return;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reloadAll();
  }, [refreshKey]);

  useEffect(() => {
    void loadGagnants(selectedSessionId);
  }, [selectedSessionId]);

  const selectedSession = useMemo(
    () => sessionsPlanifiees.find((row) => row.id === selectedSessionId) ?? null,
    [sessionsPlanifiees, selectedSessionId]
  );

  async function handleSaveCycle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingCycle(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/tontine/cycle-parametres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annee_cycle: form.annee_cycle ? Number(form.annee_cycle) : null,
          libelle_cycle: form.libelle_cycle || null,
          montant_fixe_par_tontineur: form.montant_fixe_par_tontineur
            ? Number(form.montant_fixe_par_tontineur)
            : null,
          date_debut_cycle: form.date_debut_cycle || null,
          date_fin_cycle: form.date_fin_cycle || null,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Impossible d'enregistrer les paramètres du cycle.");
      }

      setMessage("Paramètres du cycle enregistrés avec succès.");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant l'enregistrement du cycle.");
    } finally {
      setSavingCycle(false);
    }
  }

  async function handleActiverSession() {
    if (!selectedSessionId) {
      setError("Aucune session planifiée n'est disponible pour activation.");
      setMessage("");
      return;
    }

    setActivatingSession(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/tontine/activer-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: selectedSessionId }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || "Activation de session impossible.");
      }

      setMessage("Session activée avec succès. Elle est maintenant disponible pour la page Enchères.");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant l'activation de la session.");
    } finally {
      setActivatingSession(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 pb-28 md:px-6 md:pb-12 xl:px-8">
        <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Tontine
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                Paramétrage cycle & activation session
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Cette page sert uniquement à configurer le cycle et à activer une session planifiée.
                Le démarrage réel des enchères se fait uniquement dans la page Enchères.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey((v) => v + 1)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                Rafraîchir
              </button>

              <Link
                href="/encheres"
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Aller à la page Enchères
              </Link>
            </div>
          </div>

          {(message || error) && (
            <div className="mt-4">
              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Bloc 1
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                Paramétrage du cycle
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Ce bloc reste aligné sur les données réelles du backend. Les valeurs calculées métier
                ne sont pas faites dans le frontend.
              </p>
            </div>

            <form onSubmit={handleSaveCycle} className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Libellé cycle</span>
                <input
                  value={form.libelle_cycle}
                  onChange={(e) => setForm((v) => ({ ...v, libelle_cycle: e.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400"
                  placeholder="Cycle 2026"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Année cycle</span>
                <input
                  type="number"
                  value={form.annee_cycle}
                  onChange={(e) => setForm((v) => ({ ...v, annee_cycle: e.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400"
                  placeholder="2026"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Montant fixe par tontineur</span>
                <input
                  type="number"
                  value={form.montant_fixe_par_tontineur}
                  onChange={(e) => setForm((v) => ({ ...v, montant_fixe_par_tontineur: e.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400"
                  placeholder="20000"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Date début cycle</span>
                <input
                  type="date"
                  value={form.date_debut_cycle}
                  onChange={(e) => setForm((v) => ({ ...v, date_debut_cycle: e.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Date fin cycle</span>
                <input
                  type="date"
                  value={form.date_fin_cycle}
                  onChange={(e) => setForm((v) => ({ ...v, date_fin_cycle: e.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400"
                />
              </label>

              <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Nombre de tontineurs
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {cycleParams?.nb_tontineurs_inscrits ?? "-"}
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Mise brute de la session
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {formatMoney(cycleParams?.mise_brute_session)}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingCycle}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCycle ? "Enregistrement..." : "Enregistrer paramètres cycle"}
                </button>

                <button
                  type="button"
                  onClick={() => setRefreshKey((v) => v + 1)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                >
                  Rafraîchir cycle
                </button>

                {typeof cycleParams?.fichier_suivi_url === "string" && cycleParams.fichier_suivi_url ? (
                  <a
                    href={cycleParams.fichier_suivi_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Ouvrir le fichier de suivi
                  </a>
                ) : null}
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Bloc 2
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                Paramétrage session
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Le bloc propose la première session planifiée disponible pour activation.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Session à activer</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-400"
                >
                  <option value="">Sélectionner une session planifiée</option>
                  {sessionsPlanifiees.map((session) => (
                    <option key={session.id} value={session.id}>
                      {(session.libelle || `Session ${session.ordre_session ?? ""}`).trim()} {" "}
                      {session.periode_reference || "Période non renseignée"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Session ciblée
                </p>

                {selectedSession ? (
                  <div className="mt-3 grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">Libellé</span>
                      <span className="text-sm text-slate-900">
                        {selectedSession.libelle || `Session ${selectedSession.ordre_session ?? "-"}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">Période</span>
                      <span className="text-sm text-slate-900">
                        {selectedSession.periode_reference || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">Mise brute session</span>
                      <span className="text-sm text-slate-900">
                        {formatMoney(selectedSession.mise_brute_session)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">Nombre de lots</span>
                      <span className="text-sm text-slate-900">
                        {selectedSession.nb_lots_effectif ?? "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-700">Statut</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                        {formatStatus(selectedSession.statut_session)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Aucune session planifiée n'est actuellement renvoyée par le backend pour activation.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleActiverSession}
                disabled={activatingSession || !selectedSessionId}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activatingSession ? "Activation..." : "Activer session"}
              </button>

              <p className="text-xs leading-6 text-slate-500">
                Cette action ne démarre pas les enchères. Le lancement réel reste porté par le bouton
                <span className="font-semibold text-slate-700"> Top départ chrono </span>
                dans la page Enchères.
              </p>
            </div>
          </section>
        </div>

        {cycleParams && (
          <>
            <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                    Suivi du cycle
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                    Sessions du cycle
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Le tableau ci-dessous doit refléter uniquement ce qui est fourni par le backend.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Total sessions : <span className="font-bold text-slate-900">{sessions.length}</span>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-3 font-semibold">Ordre</th>
                      <th className="px-3 py-3 font-semibold">Période</th>
                      <th className="px-3 py-3 font-semibold">Mise brute session</th>
                      <th className="px-3 py-3 font-semibold">Nb lots</th>
                      <th className="px-3 py-3 font-semibold">Cumul caisse</th>
                      <th className="px-3 py-3 font-semibold">Statut session</th>
                      <th className="px-3 py-3 font-semibold">Statut enchères</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                          Chargement...
                        </td>
                      </tr>
                    ) : sessions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                          Aucune session disponible.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((session) => (
                        <tr key={session.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-3 py-4 font-semibold text-slate-900">
                            {session.ordre_session ?? "-"}
                          </td>
                          <td className="px-3 py-4 text-slate-700">
                            {session.periode_reference || "-"}
                          </td>
                          <td className="px-3 py-4 text-slate-700">
                            {formatMoney(session.mise_brute_session)}
                          </td>
                          <td className="px-3 py-4 text-slate-700">
                            {session.nb_lots_effectif ?? "-"}
                          </td>
                          <td className="px-3 py-4 text-slate-700">
                            {formatMoney(session.cumul_caisse)}
                          </td>
                          <td className="px-3 py-4">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                              {formatStatus(session.statut_session)}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                              {formatStatus(session.statut_encheres)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Résultats
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  Gagnants de la session sélectionnée
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Ce bloc reste en lecture seule et dépend uniquement de l'API backend.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {gagnants.length === 0 ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    Aucun gagnant disponible pour cette session.
                  </div>
                ) : (
                  gagnants.map((item, index) => (
                    <article
                      key={item.id ?? `${item.nom_complet ?? "gagnant"}-${index}`}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Lot
                      </p>
                      <h3 className="mt-2 text-lg font-black text-slate-900">
                        {item.lot_libelle || `Lot ${item.lot_numero ?? index + 1}`}
                      </h3>
                      <p className="mt-3 text-sm text-slate-600">
                        Gagnant :{" "}
                        <span className="font-semibold text-slate-900">
                          {item.nom_complet || item.membre_nom || "-"}
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Enchère :{" "}
                        <span className="font-semibold text-slate-900">
                          {formatMoney(item.montant_enchere)}
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Gain réel :{" "}
                        <span className="font-semibold text-slate-900">
                          {formatMoney(item.gain_reel)}
                        </span>
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}



