import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CycleRow = {
  id?: string;
  libelle_cycle?: string | null;
  montant_fixe_par_tontineur?: number | string | null;
  nb_tontineurs_inscrits?: number | null;
  mise_brute_cycle?: number | string | null;
  mise_brute_session?: number | string | null;
  date_debut_cycle?: string | null;
  date_fin_cycle?: string | null;
  annee_cycle?: number | null;
  created_at?: string | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function buildCyclePayload(row: CycleRow | null) {
  if (!row) {
    return {
      configured: false,
      libelle_cycle: null,
      montant_fixe_par_tontineur: null,
      nb_tontineurs_inscrits: 0,
      mise_brute_cycle: null,
      mise_brute_session: null,
      date_debut_cycle: null,
      date_fin_cycle: null,
      annee_cycle: null,
    };
  }

  return {
    configured: true,
    libelle_cycle: row.libelle_cycle ?? null,
    montant_fixe_par_tontineur: row.montant_fixe_par_tontineur ?? null,
    nb_tontineurs_inscrits: row.nb_tontineurs_inscrits ?? 0,
    mise_brute_cycle: row.mise_brute_cycle ?? null,
    mise_brute_session: row.mise_brute_session ?? null,
    date_debut_cycle: row.date_debut_cycle ?? null,
    date_fin_cycle: row.date_fin_cycle ?? null,
    annee_cycle: row.annee_cycle ?? null,
  };
}

async function getLatestCycleParams(): Promise<CycleRow | null> {
  const { data, error } = await supabase
    .from("tontine_parametres_cycle")
    .select(
      [
        "id",
        "libelle_cycle",
        "montant_fixe_par_tontineur",
        "nb_tontineurs_inscrits",
        "mise_brute_cycle",
        "mise_brute_session",
        "date_debut_cycle",
        "date_fin_cycle",
        "annee_cycle",
        "created_at",
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CycleRow | null) ?? null;
}

async function getTontineursCount(): Promise<number> {
  const activeView = await supabase
    .from("v_tontine_tontineurs_actifs")
    .select("*", { count: "exact", head: true });

  if (!activeView.error && typeof activeView.count === "number") {
    return activeView.count;
  }

  const membresView = await supabase
    .from("v_membres")
    .select("*", { count: "exact", head: true })
    .eq("categorie", "TONTINEUR");

  if (!membresView.error && typeof membresView.count === "number") {
    return membresView.count;
  }

  const membresTable = await supabase
    .from("membres")
    .select("*", { count: "exact", head: true })
    .eq("categorie", "TONTINEUR");

  if (!membresTable.error && typeof membresTable.count === "number") {
    return membresTable.count;
  }

  return 0;
}

function buildCalculDetail(
  montant: number | null,
  nbTontineurs: number,
  dateDebut: string | null,
  dateFin: string | null
) {
  if (montant === null) return null;
  return `Cycle de 12 mois du ${dateDebut ?? "-"} au ${dateFin ?? "-"} | mise unitaire ${montant} | tontineurs ${nbTontineurs}`;
}

export async function GET() {
  try {
    const row = await getLatestCycleParams();
    const payload = buildCyclePayload(row);

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Impossible de charger les paramètres du cycle.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const montant = toNumber(body?.montant_fixe_par_tontineur);
    const anneeCycle = toNumber(body?.annee_cycle);
    const libelleCycle =
      typeof body?.libelle_cycle === "string" && body.libelle_cycle.trim().length > 0
        ? body.libelle_cycle.trim()
        : null;

    const dateDebutCycle = toDateString(body?.date_debut_cycle);
    const dateFinCycle = toDateString(body?.date_fin_cycle);

    if (montant === null || montant <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Le montant fixe par tontineur est obligatoire et doit être supérieur à 0.",
        },
        { status: 400 }
      );
    }

    const nbTontineursInscrits = await getTontineursCount();
    const miseBruteCycle = montant * nbTontineursInscrits * 12;
    const miseBruteSession =
      nbTontineursInscrits > 0 ? miseBruteCycle / nbTontineursInscrits : 0;

    const rowToSave = {
      libelle_cycle: libelleCycle,
      montant_fixe_par_tontineur: montant,
      nb_tontineurs_inscrits: nbTontineursInscrits,
      mise_brute_cycle: miseBruteCycle,
      mise_brute_session: miseBruteSession,
      date_debut_cycle: dateDebutCycle,
      date_fin_cycle: dateFinCycle,
      annee_cycle: anneeCycle,
    };

    const existing = await getLatestCycleParams();

    let savedRow: CycleRow | null = null;

    if (existing?.id) {
      const { data, error } = await supabase
        .from("tontine_parametres_cycle")
        .update(rowToSave)
        .eq("id", existing.id)
        .select(
          [
            "id",
            "libelle_cycle",
            "montant_fixe_par_tontineur",
            "nb_tontineurs_inscrits",
            "mise_brute_cycle",
            "mise_brute_session",
            "date_debut_cycle",
            "date_fin_cycle",
            "annee_cycle",
            "created_at",
          ].join(",")
        )
        .single();

      if (error) {
        throw error;
      }

      savedRow = (data as CycleRow) ?? null;
    } else {
      const { data, error } = await supabase
        .from("tontine_parametres_cycle")
        .insert(rowToSave)
        .select(
          [
            "id",
            "libelle_cycle",
            "montant_fixe_par_tontineur",
            "nb_tontineurs_inscrits",
            "mise_brute_cycle",
            "mise_brute_session",
            "date_debut_cycle",
            "date_fin_cycle",
            "annee_cycle",
            "created_at",
          ].join(",")
        )
        .single();

      if (error) {
        throw error;
      }

      savedRow = (data as CycleRow) ?? null;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Paramètres du cycle enregistrés avec succès",
        ...buildCyclePayload(savedRow),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Impossible d'enregistrer les paramètres du cycle.",
      },
      { status: 500 }
    );
  }
}
