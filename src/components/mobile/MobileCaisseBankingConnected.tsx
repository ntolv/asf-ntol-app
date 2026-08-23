"use client";

import { useEffect, useMemo, useState } from "react";
import MobileCaisseBanking, {
  type MobileCaisseMovementItem,
  type MobileCaisseRubriqueItem,
  type MobileCaisseSummary,
} from "./MobileCaisseBanking";

type GenericRow = Record<string, unknown>;

type LoadState = {
  loading: boolean;
  error: string | null;
  summary: MobileCaisseSummary;
  rubriques: MobileCaisseRubriqueItem[];
  mouvements: MobileCaisseMovementItem[];
};

const EMPTY_SUMMARY: MobileCaisseSummary = {
  totalAttendu: "—",
  totalVerse: "—",
  resteAPayer: "—",
  totalEncheres: "—",
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatMoney(value: unknown): string {
  const amount = toNumber(value);
  if (amount === null) return "—";
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function firstString(row: GenericRow, keys: string[], fallback = "—"): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function firstNumber(row: GenericRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    const parsed = toNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function firstDateString(row: GenericRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function toneFromStatut(statut: string): "success" | "warning" | "danger" | "neutral" {
  const s = statut.toLowerCase();

  if (s.includes("paye") || s.includes("payé") || s.includes("jour") || s.includes("valid")) {
    return "success";
  }

  if (s.includes("retard") || s.includes("impay") || s.includes("bloqu")) {
    return "danger";
  }

  if (s.includes("attente") || s.includes("partiel") || s.includes("decaissement") || s.includes("sans_attendu")) {
    return "warning";
  }

  return "neutral";
}

function buildRubrique(row: GenericRow, index: number): MobileCaisseRubriqueItem {
  const statut = firstString(
    row,
    ["statut", "statut_paiement", "etat", "status"],
    "Information"
  );

  return {
    id: String(row["id"] ?? row["rubrique_id"] ?? index),
    label: firstString(
      row,
      ["rubrique", "rubrique_nom", "libelle_rubrique", "nom_rubrique", "libelle"],
      "Rubrique"
    ),
    attendu: formatMoney(
      firstNumber(row, ["montant_attendu", "total_attendu", "attendu"])
    ),
    verse: formatMoney(
      firstNumber(row, ["montant_verse", "total_verse", "verse"])
    ),
    reste: formatMoney(
      firstNumber(row, ["reste_a_payer", "reste", "solde_restant"])
    ),
    statutLabel: statut,
    statutTone: toneFromStatut(statut),
  };
}

function buildContributionMovement(row: GenericRow, index: number): MobileCaisseMovementItem {
  const dateText = formatDate(
    firstDateString(row, ["date_contribution", "date_paiement", "created_at"])
  );

  return {
    id: "contribution-" + String(row["id"] ?? index),
    title: firstString(
      row,
      ["rubrique_nom", "libelle_rubrique", "nom_rubrique", "libelle", "reference_paiement"],
      "Contribution"
    ),
    subtitle: "Contribution",
    amount: formatMoney(
      firstNumber(row, ["montant_total", "montant", "montant_verse"])
    ),
    meta: dateText,
    tone: "success",
  };
}

function buildDecaissementMovement(row: GenericRow, index: number): MobileCaisseMovementItem {
  const dateText = formatDate(
    firstDateString(row, ["date_decaissement", "date_operation", "created_at"])
  );

  return {
    id: "decaissement-" + String(row["id"] ?? index),
    title: firstString(
      row,
      ["rubrique_nom", "libelle_rubrique", "nom_rubrique", "libelle", "caisse_libelle"],
      "Décaissement"
    ),
    subtitle: "Décaissement",
    amount: formatMoney(
      firstNumber(row, ["montant_total", "montant", "montant_decaisse"])
    ),
    meta: dateText,
    tone: "warning",
  };
}

export default function MobileCaisseBankingConnected() {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    summary: EMPTY_SUMMARY,
    rubriques: [],
    mouvements: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response =
          await fetch(
            "/api/mobile/caisse",
            {
              credentials:
                "include",

              cache:
                "no-store",
            }
          );

        const json =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !response.ok ||
          !json?.success ||
          !json?.data
        ) {
          throw new Error(
            json?.message ||
              "Impossible de charger la situation de caisse."
          );
        }

        const caissesRows =
          Array.isArray(
            json.data.caisses
          )
            ? (
                json.data.caisses as GenericRow[]
              )
            : [];

        const contributionsRows =
          Array.isArray(
            json.data.contributions
          )
            ? (
                json.data.contributions as GenericRow[]
              )
            : [];

        const decaissementsRows =
          Array.isArray(
            json.data.decaissements
          )
            ? (
                json.data.decaissements as GenericRow[]
              )
            : [];

        const rubriques = caissesRows.map(buildRubrique);
        const firstCaisse = caissesRows[0] ?? {};

        const summary: MobileCaisseSummary = {
          totalAttendu: formatMoney(firstNumber(firstCaisse, ["total_attendu_global"])),
          totalVerse: formatMoney(firstNumber(firstCaisse, ["total_verse_global"])),
          resteAPayer: formatMoney(firstNumber(firstCaisse, ["total_reste_global"])),
          totalEncheres: formatMoney(firstNumber(firstCaisse, ["montant_total_encheres"])),
        };

        const mouvements = [
          ...contributionsRows.map(buildContributionMovement),
          ...decaissementsRows.map(buildDecaissementMovement),
        ].slice(0, 6);

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            summary,
            rubriques,
            mouvements,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "Erreur de chargement",
            summary: EMPTY_SUMMARY,
            rubriques: [],
            mouvements: [],
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => state.summary, [state.summary]);

  return (
    <div className="space-y-4">
      <MobileCaisseBanking
        summary={{
          totalAttendu: state.loading ? "Chargement..." : summary.totalAttendu,
          totalVerse: state.loading ? "Chargement..." : summary.totalVerse,
          resteAPayer: state.loading ? "Chargement..." : summary.resteAPayer,
          totalEncheres: state.loading ? "Chargement..." : summary.totalEncheres,
        }}
        rubriques={state.rubriques}
        mouvements={state.mouvements}
      />

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}
    </div>
  );
}