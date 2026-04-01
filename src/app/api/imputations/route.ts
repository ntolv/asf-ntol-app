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

function getPeriodRange(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const start = `${match[1]}-${match[2]}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const endYear = nextMonthDate.getUTCFullYear();
  const endMonth = String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0");
  const end = `${endYear}-${endMonth}-01`;

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const membreId = searchParams.get("membre_id")?.trim() || "";
    const periode = searchParams.get("periode")?.trim() || "";

    let query = supabase
      .from("v_contributions_imputations")
      .select("*")
      .order("date_contribution", { ascending: false })
      .order("contribution_created_at", { ascending: false })
      .order("ordre_affichage", { ascending: true });

    if (membreId) {
      query = query.eq("membre_id", membreId);
    }

    if (periode) {
      const range = getPeriodRange(periode);
      if (!range) {
        return NextResponse.json(
          { success: false, message: "Période invalide. Format attendu : YYYY-MM" },
          { status: 400 }
        );
      }

      query = query.gte("date_contribution", range.start).lt("date_contribution", range.end);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      throw error;
    }

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
          montant_total: Number(row.montant_total ?? 0),
          statut: row.statut,
          lignes: [],
        });
      }

      groupedMap.get(row.contribution_id)!.lignes.push({
        ligne_id: row.ligne_id,
        rubrique_id: row.rubrique_id,
        rubrique_nom: row.rubrique_nom,
        montant_ligne: Number(row.montant_ligne ?? 0),
        ordre_affichage: Number(row.ordre_affichage ?? 0),
      });
    }

    const contributions = Array.from(groupedMap.values()).map((item) => ({
      ...item,
      lignes: item.lignes.sort((a, b) => a.ordre_affichage - b.ordre_affichage),
    }));

    return NextResponse.json({
      success: true,
      filters: {
        membre_id: membreId || null,
        periode: periode || null,
      },
      count: contributions.length,
      contributions,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Impossible de charger les imputations",
      },
      { status: 500 }
    );
  }
}