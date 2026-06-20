import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MembreRow = {
  id: string;
  nom_complet: string | null;
  nom: string | null;
  prenom: string | null;
};

type ContributionDateRow = {
  date_contribution: string | null;
};

type RubriqueRow = {
  rubrique_id: string;
  rubrique_nom: string;
  ordre_affichage: number | null;
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

function toYear(value: string | null) {
  if (!value || value.length < 4) return null;
  return value.slice(0, 4);
}

export async function GET() {
  try {
    const supabase = getAdminClient();

    const [membresResult, contributionsResult, rubriquesResult] = await Promise.all([
      supabase
        .from("membres")
        .select("id, nom_complet, nom, prenom")
        .order("nom_complet", { ascending: true }),
      supabase
        .from("contributions")
        .select("date_contribution")
        .order("date_contribution", { ascending: false })
        .limit(2000),
      supabase
        .from("v_contributions_imputations")
        .select("rubrique_id, rubrique_nom, ordre_affichage")
        .order("ordre_affichage", { ascending: true })
        .limit(2000),
    ]);

    if (membresResult.error) throw membresResult.error;
    if (contributionsResult.error) throw contributionsResult.error;
    if (rubriquesResult.error) throw rubriquesResult.error;

    const membres = ((membresResult.data ?? []) as MembreRow[]).map((membre) => ({
      id: membre.id,
      nom_complet: buildMemberName(membre),
    }));

    const yearsSet = new Set<string>();
    ((contributionsResult.data ?? []) as ContributionDateRow[]).forEach((row) => {
      const year = toYear(row.date_contribution);
      if (year) yearsSet.add(year);
    });

    const rubriquesMap = new Map<string, { id: string; nom: string; ordre_affichage: number }>();
    ((rubriquesResult.data ?? []) as RubriqueRow[]).forEach((row) => {
      if (!row.rubrique_id) return;
      if (!rubriquesMap.has(row.rubrique_id)) {
        rubriquesMap.set(row.rubrique_id, {
          id: row.rubrique_id,
          nom: row.rubrique_nom || "Rubrique sans nom",
          ordre_affichage: Number(row.ordre_affichage ?? 999),
        });
      }
    });

    const annees = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    const rubriques = Array.from(rubriquesMap.values()).sort(
      (a, b) => a.ordre_affichage - b.ordre_affichage || a.nom.localeCompare(b.nom)
    );

    return NextResponse.json({
      success: true,
      membres,
      annees,
      rubriques,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Impossible de charger les filtres d'historique encaissements",
      },
      { status: 500 }
    );
  }
}
