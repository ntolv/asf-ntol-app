import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ContributionLineInput = {
  rubrique_id?: string;
  montant?: number;
};

type ContributionCreateBody = {
  membre_id?: string;
  date_contribution?: string;
  lignes?: ContributionLineInput[];
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContributionCreateBody;

    const membreId = String(body?.membre_id ?? "").trim();
    const dateContribution = String(body?.date_contribution ?? "").trim();
    const lignes = Array.isArray(body?.lignes) ? body.lignes : [];

    if (!membreId) {
      return NextResponse.json(
        { success: false, message: "Le membre est obligatoire" },
        { status: 400 }
      );
    }

    const lignesPropres = lignes
      .map((ligne) => ({
        rubrique_id: String(ligne?.rubrique_id ?? "").trim(),
        montant: Number(ligne?.montant ?? 0),
      }))
      .filter((ligne) => ligne.rubrique_id && Number.isFinite(ligne.montant) && ligne.montant > 0);

    if (lignesPropres.length === 0) {
      return NextResponse.json(
        { success: false, message: "Aucune ligne de contribution valide" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase.rpc("fn_contribution_create", {
      p_membre_id: membreId,
      p_lignes: lignesPropres,
      p_date_contribution: dateContribution || null,
    });

    if (error) {
      throw error;
    }

    const result = data as {
      success?: boolean;
      message?: string;
      contribution_id?: string;
      membre_id?: string;
      montant_total?: number;
      date_contribution?: string;
    } | null;

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          message: result?.message || "Création de la contribution impossible",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Contribution enregistrée avec succès",
      contribution_id: result.contribution_id,
      membre_id: result.membre_id,
      montant_total: result.montant_total,
      date_contribution: result.date_contribution,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur serveur lors de la création de la contribution",
      },
      { status: 500 }
    );
  }
}
