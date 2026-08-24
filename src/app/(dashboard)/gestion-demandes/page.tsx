"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Rubrique = {
  id: string;
  nom?: string;
  libelle?: string;
  code?: string;
};

type Caisse = {
  id: string;
  libelle: string;
  rubrique_id: string;
  rubrique_nom: string;
  solde_disponible: number;
  actif: boolean;
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

type FinancementLigne = {
  key: string;
  rubrique_id: string;
  caisse_id: string;
  montant: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
};

function formatMoney(value: number | null | undefined) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 0,
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

async function readJsonSafe(response: Response) {
  const rawText = await response.text();

  try {
    return rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(
      "La route appelée ne renvoie pas une réponse JSON valide."
    );
  }
}

function makeFinancement(
  montant = ""
): FinancementLigne {
  return {
    key: `${Date.now()}-${Math.random()}`,
    rubrique_id: "",
    caisse_id: "",
    montant,
  };
}

export default function GestionDemandesPage() {
  const [aides, setAides] = useState<DemandeAide[]>([]);
  const [prets, setPrets] = useState<DemandePret[]>([]);
  const [rubriques, setRubriques] = useState<Rubrique[]>([]);
  const [caisses, setCaisses] = useState<Caisse[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [montantsAides, setMontantsAides] =
    useState<Record<string, string>>({});

  const [rubriquesAides, setRubriquesAides] =
    useState<Record<string, string>>({});

  const [commentairesAides, setCommentairesAides] =
    useState<Record<string, string>>({});

  const [montantsPrets, setMontantsPrets] =
    useState<Record<string, string>>({});

  const [commentairesPrets, setCommentairesPrets] =
    useState<Record<string, string>>({});

  const [motifsReductionPrets, setMotifsReductionPrets] =
    useState<Record<string, string>>({});

  const [financementsPrets, setFinancementsPrets] =
    useState<Record<string, FinancementLigne[]>>({});

  const rubriquesMap = useMemo(() => {
    const map = new Map<string, Rubrique>();

    rubriques.forEach((rubrique) => {
      map.set(rubrique.id, rubrique);
    });

    return map;
  }, [rubriques]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [
        aidesRes,
        pretsRes,
        rubriquesRes,
        caissesRes,
      ] = await Promise.all([
        fetch("/api/aides", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),

        fetch("/api/prets", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),

        fetch("/api/rubriques", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),

        fetch("/api/caisses", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
      ]);

      const aidesJson =
        (await readJsonSafe(aidesRes)) as ApiResponse | null;

      const pretsJson =
        (await readJsonSafe(pretsRes)) as ApiResponse | null;

      const rubriquesJson =
        (await readJsonSafe(rubriquesRes)) as ApiResponse | null;

      const caissesJson =
        (await readJsonSafe(caissesRes)) as ApiResponse | null;

      if (!aidesRes.ok || !aidesJson?.success) {
        throw new Error(
          aidesJson?.error ||
            aidesJson?.message ||
            "Erreur lors du chargement des demandes d'aide."
        );
      }

      if (!pretsRes.ok || !pretsJson?.success) {
        throw new Error(
          pretsJson?.error ||
            pretsJson?.message ||
            "Erreur lors du chargement des demandes de prêt."
        );
      }

      if (!rubriquesRes.ok || !rubriquesJson?.success) {
        throw new Error(
          rubriquesJson?.error ||
            rubriquesJson?.message ||
            "Erreur lors du chargement des rubriques."
        );
      }

      if (!caissesRes.ok || !caissesJson?.success) {
        throw new Error(
          caissesJson?.error ||
            caissesJson?.message ||
            "Erreur lors du chargement des caisses."
        );
      }

      const nextAides = Array.isArray(aidesJson.data)
        ? aidesJson.data
        : [];

      const nextPrets = Array.isArray(pretsJson.data)
        ? pretsJson.data
        : [];

      const nextRubriques = Array.isArray(rubriquesJson.data)
        ? rubriquesJson.data
        : [];

      const rawCaisses = Array.isArray(caissesJson.data)
        ? caissesJson.data
        : [];

      const nextCaisses: Caisse[] = rawCaisses
        .map((row: any) => ({
          id: String(
            row.caisse_id ??
              row.id ??
              ""
          ),

          libelle: String(
            row.caisse_libelle ??
              row.libelle ??
              row.nom ??
              "Caisse"
          ),

          rubrique_id: String(
            row.rubrique_id ?? ""
          ),

          rubrique_nom: String(
            row.rubrique_nom ??
              row.rubrique ??
              ""
          ),

          solde_disponible: Number(
            row.solde_disponible ??
              row.solde ??
              0
          ),

          actif:
            row.actif === undefined
              ? true
              : row.actif === true,
        }))
        .filter(
          (row: Caisse) =>
            row.id &&
            row.rubrique_id &&
            row.actif
        );

      setAides(nextAides);
      setPrets(nextPrets);
      setRubriques(nextRubriques);
      setCaisses(nextCaisses);

      const nextMontantsAides: Record<string, string> = {};

      nextAides.forEach((item: DemandeAide) => {
        nextMontantsAides[item.id] = String(
          Number(item.montant_demande || 0)
        );
      });

      setMontantsAides(nextMontantsAides);

      const nextMontantsPrets: Record<string, string> = {};
      const nextFinancements: Record<
        string,
        FinancementLigne[]
      > = {};

      nextPrets.forEach((item: DemandePret) => {
        const montant = String(
          Number(item.montant_demande || 0)
        );

        nextMontantsPrets[item.id] = montant;

        nextFinancements[item.id] = [
          makeFinancement(montant),
        ];
      });

      setMontantsPrets(nextMontantsPrets);
      setFinancementsPrets(nextFinancements);
    } catch (err: any) {
      setAides([]);
      setPrets([]);
      setRubriques([]);
      setCaisses([]);

      setError(
        err?.message ||
          "Erreur lors du chargement des demandes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateFinancement(
    demandeId: string,
    ligneKey: string,
    patch: Partial<FinancementLigne>
  ) {
    setFinancementsPrets((current) => ({
      ...current,

      [demandeId]: (
        current[demandeId] ?? []
      ).map((ligne) =>
        ligne.key === ligneKey
          ? {
              ...ligne,
              ...patch,
            }
          : ligne
      ),
    }));
  }

  function ajouterFinancement(demandeId: string) {
    setFinancementsPrets((current) => ({
      ...current,

      [demandeId]: [
        ...(current[demandeId] ?? []),
        makeFinancement(""),
      ],
    }));
  }

  function supprimerFinancement(
    demandeId: string,
    ligneKey: string
  ) {
    setFinancementsPrets((current) => {
      const lignes =
        current[demandeId] ?? [];

      if (lignes.length <= 1) {
        return current;
      }

      return {
        ...current,

        [demandeId]: lignes.filter(
          (ligne) => ligne.key !== ligneKey
        ),
      };
    });
  }

  function totalFinance(demandeId: string) {
    return (
      financementsPrets[demandeId] ?? []
    ).reduce(
      (total, ligne) =>
        total + Number(ligne.montant || 0),
      0
    );
  }

  async function traiterAide(
    demandeId: string,
    decision: "APPROUVEE" | "REFUSEE"
  ) {
    try {
      setActionLoadingId(demandeId);
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/aides/decision",
        {
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
                ? Number(
                    montantsAides[demandeId] || 0
                  )
                : null,

            rubrique_id:
              decision === "APPROUVEE"
                ? rubriquesAides[demandeId] || null
                : null,

            commentaire_decision:
              commentairesAides[demandeId] ||
              null,
          }),
        }
      );

      const json =
        (await readJsonSafe(
          response
        )) as ApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error ||
            json?.message ||
            "Erreur lors du traitement de la demande d'aide."
        );
      }

      setSuccess(
        json?.message ||
          "Demande d'aide traitée avec succès."
      );

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du traitement de la demande d'aide."
      );
    } finally {
      setActionLoadingId("");
    }
  }

  async function traiterPret(
    demande: DemandePret,
    decision: "APPROUVEE" | "REFUSEE"
  ) {
    try {
      const demandeId = demande.id;

      setActionLoadingId(demandeId);
      setError("");
      setSuccess("");

      const montantDemande = Number(
        demande.montant_demande || 0
      );

      const montantAccorde = Number(
        montantsPrets[demandeId] || 0
      );

      const lignes =
        financementsPrets[demandeId] ?? [];

      if (decision === "APPROUVEE") {
        if (
          !Number.isFinite(montantAccorde) ||
          montantAccorde <= 0
        ) {
          throw new Error(
            "Le montant accordé doit être supérieur à zéro."
          );
        }

        if (montantAccorde > montantDemande) {
          throw new Error(
            "Le montant accordé ne peut pas dépasser le montant demandé."
          );
        }

        if (
          montantAccorde < montantDemande &&
          !String(
            motifsReductionPrets[demandeId] || ""
          ).trim()
        ) {
          throw new Error(
            "Le motif de réduction est obligatoire lorsque le montant accordé est inférieur au montant demandé."
          );
        }

        if (lignes.length === 0) {
          throw new Error(
            "Ajoutez au moins une caisse de financement."
          );
        }

        const caisseIds = lignes.map(
          (ligne) => ligne.caisse_id
        );

        if (
          caisseIds.some((id) => !id)
        ) {
          throw new Error(
            "Sélectionnez une caisse sur chaque ligne de financement."
          );
        }

        if (
          new Set(caisseIds).size !==
          caisseIds.length
        ) {
          throw new Error(
            "Une même caisse ne peut pas être utilisée deux fois pour le même prêt."
          );
        }

        for (const ligne of lignes) {
          if (!ligne.rubrique_id) {
            throw new Error(
              "Sélectionnez une rubrique sur chaque ligne."
            );
          }

          const montant = Number(
            ligne.montant || 0
          );

          if (
            !Number.isFinite(montant) ||
            montant <= 0
          ) {
            throw new Error(
              "Chaque montant de financement doit être supérieur à zéro."
            );
          }

          const caisse = caisses.find(
            (item) =>
              item.id === ligne.caisse_id
          );

          if (!caisse) {
            throw new Error(
              "Une caisse sélectionnée est introuvable."
            );
          }

          if (
            caisse.rubrique_id !==
            ligne.rubrique_id
          ) {
            throw new Error(
              `La caisse ${caisse.libelle} ne correspond pas à la rubrique sélectionnée.`
            );
          }

          if (
            montant >
            Number(caisse.solde_disponible || 0)
          ) {
            throw new Error(
              `Le montant demandé dans ${caisse.libelle} dépasse son solde disponible de ${formatMoney(
                caisse.solde_disponible
              )}.`
            );
          }
        }

        const total = totalFinance(demandeId);

        if (
          Math.abs(
            total - montantAccorde
          ) > 0.001
        ) {
          throw new Error(
            `Le total financé (${formatMoney(
              total
            )}) doit être exactement égal au montant accordé (${formatMoney(
              montantAccorde
            )}).`
          );
        }
      }

      const response = await fetch(
        "/api/prets/valider",
        {
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
                ? montantAccorde
                : null,

            motif_reduction:
              decision === "APPROUVEE"
                ? String(
                    motifsReductionPrets[
                      demandeId
                    ] || ""
                  ).trim() || null
                : null,

            commentaire_decision:
              commentairesPrets[demandeId] ||
              null,

            financements:
              decision === "APPROUVEE"
                ? lignes.map((ligne) => ({
                    rubrique_id:
                      ligne.rubrique_id,

                    caisse_id:
                      ligne.caisse_id,

                    montant:
                      Number(
                        ligne.montant || 0
                      ),
                  }))
                : [],
          }),
        }
      );

      const json =
        (await readJsonSafe(
          response
        )) as ApiResponse | null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error ||
            json?.message ||
            "Erreur lors du traitement de la demande de prêt."
        );
      }

      setSuccess(
        json?.message ||
          "Demande de prêt traitée avec succès."
      );

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur lors du traitement de la demande de prêt."
      );
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <section className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Gestion des demandes
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
              Traitement des aides et des prêts
            </h1>

            <p className="mt-3 text-sm text-slate-600">
              Le Bureau peut ajuster le montant accordé et répartir un prêt entre plusieurs caisses.
            </p>
          </div>

          <Link
            href="/caisse"
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Voir les caisses
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Chargement...
        </div>
      ) : null}

      {!loading ? (
        <>
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Demandes de prêts
            </h2>

            {prets.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Aucune demande de prêt en attente.
              </div>
            ) : null}

            {prets.map((pret) => {
              const montantDemande = Number(
                pret.montant_demande || 0
              );

              const montantAccorde = Number(
                montantsPrets[pret.id] || 0
              );

              const lignes =
                financementsPrets[pret.id] ??
                [];

              const total =
                totalFinance(pret.id);

              const totalOk =
                Math.abs(
                  total - montantAccorde
                ) <= 0.001;

              return (
                <article
                  key={pret.id}
                  className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-sm md:p-7"
                >
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Montant demandé
                      </p>

                      <p className="mt-2 text-xl font-bold text-slate-900">
                        {formatMoney(
                          montantDemande
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Montant accordé
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          montantsPrets[
                            pret.id
                          ] ?? ""
                        }
                        onChange={(event) => {
                          setMontantsPrets(
                            (current) => ({
                              ...current,
                              [pret.id]:
                                event.target
                                  .value,
                            })
                          );
                        }}
                        className="h-12 w-full rounded-2xl border border-slate-300 px-4 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Statut
                      </p>

                      <p className="mt-2 font-bold text-slate-800">
                        {pret.statut ??
                          "EN_ATTENTE"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Date
                      </p>

                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {formatDate(
                          pret.created_at
                        )}
                      </p>
                    </div>
                  </div>

                  {pret.motif ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Motif de la demande
                      </p>

                      <p className="mt-2 text-sm text-slate-800">
                        {pret.motif}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Répartition du financement
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Ajoutez autant de caisses que nécessaire.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          ajouterFinancement(
                            pret.id
                          )
                        }
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        + Ajouter une caisse
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {lignes.map(
                        (ligne, index) => {
                          const caissesRubrique =
                            caisses.filter(
                              (caisse) =>
                                caisse.rubrique_id ===
                                ligne.rubrique_id
                            );

                          const caisse =
                            caisses.find(
                              (item) =>
                                item.id ===
                                ligne.caisse_id
                            );

                          return (
                            <div
                              key={
                                ligne.key
                              }
                              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto]"
                            >
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Rubrique
                                </label>

                                <select
                                  value={
                                    ligne.rubrique_id
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateFinancement(
                                      pret.id,
                                      ligne.key,
                                      {
                                        rubrique_id:
                                          event
                                            .target
                                            .value,
                                        caisse_id:
                                          "",
                                      }
                                    )
                                  }
                                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                                >
                                  <option value="">
                                    Choisir
                                  </option>

                                  {rubriques.map(
                                    (
                                      rubrique
                                    ) => (
                                      <option
                                        key={
                                          rubrique.id
                                        }
                                        value={
                                          rubrique.id
                                        }
                                      >
                                        {rubrique.nom ??
                                          rubrique.libelle ??
                                          rubrique.code ??
                                          "Rubrique"}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Caisse
                                </label>

                                <select
                                  value={
                                    ligne.caisse_id
                                  }
                                  disabled={
                                    !ligne.rubrique_id
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateFinancement(
                                      pret.id,
                                      ligne.key,
                                      {
                                        caisse_id:
                                          event
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 disabled:bg-slate-100"
                                >
                                  <option value="">
                                    Choisir une caisse
                                  </option>

                                  {caissesRubrique.map(
                                    (
                                      item
                                    ) => (
                                      <option
                                        key={
                                          item.id
                                        }
                                        value={
                                          item.id
                                        }
                                      >
                                        {
                                          item.libelle
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Disponible
                                </label>

                                <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                                  {caisse
                                    ? formatMoney(
                                        caisse.solde_disponible
                                      )
                                    : "-"}
                                </div>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">
                                  Montant
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  value={
                                    ligne.montant
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateFinancement(
                                      pret.id,
                                      ligne.key,
                                      {
                                        montant:
                                          event
                                            .target
                                            .value,
                                      }
                                    )
                                  }
                                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  disabled={
                                    lignes.length <=
                                    1
                                  }
                                  onClick={() =>
                                    supprimerFinancement(
                                      pret.id,
                                      ligne.key
                                    )
                                  }
                                  className="h-11 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                  title={`Supprimer la ligne ${
                                    index + 1
                                  }`}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">
                          Total financé
                        </p>

                        <p
                          className={`text-xl font-bold ${
                            totalOk
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {formatMoney(total)}
                        </p>
                      </div>

                      <div className="text-sm font-medium">
                        {totalOk ? (
                          <span className="text-emerald-700">
                            ✓ Correspond au montant accordé
                          </span>
                        ) : (
                          <span className="text-red-600">
                            Le total doit être égal à{" "}
                            {formatMoney(
                              montantAccorde
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {montantAccorde <
                  montantDemande ? (
                    <div className="mt-5">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Motif de réduction *
                      </label>

                      <textarea
                        value={
                          motifsReductionPrets[
                            pret.id
                          ] ?? ""
                        }
                        onChange={(event) =>
                          setMotifsReductionPrets(
                            (current) => ({
                              ...current,
                              [pret.id]:
                                event.target
                                  .value,
                            })
                          )
                        }
                        placeholder="Expliquez pourquoi le montant accordé est inférieur au montant demandé."
                        className="min-h-24 w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Commentaire de décision
                    </label>

                    <textarea
                      value={
                        commentairesPrets[
                          pret.id
                        ] ?? ""
                      }
                      onChange={(event) =>
                        setCommentairesPrets(
                          (current) => ({
                            ...current,
                            [pret.id]:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="min-h-24 w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/prets/demande/${pret.id}`}
                      className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Ouvrir la demande complète
                    </Link>

                    <button
                      type="button"
                      disabled={
                        actionLoadingId ===
                        pret.id
                      }
                      onClick={() =>
                        traiterPret(
                          pret,
                          "REFUSEE"
                        )
                      }
                      className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Refuser
                    </button>

                    <button
                      type="button"
                      disabled={
                        actionLoadingId ===
                          pret.id ||
                        !totalOk
                      }
                      onClick={() =>
                        traiterPret(
                          pret,
                          "APPROUVEE"
                        )
                      }
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLoadingId ===
                      pret.id
                        ? "Traitement..."
                        : "Approuver"}
                    </button>
                  </div>

                  {pret.document_texte ? (
                    <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer font-semibold text-slate-800">
                        Voir le document signé
                      </summary>

                      <pre className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-700">
                        {
                          pret.document_texte
                        }
                      </pre>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              Demandes d'aides
            </h2>

            {aides.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Aucune demande d'aide en attente.
              </div>
            ) : null}

            {aides.map((aide) => (
              <article
                key={aide.id}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-7"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Montant demandé
                    </p>

                    <p className="mt-2 text-xl font-bold">
                      {formatMoney(
                        aide.montant_demande
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Montant accordé
                    </label>

                    <input
                      type="number"
                      value={
                        montantsAides[
                          aide.id
                        ] ?? ""
                      }
                      onChange={(event) =>
                        setMontantsAides(
                          (current) => ({
                            ...current,
                            [aide.id]:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-300 px-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Rubrique de décaissement
                    </label>

                    <select
                      value={
                        rubriquesAides[
                          aide.id
                        ] ?? ""
                      }
                      onChange={(event) =>
                        setRubriquesAides(
                          (current) => ({
                            ...current,
                            [aide.id]:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                    >
                      <option value="">
                        Choisir
                      </option>

                      {rubriques.map(
                        (rubrique) => (
                          <option
                            key={rubrique.id}
                            value={rubrique.id}
                          >
                            {rubrique.nom ??
                              rubrique.libelle ??
                              rubrique.code ??
                              "Rubrique"}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Commentaire de décision
                  </label>

                  <textarea
                    value={
                      commentairesAides[
                        aide.id
                      ] ?? ""
                    }
                    onChange={(event) =>
                      setCommentairesAides(
                        (current) => ({
                          ...current,
                          [aide.id]:
                            event.target.value,
                        })
                      )
                    }
                    className="min-h-20 w-full rounded-2xl border border-slate-300 p-4"
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={
                      actionLoadingId ===
                      aide.id
                    }
                    onClick={() =>
                      traiterAide(
                        aide.id,
                        "REFUSEE"
                      )
                    }
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                  >
                    Refuser
                  </button>

                  <button
                    type="button"
                    disabled={
                      actionLoadingId ===
                      aide.id
                    }
                    onClick={() =>
                      traiterAide(
                        aide.id,
                        "APPROUVEE"
                      )
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Approuver
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
