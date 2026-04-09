"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Rubrique = {
  id: string;
  nom?: string;
  libelle?: string;
};

type DemandeAide = {
  id: string;
  montant_demande?: number;
  montant_accorde?: number | null;
  motif?: string;
  statut?: string;
  created_at?: string;
};

type DemandePret = {
  id: string;
  montant_demande?: number;
  montant_accorde?: number | null;
  motif?: string;
  statut?: string;
  created_at?: string;
  reference_unique?: string;
  document_texte?: string | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any[];
};

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " FCFA";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function readJsonSafe(response: Response) {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("La route appelée ne renvoie pas du JSON.");
  }
}

export default function GestionDemandesPage() {
  const [aides, setAides] = useState<DemandeAide[]>([]);
  const [prets, setPrets] = useState<DemandePret[]>([]);
  const [rubriques, setRubriques] = useState<Rubrique[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [montantsAides, setMontantsAides] = useState<Record<string, string>>({});
  const [rubriquesAides, setRubriquesAides] = useState<Record<string, string>>({});
  const [commentairesAides, setCommentairesAides] = useState<Record<string, string>>({});

  const [montantsPrets, setMontantsPrets] = useState<Record<string, string>>({});
  const [rubriquesPrets, setRubriquesPrets] = useState<Record<string, string>>({});
  const [commentairesPrets, setCommentairesPrets] = useState<Record<string, string>>({});

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [aidesRes, pretsRes, rubriquesRes] = await Promise.all([
        fetch("/api/aides", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/prets", { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch("/api/rubriques", { cache: "no-store", headers: { Accept: "application/json" } }),
      ]);

      const aidesJson = (await readJsonSafe(aidesRes)) as ApiResponse | null;
      const pretsJson = (await readJsonSafe(pretsRes)) as ApiResponse | null;
      const rubriquesJson = (await readJsonSafe(rubriquesRes)) as ApiResponse | null;

      if (!aidesRes.ok || !aidesJson?.success) {
        throw new Error(aidesJson?.error || aidesJson?.message || "Erreur lors du chargement des demandes d'aide.");
      }

      if (!pretsRes.ok || !pretsJson?.success) {
        throw new Error(pretsJson?.error || pretsJson?.message || "Erreur lors du chargement des demandes de prêt.");
      }

      if (!rubriquesRes.ok || !rubriquesJson?.success) {
        throw new Error(rubriquesJson?.error || rubriquesJson?.message || "Erreur lors du chargement des rubriques.");
      }

      const nextAides = Array.isArray(aidesJson.data) ? aidesJson.data : [];
      const nextPrets = Array.isArray(pretsJson.data) ? pretsJson.data : [];
      const nextRubriques = Array.isArray(rubriquesJson.data) ? rubriquesJson.data : [];

      setAides(nextAides);
      setPrets(nextPrets);
      setRubriques(nextRubriques);

      const nextMontantsAides: Record<string, string> = {};
      nextAides.forEach((item: DemandeAide) => {
        nextMontantsAides[item.id] = String(Number(item.montant_demande || 0));
      });
      setMontantsAides(nextMontantsAides);

      const nextMontantsPrets: Record<string, string> = {};
      nextPrets.forEach((item: DemandePret) => {
        nextMontantsPrets[item.id] = String(Number(item.montant_demande || 0));
      });
      setMontantsPrets(nextMontantsPrets);
    } catch (err: any) {
      setAides([]);
      setPrets([]);
      setRubriques([]);
      setError(err?.message || "Erreur lors du chargement des demandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function traiterAide(demandeId: string, decision: "APPROUVEE" | "REFUSEE") {
    try {
      setActionLoadingId(demandeId);
      setError("");
      setSuccess("");

      const response = await fetch("/api/aides/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          demande_id: demandeId,
          decision,
          montant_accorde: decision === "APPROUVEE" ? Number(montantsAides[demandeId] || 0) : null,
          rubrique_id: decision === "APPROUVEE" ? (rubriquesAides[demandeId] || null) : null,
          commentaire_decision: commentairesAides[demandeId] || null,
        }),
      });

      const json = (await readJsonSafe(response)) as ApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || json?.message || "Erreur lors du traitement de la demande d'aide.");
      }

      setSuccess(json?.message || "Demande d'aide traitée avec succès.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du traitement de la demande d'aide.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function traiterPret(demandeId: string, decision: "APPROUVEE" | "REFUSEE") {
    try {
      setActionLoadingId(demandeId);
      setError("");
      setSuccess("");

      const response = await fetch("/api/prets/valider", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          demande_id: demandeId,
          decision,
          montant_accorde: decision === "APPROUVEE" ? Number(montantsPrets[demandeId] || 0) : null,
          rubrique_id: decision === "APPROUVEE" ? (rubriquesPrets[demandeId] || null) : null,
          commentaire_decision: commentairesPrets[demandeId] || null,
        }),
      });

      const json = (await readJsonSafe(response)) as ApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || json?.message || "Erreur lors du traitement de la demande de prêt.");
      }

      setSuccess(json?.message || "Demande de prêt traitée avec succès.");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du traitement de la demande de prêt.");
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Gestion des demandes
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Traitement des demandes d'aides et de prêts
            </h1>
            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Le bureau peut voir les demandes complètes, adapter les montants et confirmer l'acceptation ou le refus.
            </p>
          </div>

          <Link
            href="/caisse"
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            ← Retour à Caisse
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Demandes d'Aides / Secours / Prêts</h2>
            <p className="mt-1 text-sm text-slate-500">Le bureau peut adapter le montant et confirmer l'acceptation ou le refus.</p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="mt-5 text-sm text-slate-500">Chargement...</div>
        ) : !aides.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aucune demande d'aide disponible.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {aides.map((demande) => (
              <article key={demande.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Montant demandé</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(demande.montant_demande)}</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Montant accordé</label>
                    <input
                      type="number"
                      min="0"
                      value={montantsAides[demande.id] ?? ""}
                      onChange={(e) => setMontantsAides((prev) => ({ ...prev, [demande.id]: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Rubrique de décaissement</label>
                    <select
                      value={rubriquesAides[demande.id] ?? ""}
                      onChange={(e) => setRubriquesAides((prev) => ({ ...prev, [demande.id]: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Sélectionner une rubrique</option>
                      {rubriques.map((rubrique) => (
                        <option key={rubrique.id} value={rubrique.id}>
                          {rubrique.nom || rubrique.libelle || "Rubrique"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Motif</p>
                    <p className="mt-1 text-sm text-slate-700">{demande.motif || "-"}</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Commentaire de décision</label>
                    <textarea
                      value={commentairesAides[demande.id] ?? ""}
                      onChange={(e) => setCommentairesAides((prev) => ({ ...prev, [demande.id]: e.target.value }))}
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Statut</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{demande.statut || "-"}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Date</p>
                    <p className="mt-1 text-sm text-slate-700">{formatDate(demande.created_at)}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => traiterAide(demande.id, "APPROUVEE")}
                    disabled={actionLoadingId === demande.id}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actionLoadingId === demande.id ? "Traitement..." : "Accepter"}
                  </button>

                  <button
                    type="button"
                    onClick={() => traiterAide(demande.id, "REFUSEE")}
                    disabled={actionLoadingId === demande.id}
                    className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Refuser
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Demandes de prêts</h2>

        {loading ? (
          <div className="mt-5 text-sm text-slate-500">Chargement...</div>
        ) : !prets.length ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aucune demande de prêt disponible.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {prets.map((demande) => (
              <article key={demande.id} className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Montant demandé</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(demande.montant_demande)}</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Montant accordé</label>
                    <input
                      type="number"
                      min="0"
                      value={montantsPrets[demande.id] ?? ""}
                      onChange={(e) => setMontantsPrets((prev) => ({ ...prev, [demande.id]: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Rubrique de décaissement</label>
                    <select
                      value={rubriquesPrets[demande.id] ?? ""}
                      onChange={(e) => setRubriquesPrets((prev) => ({ ...prev, [demande.id]: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Sélectionner une rubrique</option>
                      {rubriques.map((rubrique) => (
                        <option key={rubrique.id} value={rubrique.id}>
                          {rubrique.nom || rubrique.libelle || "Rubrique"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Statut</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{demande.statut || "-"}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Commentaire de décision</label>
                    <textarea
                      value={commentairesPrets[demande.id] ?? ""}
                      onChange={(e) => setCommentairesPrets((prev) => ({ ...prev, [demande.id]: e.target.value }))}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Demande complète et signée</p>
                    <div className="flex flex-col gap-3">
                      <Link
                        href={`/prets/demande/${demande.id}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Ouvrir la demande complète signée
                      </Link>

                      <pre className="mt-0 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {demande.document_texte || "Document indisponible."}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => traiterPret(demande.id, "APPROUVEE")}
                    disabled={actionLoadingId === demande.id}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actionLoadingId === demande.id ? "Traitement..." : "Accepter"}
                  </button>

                  <button
                    type="button"
                    onClick={() => traiterPret(demande.id, "REFUSEE")}
                    disabled={actionLoadingId === demande.id}
                    className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    Refuser
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Référence</p>
                  <p className="mt-1 text-sm text-slate-700">{demande.reference_unique || "-"}</p>
                  <p className="mt-2 text-xs text-slate-500">Date : {formatDate(demande.created_at)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}



