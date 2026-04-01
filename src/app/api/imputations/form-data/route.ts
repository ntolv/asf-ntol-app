import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MembreRow = {
  id: string;
  nom_complet: string | null;
  nom: string | null;
  prenom: string | null;
};

type ContributionPeriodRow = {
  date_contribution: string | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function buildMemberName(membre: MembreRow) {
  return (
    membre.nom_complet?.trim() ||
    `${membre.nom ?? ""} ${membre.prenom ?? ""}`.trim() ||
    "Membre sans nom"
  );
}

function toPeriod(value: string | null) {
  if (!value || value.length < 7) return null;
  return value.slice(0, 7);
}

export async function GET() {
  try {
    const supabase = getAdminClient();

    const [membresResult, contributionsResult] = await Promise.all([
      supabase
        .from("membres")
        .select("id, nom_complet, nom, prenom")
        .order("nom_complet", { ascending: true }),
      supabase
        .from("contributions")
        .select("date_contribution")
        .order("date_contribution", { ascending: false })
        .limit(500),
    ]);

    if (membresResult.error) {
      throw membresResult.error;
    }

    if (contributionsResult.error) {
      throw contributionsResult.error;
    }

    const membres = ((membresResult.data ?? []) as MembreRow[]).map((membre) => ({
      id: membre.id,
      nom_complet: buildMemberName(membre),
    }));

    const periodsSet = new Set<string>();
    ((contributionsResult.data ?? []) as ContributionPeriodRow[]).forEach((row) => {
      const period = toPeriod(row.date_contribution);
      if (period) periodsSet.add(period);
    });

    const periodes = Array.from(periodsSet).sort((a, b) => b.localeCompare(a));

    return NextResponse.json({
      success: true,
      membres,
      periodes,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Impossible de charger les filtres d'imputations",
      },
      { status: 500 }
    );
  }
}