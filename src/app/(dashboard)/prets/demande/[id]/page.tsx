"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FinancementDocument = {
  rubrique_id?: string;
  rubrique_nom?: string;
  caisse_id?: string;
  caisse_libelle?: string;
  montant_finance?: number;
};

type DocumentJson = {
  financements?: FinancementDocument[];
  motif_reduction?: string | null;
  commentaire_decision?: string | null;
  date_traitement?: string | null;
};

type DemandePret = {
  id: string;
  membre_id?: string | null;
  montant_demande?: number;
  montant_accorde?: number | null;
  motif?: string;
  statut?: string;
  created_at?: string;
  date_traitement?: string | null;
  reference_unique?: string;
  document_texte?: string | null;
  document_json?: DocumentJson | null;
  signature_nom?: string | null;
  commentaire_decision?: string | null;
};

type Caisse = {
  caisse_id: string;
  caisse_libelle?: string | null;
  actif?: boolean;
  rubrique_id: string;
  rubrique_nom?: string | null;
  total_encaisse?: number | string | null;
  total_decaisse?: number | string | null;
  solde_disponible?: number | string | null;
};

type FinancementForm = {
  key: string;
  caisse_id: string;
  montant: string;
};

type DemandeApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: DemandePret | null;
};

type CaissesApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: Caisse[];
};

type AuthApiResponse = {
  success?: boolean;
  role?: string | null;
  roleCode?: string | null;
  member?: {
    role?: string | null;
    role_code?: string | null;
    roleCode?: string | null;
  } | null;
};

type DecisionApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

function formatMoney(value: number | string | null | undefined) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(Number(value || 0)) + " FCFA"
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
    timeStyle: "short",
  }).format(date);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isBureauRole(role: unknown, roleCode: unknown) {
  const text = normalizeText(`${role ?? ""} ${roleCode ?? ""}`);

  return (
    text.includes("admin") ||
    text.includes("president") ||
    text.includes("tresorier")
  );
}

async function readJsonSafe(response: Response) {
  const rawText = await response.text();

  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("La route appelée ne renvoie pas du JSON.");
  }
}

function createFinancementLine(): FinancementForm {
  return {
    key:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    caisse_id: "",
    montant: "",
  };
}

export default function PretDemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [demandeId, setDemandeId] = useState("");
  const [demande, setDemande] = useState<DemandePret | null>(null);
  const [caisses, setCaisses] = useState<Caisse[]>([]);
  const [bureau, setBureau] = useState(false);

  const [montantAccorde, setMontantAccorde] = useState("");
  const [motifReduction, setMotifReduction] = useState("");
  const [commentaireDecision, setCommentaireDecision] = useState("");
  const [financements, setFinancements] = useState<FinancementForm[]>([
    createFinancementLine(),
  ]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPage(id: string) {
    const [demandeResponse, caissesResponse, authResponse] =
      await Promise.all([
        fetch(`/api/prets/${id}`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }),
        fetch("/api/caisses", {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }),
        fetch("/api/auth/context", {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }),
      ]);

    const demandeJson = (await readJsonSafe(
      demandeResponse
    )) as DemandeApiResponse | null;

    const caissesJson = (await readJsonSafe(
      caissesResponse
    )) as CaissesApiResponse | null;

    const authJson = (await readJsonSafe(
      authResponse
    )) as AuthApiResponse | null;

    if (
      !demandeResponse.ok ||
      !demandeJson?.success ||
      !demandeJson.data
    ) {
      throw new Error(
        demandeJson?.error ||
          demandeJson?.message ||
          "Impossible de charger la demande."
      );
    }

    if (!caissesResponse.ok || !caissesJson?.success) {
      throw new Error(
        caissesJson?.error ||
          caissesJson?.message ||
          "Impossible de charger les caisses."
      );
    }

    const nextDemande = demandeJson.data;
    const nextCaisses = Array.isArray(caissesJson.data)
      ? caissesJson.data.filter((item) => item.actif !== false)
      : [];

    const role =
      authJson?.member?.role ?? authJson?.role ?? null;

    const roleCode =
      authJson?.member?.role_code ??
      authJson?.member?.roleCode ??
      authJson?.roleCode ??
      null;

    setDemande(nextDemande);
    setCaisses(nextCaisses);
    setBureau(isBureauRole(role, roleCode));

    setMontantAccorde(
      String(
        Number(
          nextDemande.montant_accorde ??
            nextDemande.montant_demande ??
            0
        )
      )
    );

    setCommentaireDecision(
      String(
        nextDemande.document_json?.commentaire_decision ??
          nextDemande.commentaire_decision ??
          ""
      )
    );

    setMotifReduction(
      String(nextDemande.document_json?.motif_reduction ?? "")
    );

    const financementsExistants =
      nextDemande.document_json?.financements ?? [];

    if (financementsExistants.length > 0) {
      setFinancements(
        financementsExistants.map((item) => ({
          key:
            typeof crypto !== "undefined" &&
            "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          caisse_id: String(item.caisse_id ?? ""),
          montant: String(Number(item.montant_finance ?? 0)),
        }))
      );
    } else {
      setFinancements([createFinancementLine()]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function resolveParamsAndLoad() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const resolved = await params;
        const id = String(resolved?.id ?? "").trim();

        if (!id) {
          throw new Error("Identifiant de demande manquant.");
        }

        if (!cancelled) {
          setDemandeId(id);
        }

        await loadPage(id);
      } catch (err: any) {
        if (!cancelled) {
          setDemande(null);
          setCaisses([]);
          setError(
            err?.message ||
              "Erreur lors du chargement de la demande."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    resolveParamsAndLoad();

    return () => {
      cancelled = true;
    };
  }, [params]);

  const montantDemande = Number(
    demande?.montant_demande ?? 0
  );

  const montantAccordeNumber = Number(montantAccorde || 0);

  const totalFinance = useMemo(() => {
    return financements.reduce(
      (total, item) => total + Number(item.montant || 0),
      0
    );
  }, [financements]);

  const selectedCaisseIds = financements
    .map((item) => item.caisse_id)
    .filter(Boolean);

  const selectedRubriqueIds = financements
    .map((item) => {
      const caisse = caisses.find(
        (row) => row.caisse_id === item.caisse_id
      );

      return caisse?.rubrique_id ?? "";
    })
    .filter(Boolean);

  const caisseDuplicate =
    new Set(selectedCaisseIds).size !==
    selectedCaisseIds.length;

  const rubriqueDuplicate =
    new Set(selectedRubriqueIds).size !==
    selectedRubriqueIds.length;

  const reductionNecessaire =
    montantAccordeNumber > 0 &&
    montantAccordeNumber < montantDemande;

  const depassementSolde = financements.some((item) => {
    const caisse = caisses.find(
      (row) => row.caisse_id === item.caisse_id
    );

    if (!caisse) return false;

    return (
      Number(item.montant || 0) >
      Number(caisse.solde_disponible || 0)
    );
  });

  const lignesCompletes = financements.every((item) => {
    return (
      Boolean(item.caisse_id) &&
      Number.isFinite(Number(item.montant)) &&
      Number(item.montant) > 0
    );
  });

  const totalCorrect =
    Math.abs(totalFinance - montantAccordeNumber) < 0.001;

  const montantAccordeValide =
    montantAccordeNumber > 0 &&
    montantAccordeNumber <= montantDemande;

  const motifReductionValide =
    !reductionNecessaire || motifReduction.trim().length > 0;

  const peutApprouver =
    demande?.statut === "EN_ATTENTE" &&
    bureau &&
    montantAccordeValide &&
    motifReductionValide &&
    financements.length > 0 &&
    lignesCompletes &&
    !caisseDuplicate &&
    !rubriqueDuplicate &&
    !depassementSolde &&
    totalCorrect &&
    !actionLoading;

  function updateFinancement(
    key: string,
    field: "caisse_id" | "montant",
    value: string
  ) {
    setFinancements((previous) =>
      previous.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addFinancement() {
    setFinancements((previous) => [
      ...previous,
      createFinancementLine(),
    ]);
  }

  function removeFinancement(key: string) {
    setFinancements((previous) => {
      if (previous.length === 1) {
        return [createFinancementLine()];
      }

      return previous.filter((item) => item.key !== key);
    });
  }

  async function traiterDemande(
    decision: "APPROUVEE" | "REFUSEE"
  ) {
    if (!demandeId || !demande) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (decision === "APPROUVEE" && !peutApprouver) {
        throw new Error(
          "La répartition du financement doit être entièrement valide avant l’approbation."
        );
      }

      const financementsPayload =
        decision === "APPROUVEE"
          ? financements.map((item) => {
              const caisse = caisses.find(
                (row) => row.caisse_id === item.caisse_id
              );

              if (!caisse) {
                throw new Error(
                  "Une caisse sélectionnée est introuvable."
                );
              }

              return {
                rubrique_id: caisse.rubrique_id,
                caisse_id: caisse.caisse_id,
                montant: Number(item.montant || 0),
              };
            })
          : [];

      const response = await fetch("/api/prets/valider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          demande_id: demandeId,
          decision,
          montant_accorde:
            decision === "APPROUVEE"
              ? montantAccordeNumber
              : null,
          motif_reduction:
            decision === "APPROUVEE" && reductionNecessaire
              ? motifReduction.trim()
              : null,
          commentaire_decision:
            commentaireDecision.trim() || null,
          financements: financementsPayload,
        }),
      });

      const json = (await readJsonSafe(
        response
      )) as DecisionApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error ||
            json?.message ||
            "Erreur lors du traitement de la demande."
        );
      }

      setSuccess(
        json.message ||
          (decision === "APPROUVEE"
            ? "Demande de prêt approuvée."
            : "Demande de prêt refusée.")
      );

      await loadPage(demandeId);
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du traitement de la demande."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const demandeEnAttente =
    String(demande?.statut ?? "").toUpperCase() ===
    "EN_ATTENTE";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Demande de prêt
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Consultation et traitement de la demande
            </h1>

            <p className="mt-3 text-sm text-slate-600 md:text-base">
              Consultez la demande, définissez le montant accordé
              et répartissez son financement entre les caisses
              disponibles.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/gestion-demandes"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ← Retour à Gestion des demandes
            </Link>
          </div>
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

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
          Chargement de la demande...
        </div>
      ) : !demande ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Demande introuvable.
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Demandeur
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {demande.signature_nom || "-"}
              </p>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Montant demandé
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(demande.montant_demande)}
              </p>
            </article>

            <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Montant accordé
              </p>
              <p className="mt-2 text-xl font-bold text-emerald-700">
                {formatMoney(demande.montant_accorde)}
              </p>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Statut
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {demande.statut || "-"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatDate(
                  demande.date_traitement ?? demande.created_at
                )}
              </p>
            </article>
          </section>

          {demandeEnAttente && bureau ? (
            <section className="rounded-[28px] border border-emerald-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Décision du bureau
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  Financement du prêt
                </h2>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Montant demandé
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
                    {formatMoney(montantDemande)}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Montant accordé
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={montantDemande}
                    step="1"
                    value={montantAccorde}
                    onChange={(event) =>
                      setMontantAccorde(event.target.value)
                    }
                    disabled={actionLoading}
                    className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none ${
                      montantAccordeValide
                        ? "border-slate-300 focus:border-emerald-500"
                        : "border-red-300 focus:border-red-500"
                    }`}
                  />

                  {!montantAccordeValide ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      Le montant accordé doit être supérieur à zéro
                      et ne peut pas dépasser le montant demandé.
                    </p>
                  ) : null}
                </div>
              </div>

              {reductionNecessaire ? (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Motif de la réduction
                  </label>
                  <textarea
                    value={motifReduction}
                    onChange={(event) =>
                      setMotifReduction(event.target.value)
                    }
                    disabled={actionLoading}
                    rows={3}
                    className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none ${
                      motifReduction.trim()
                        ? "border-slate-300 focus:border-emerald-500"
                        : "border-red-300 focus:border-red-500"
                    }`}
                    placeholder="Expliquez pourquoi le montant accordé est inférieur au montant demandé."
                  />

                  {!motifReduction.trim() ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      Cette justification est obligatoire.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 space-y-4">
                {financements.map((financement, index) => {
                  const selectedCaisse = caisses.find(
                    (item) =>
                      item.caisse_id === financement.caisse_id
                  );

                  const montantLigne = Number(
                    financement.montant || 0
                  );

                  const soldeDisponible = Number(
                    selectedCaisse?.solde_disponible || 0
                  );

                  const ligneDepasseSolde =
                    Boolean(selectedCaisse) &&
                    montantLigne > soldeDisponible;

                  const disponibleRestant =
                    soldeDisponible - montantLigne;

                  return (
                    <article
                      key={financement.key}
                      className={`rounded-[24px] border p-4 ${
                        ligneDepasseSolde
                          ? "border-red-300 bg-red-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-slate-900">
                          Source de financement {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            removeFinancement(financement.key)
                          }
                          disabled={actionLoading}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          Supprimer
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Rubrique / Caisse
                          </label>

                          <select
                            value={financement.caisse_id}
                            onChange={(event) =>
                              updateFinancement(
                                financement.key,
                                "caisse_id",
                                event.target.value
                              )
                            }
                            disabled={actionLoading}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                          >
                            <option value="">
                              Sélectionner une caisse
                            </option>

                            {caisses.map((caisse) => (
                              <option
                                key={caisse.caisse_id}
                                value={caisse.caisse_id}
                                disabled={
                                  selectedCaisseIds.includes(
                                    caisse.caisse_id
                                  ) &&
                                  caisse.caisse_id !==
                                    financement.caisse_id
                                }
                              >
                                {caisse.rubrique_nom ||
                                  caisse.caisse_libelle ||
                                  "Caisse"}{" "}
                                — Disponible :{" "}
                                {formatMoney(
                                  caisse.solde_disponible
                                )}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Montant financé
                          </label>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={financement.montant}
                            onChange={(event) =>
                              updateFinancement(
                                financement.key,
                                "montant",
                                event.target.value
                              )
                            }
                            disabled={actionLoading}
                            className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none ${
                              ligneDepasseSolde
                                ? "border-red-400 focus:border-red-500"
                                : "border-slate-300 focus:border-emerald-500"
                            }`}
                          />
                        </div>
                      </div>

                      {selectedCaisse ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase text-slate-500">
                              Rubrique
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {selectedCaisse.rubrique_nom || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase text-slate-500">
                              Disponible
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatMoney(soldeDisponible)}
                            </p>
                          </div>

                          <div
                            className={`rounded-2xl border px-4 py-3 ${
                              disponibleRestant < 0
                                ? "border-red-200 bg-red-50"
                                : "border-emerald-200 bg-emerald-50"
                            }`}
                          >
                            <p className="text-xs uppercase text-slate-500">
                              Reste après décaissement
                            </p>
                            <p
                              className={`mt-1 text-sm font-semibold ${
                                disponibleRestant < 0
                                  ? "text-red-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {formatMoney(disponibleRestant)}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {ligneDepasseSolde ? (
                        <p className="mt-3 text-sm font-semibold text-red-700">
                          Le montant dépasse le solde disponible de
                          cette caisse.
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addFinancement}
                disabled={actionLoading}
                className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
              >
                + Ajouter une rubrique de financement
              </button>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Total financé
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {formatMoney(totalFinance)}
                  </p>
                </div>

                <div
                  className={`rounded-[24px] border p-4 ${
                    totalCorrect && montantAccordeValide
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Contrôle
                  </p>
                  <p
                    className={`mt-2 text-sm font-bold ${
                      totalCorrect && montantAccordeValide
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {totalCorrect && montantAccordeValide
                      ? "Financement complet"
                      : `Écart : ${formatMoney(
                          montantAccordeNumber - totalFinance
                        )}`}
                  </p>
                </div>
              </div>

              {caisseDuplicate || rubriqueDuplicate ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Une même rubrique ou une même caisse ne peut être
                  sélectionnée plusieurs fois.
                </div>
              ) : null}

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Commentaire de décision
                </label>
                <textarea
                  value={commentaireDecision}
                  onChange={(event) =>
                    setCommentaireDecision(event.target.value)
                  }
                  disabled={actionLoading}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  placeholder="Commentaire complémentaire du bureau."
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => traiterDemande("APPROUVEE")}
                  disabled={!peutApprouver}
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Traitement..."
                    : "Valider le prêt"}
                </button>

                <button
                  type="button"
                  onClick={() => traiterDemande("REFUSEE")}
                  disabled={actionLoading}
                  className="w-full rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {actionLoading
                    ? "Traitement..."
                    : "Refuser la demande"}
                </button>
              </div>
            </section>
          ) : null}

          {demandeEnAttente && !bureau ? (
            <section className="rounded-[28px] border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800 shadow-sm">
              Cette demande est en attente de traitement par le
              bureau.
            </section>
          ) : null}

          <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Demande complète
            </h2>

            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {demande.document_texte ||
                  "Document indisponible."}
              </pre>
            </div>
          </section>
        </>
      )}
    </div>
  );
}