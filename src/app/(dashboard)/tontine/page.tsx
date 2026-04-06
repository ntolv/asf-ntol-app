"use client";

import { useEffect, useState } from "react";

type Session = {
  id: string;
  libelle: string;
  periode: string;
  ordre_session: number;
  statut_session: string;
  nombre_lots?: number;
  statut_encheres?: string | null;
  est_selectionnable?: boolean;
  est_active?: boolean;
};

type Gagnant = {
  id: string;
  session_id: string;
  lot: number;
  nom_complet: string;
  mise_brute: number;
  total_relances: number;
  gain_reel: number;
  statut_gain: string;
};

type CycleParams = {
  mise_brute_unitaire?: number;
  contribution_globale_mensuelle?: number;
  contribution_globale_cycle?: number;
  calcul_detail?: string | null;
  configured: boolean;
  libelle_cycle?: string;
  montant_fixe_par_tontineur?: number;
  nb_tontineurs_inscrits?: number;
  mise_brute_cycle?: number;
  date_debut_cycle?: string | null;
  date_fin_cycle?: string | null;
  annee_cycle?: number | null;
};

function formatMontant(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
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

export default function TontinePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionActive, setSessionActive] = useState<Session | null>(null);
  const [gagnants, setGagnants] = useState<Gagnant[]>([]);
  const [cycleParams, setCycleParams] = useState<CycleParams | null>(null);

  const [montantFixeParTontineur, setMontantFixeParTontineur] = useState("");
  const [dateDebutCycle, setDateDebutCycle] = useState("");
  const [dureeSession, setDureeSession] = useState(4);
  const [nbLotsSession, setNbLotsSession] = useState(5);
  const [montantDepartSession, setMontantDepartSession] = useState(0);

  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingGagnants, setLoadingGagnants] = useState(false);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/tontine/sessions");
      const data = await res.json();

      const loadedSessions: Session[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.sessions)
          ? data.sessions
          : [];

      setSessions(loadedSessions);

      const resolvedSessionActive =
        data?.session_active
          ? loadedSessions.find((s) => s.id === data.session_active.id) ?? {
              id: data.session_active.id,
              libelle: data.session_active.libelle,
              periode: data.session_active.periode,
              ordre_session: data.session_active.ordre_session,
              statut_session: "OUVERTE",
              statut_encheres: null,
              est_selectionnable: true,
              est_active: true,
            }
          : loadedSessions.find((s) => s.est_active) ??
            loadedSessions.find((s) => s.est_selectionnable) ??
            null;

      setSessionActive(resolvedSessionActive);
    } catch (err) {
      console.error("Erreur chargement sessions:", err);
      setSessions([]);
      setSessionActive(null);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadCycleParams = async () => {
    setLoadingCycle(true);
    try {
      const res = await fetch("/api/tontine/cycle-parametres");
      const data = await res.json();

      if (!res.ok || data?.error) {
        console.error(data?.error || "Erreur chargement paramètres cycle");
        setCycleParams({ configured: false });
        return;
      }

      const normalized: CycleParams = {
        configured: Boolean(data?.configured),
        libelle_cycle: data?.libelle_cycle ?? "CYCLE ACTIF",
        montant_fixe_par_tontineur: Number(data?.montant_fixe_par_tontineur || 0),
        nb_tontineurs_inscrits: Number(data?.nb_tontineurs_inscrits || 0),
        mise_brute_cycle: Number(data?.mise_brute_cycle || 0),
        date_debut_cycle: data?.date_debut_cycle ?? null,
        date_fin_cycle: data?.date_fin_cycle ?? null,
        annee_cycle: data?.annee_cycle != null ? Number(data.annee_cycle) : null,
        calcul_detail: data?.calcul_detail ?? null,
      };

      setCycleParams(normalized);
      setMontantFixeParTontineur(
        normalized.configured && normalized.montant_fixe_par_tontineur
          ? String(normalized.montant_fixe_par_tontineur)
          : ""
      );
      setDateDebutCycle(normalized.date_debut_cycle ?? "");
    } catch (err) {
      console.error("Erreur chargement paramètres cycle:", err);
      setCycleParams({ configured: false });
    } finally {
      setLoadingCycle(false);
    }
  };

  useEffect(() => {
    loadSessions();
    loadCycleParams();
  }, []);

  const sessionReferenceForWinners = sessionActive || sessions[0] || null;

  const loadGagnants = async (sessionId?: string | null) => {
    if (!sessionId) {
      setGagnants([]);
      return;
    }

    setLoadingGagnants(true);
    try {
      const res = await fetch(`/api/tontine/gagnants-session?session_id=${sessionId}`);
      const data = await res.json();
      setGagnants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement gagnants:", err);
      setGagnants([]);
    } finally {
      setLoadingGagnants(false);
    }
  };

  useEffect(() => {
    loadGagnants(sessionReferenceForWinners?.id);
  }, [sessionReferenceForWinners?.id, sessionReferenceForWinners?.statut_encheres]);

  const saveCycleParams = async () => {
    try {
      const montant = Number(montantFixeParTontineur);

      if (!montant || montant <= 0) {
        alert("Le montant fixe par tontineur doit être supérieur à 0 FCFA.");
        return;
      }

      if (!dateDebutCycle) {
        alert("La date de début du cycle est obligatoire.");
        return;
      }

      setActionLoading(true);

      const res = await fetch("/api/tontine/cycle-parametres", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          montant_fixe_par_tontineur: montant,
          libelle_cycle: "CYCLE ACTIF",
          date_debut_cycle: dateDebutCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.error) {
        alert(data?.error || "Erreur enregistrement paramètres cycle");
        return;
      }

      await loadCycleParams();
      alert("Paramètres du cycle enregistrés avec succès");
    } catch (err) {
      console.error(err);
      alert("Erreur enregistrement paramètres cycle");
    } finally {
      setActionLoading(false);
    }
  };

  const createSession = async () => {
    try {
      if (!cycleParams?.configured) {
        alert("Configure d'abord le cycle de tontine.");
        return;
      }

      if (!cycleParams.nb_tontineurs_inscrits || cycleParams.nb_tontineurs_inscrits <= 0) {
        alert("Aucun tontineur inscrit n'a été trouvé.");
        return;
      }

      if (!cycleParams.mise_brute_cycle || cycleParams.mise_brute_cycle <= 0) {
        alert("La mise brute du cycle est invalide.");
        return;
      }

      if (montantDepartSession < 0) {
        alert("Le montant minimum du départ des enchères ne peut pas être négatif.");
        return;
      }

      setActionLoading(true);

      const nextOrder =
        sessions.length > 0 ? Math.max(...sessions.map((s) => s.ordre_session)) + 1 : 1;

      const month = String(Math.min(nextOrder + 4, 12)).padStart(2, "0");
      const annee = cycleParams.annee_cycle || new Date().getFullYear();

      const res = await fetch("/api/tontine/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          libelle: `SESSION ${nextOrder}`,
          periode: `${annee}-${month}`,
          ordre_session: nextOrder,
          mise: cycleParams.mise_brute_cycle,
          nb_lots: nbLotsSession,
          montant_depart_enchere: Number(montantDepartSession || 0),
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.error) {
        alert(data?.error || "Erreur création session");
        return;
      }

      await loadSessions();
      alert("Session créée avec succès");
    } catch (err) {
      console.error(err);
      alert("Erreur création session");
    } finally {
      setActionLoading(false);
    }
  };

  const startGlobalEncheres = async () => {
    try {
      if (!sessionActive?.id) {
        alert("Aucune session sélectionnée");
        return;
      }

      setActionLoading(true);

      const res = await fetch("/api/tontine/start-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionActive.id,
          duree: dureeSession,
        }),
      });

      const data = await res.json();

      if (!res.ok || data?.error) {
        alert(data?.error || "Erreur démarrage enchères");
        return;
      }

      await loadSessions();
      alert("Enchères globales démarrées pour tous les lots");
    } catch (err) {
      console.error(err);
      alert("Erreur démarrage enchères");
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
                Tontine
              </h1>
              <p className="mt-2 text-sm text-emerald-900/70 md:text-base">
                Paramétrage du cycle, création de session, lancement des enchères et suivi des résultats.
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
              Pilotage administratif
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-emerald-950">Paramétrage du cycle de tontine</h2>
                <p className="text-sm text-emerald-900/70">
                  Les montants et le calcul du cycle sont affichés automatiquement selon la logique du cycle.
                </p>
              </div>

              <button
                type="button"
                onClick={loadCycleParams}
                disabled={loadingCycle || actionLoading}
                className="rounded-2xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loadingCycle ? "Chargement..." : "Rafraîchir cycle"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <label className="text-sm font-medium text-emerald-900">
                  Montant fixe de la tontine par tontineur
                </label>
                <input
                  type="number"
                  min={1}
                  value={montantFixeParTontineur}
                  onChange={(e) => setMontantFixeParTontineur(e.target.value)}
                  placeholder="Ex: 100000"
                  className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
                />
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <label className="text-sm font-medium text-emerald-900">
                  Date de début du cycle
                </label>
                <input
                  type="date"
                  value={dateDebutCycle}
                  onChange={(e) => setDateDebutCycle(e.target.value)}
                  className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
                />
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <p className="text-sm text-emerald-900/65">Tontineurs inscrits</p>
                <p className="mt-2 text-2xl font-bold text-emerald-950">
                  {loadingCycle ? "..." : cycleParams?.nb_tontineurs_inscrits ?? 0}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <p className="text-sm text-emerald-900/65">Mise brute du cycle</p>
                <p className="mt-2 text-xl font-bold text-emerald-950">
                  {formatMontant(cycleParams?.mise_brute_cycle ?? cycleParams?.mise_brute_unitaire ?? 0)}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <p className="text-sm text-emerald-900/65">Début du cycle</p>
                <p className="mt-2 text-base font-semibold text-emerald-950">
                  {formatDate(cycleParams?.date_debut_cycle)}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <p className="text-sm text-emerald-900/65">Fin du cycle</p>
                <p className="mt-2 text-base font-semibold text-emerald-950">
                  {formatDate(cycleParams?.date_fin_cycle)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveCycleParams}
                disabled={actionLoading}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {actionLoading ? "Traitement..." : "Enregistrer paramètres cycle"}
              </button>

              <a
                href="/tontine/suivi-cycle"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Consulter le tableau de suivi du cycle
              </a>

              <div className="rounded-[28px] border border-emerald-200/70 bg-emerald-50/70 p-5 shadow-sm">
                <p className="text-sm text-emerald-900/65">Calcul du cycle</p>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {cycleParams?.calcul_detail || "Calcul non disponible"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-emerald-950">Paramétrage de session</h2>
                <p className="text-sm text-emerald-900/70">
                  Choix de la session disponible à piloter et lancement global des enchères.
                </p>
              </div>

              <button
                type="button"
                onClick={loadSessions}
                disabled={loadingSessions || actionLoading}
                className="rounded-2xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loadingSessions ? "Chargement..." : "Rafraîchir"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4 md:col-span-2">
                <label className="text-sm font-medium text-emerald-900">
                  Session à piloter
                </label>
                <select
                  value={sessionActive?.id || ""}
                  onChange={(e) => {
                    const nextSession = sessions.find((s) => s.id === e.target.value) || null;
                    setSessionActive(nextSession);
                  }}
                  className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
                >
                  <option value="">Sélectionner une session</option>
                  {sessions
                    .filter((s) => s?.est_selectionnable === true)
                    .sort((a, b) => (a?.ordre_session ?? 0) - (b?.ordre_session ?? 0))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.libelle} — {s.periode}
                        {s.est_active ? " (première disponible)" : ""}
                      </option>
                    ))}
                </select>
                <p className="mt-2 text-xs text-emerald-800/80">
                  La première session non clôturée du cycle est préchargée automatiquement depuis le backend.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <p className="text-sm text-emerald-900/65">Session sélectionnée</p>
                <p className="mt-2 text-base font-semibold text-emerald-950">
                  {sessionActive?.libelle ? `${sessionActive.libelle} — ${sessionActive.periode}` : "Aucune"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {sessionActive?.statut_session || "-"} / {sessionActive?.statut_encheres || "-"}
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <label className="text-sm font-medium text-emerald-900">
                  Nombre de lots de la session
                </label>
                <input
                  type="number"
                  min={1}
                  value={nbLotsSession}
                  onChange={(e) => setNbLotsSession(Number(e.target.value))}
                  className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
                />
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <label className="text-sm font-medium text-emerald-900">
                  Durée d'inactivité avant clôture (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={dureeSession}
                  onChange={(e) => setDureeSession(Number(e.target.value))}
                  className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
                />
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4 md:col-span-2">
                <label className="text-sm font-medium text-emerald-900">
                  Montant minimum du départ des enchères
                </label>
                <input
                  type="number"
                  min={0}
                  value={montantDepartSession}
                  onChange={(e) => setMontantDepartSession(Number(e.target.value))}
                  className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-950 outline-none"
                />
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Le bloc Session active et les lots actifs sont désormais transférés dans la page Enchères. C’est là que les utilisateurs renchérissent.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={createSession}
                disabled={actionLoading || !cycleParams?.configured}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {actionLoading ? "Traitement..." : "+ Nouvelle session"}
              </button>

              <button
                type="button"
                onClick={startGlobalEncheres}
                disabled={actionLoading || !sessionActive?.id}
                className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {actionLoading ? "Traitement..." : "Démarrer enchères (global)"}
              </button>
            </div>
          </section>
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-emerald-950">Gagnants de la session</h2>
            <p className="text-sm text-emerald-900/70">
              Résultats renvoyés par le backend pour la session active ou, à défaut, pour la dernière session disponible.
            </p>
            {sessionReferenceForWinners && (
              <p className="mt-1 text-sm font-medium text-emerald-800">
                Session affichée : {sessionReferenceForWinners.libelle} — {sessionReferenceForWinners.periode}
              </p>
            )}
          </div>

          {!sessionReferenceForWinners ? (
            <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
              Aucune session disponible.
            </div>
          ) : loadingGagnants ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 px-6 py-8 text-sm text-emerald-900/70">
              Chargement des gagnants...
            </div>
          ) : gagnants.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-8 text-center text-sm text-emerald-900/70">
              Aucun gagnant attribué pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {gagnants.map((g) => (
                <div key={g.id} className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/40 p-4 shadow-sm">
                  <p className="text-base font-semibold text-emerald-950">
                    Lot {g.lot} — {g.nom_complet}
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>Mise brute : {formatMontant(g.mise_brute)}</p>
                    <p>Relances : {formatMontant(g.total_relances)}</p>
                    <p>Montant net : {formatMontant(g.gain_reel)}</p>
                    <p>Statut : {g.statut_gain}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-emerald-950">Historique sessions</h2>
            <p className="text-sm text-emerald-900/70">Liste des sessions déjà présentes dans le système.</p>
          </div>

          {loadingSessions ? (
            <p className="text-sm text-emerald-900/70">Chargement...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-emerald-900/70">Aucune session disponible.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-emerald-950">{s.libelle}</p>
                      <p className="text-sm text-slate-500">{s.periode}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getBadgeClass(s.statut_session)}`}>
                        {s.statut_session}
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getBadgeClass(s.statut_encheres)}`}>
                        {s.statut_encheres ?? "Non démarrées"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}