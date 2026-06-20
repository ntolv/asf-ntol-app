import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ImputationRow = {
  contribution_id: string;
  membre_id: string;
  membre_nom: string;
  date_contribution: string;
  montant_total: number;
  statut: string;
  ligne_id: string;
  rubrique_id: string;
  rubrique_nom: string;
  montant_ligne: number;
  ordre_affichage: number;
  contribution_created_at?: string;
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

function getYearRange(yearValue: string) {
  const match = /^(\d{4})$/.exec(yearValue);
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;

  return {
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const membreId = searchParams.get("membre_id")?.trim() || "";
    const annee = searchParams.get("annee")?.trim() || "";
    const rubriqueId = searchParams.get("rubrique_id")?.trim() || "";

    let query = supabase
      .from("v_contributions_imputations")
      .select("*")
      .order("date_contribution", { ascending: false })
      .order("contribution_created_at", { ascending: false })
      .order("ordre_affichage", { ascending: true });

    if (membreId) {
      query = query.eq("membre_id", membreId);
    }

    if (rubriqueId) {
      query = query.eq("rubrique_id", rubriqueId);
    }

    if (annee) {
      const range = getYearRange(annee);
      if (!range) {
        return NextResponse.json(
          { success: false, message: "Année invalide. Format attendu : YYYY" },
          { status: 400 }
        );
      }

      query = query.gte("date_contribution", range.start).lt("date_contribution", range.end);
    }

    const { data, error } = await query.limit(2000);

    if (error) throw error;

    const rows = (data ?? []) as ImputationRow[];

    const groupedMap = new Map<
      string,
      {
        contribution_id: string;
        membre_id: string;
        membre_nom: string;
        date_contribution: string;
        montant_total: number;
        statut: string;
        lignes: Array<{
          ligne_id: string;
          rubrique_id: string;
          rubrique_nom: string;
          montant_ligne: number;
          ordre_affichage: number;
        }>;
      }
    >();

    for (const row of rows) {
      if (!groupedMap.has(row.contribution_id)) {
        groupedMap.set(row.contribution_id, {
          contribution_id: row.contribution_id,
          membre_id: row.membre_id,
          membre_nom: row.membre_nom,
          date_contribution: row.date_contribution,
          montant_total: 0,
          statut: row.statut,
          lignes: [],
        });
      }

      const group = groupedMap.get(row.contribution_id)!;

      group.lignes.push({
        ligne_id: row.ligne_id,
        rubrique_id: row.rubrique_id,
        rubrique_nom: row.rubrique_nom,
        montant_ligne: Number(row.montant_ligne ?? 0),
        ordre_affichage: Number(row.ordre_affichage ?? 0),
      });
    }

    const contributions = Array.from(groupedMap.values()).map((item) => {
      const lignes = item.lignes.sort((a, b) => a.ordre_affichage - b.ordre_affichage);
      const totalFiltre = lignes.reduce((sum, ligne) => sum + Number(ligne.montant_ligne ?? 0), 0);

      return {
        ...item,
        montant_total: totalFiltre,
        lignes,
      };
    });

    return NextResponse.json({
      success: true,
      filters: {
        membre_id: membreId || null,
        annee: annee || null,
        rubrique_id: rubriqueId || null,
      },
      count: contributions.length,
      contributions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Impossible de charger l'historique des encaissements",
      },
      { status: 500 }
    );
  }
}
