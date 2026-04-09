import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);

    const membreId = searchParams.get("membre_id");
    const rubrique = searchParams.get("rubrique");
    const periode = searchParams.get("periode");
    const statut = searchParams.get("statut");

    let query = supabase
      .from("v_retards")
      .select("*")
      .order("periode", { ascending: false })
      .order("nom_complet", { ascending: true });

    if (membreId) {
      query = query.eq("membre_id", membreId);
    }

    if (rubrique) {
      query = query.eq("rubrique", rubrique);
    }

    if (periode) {
      query = query.eq("periode", periode);
    }

    if (statut) {
      query = query.eq("statut", statut);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur GET /api/montants-attendus:", error);
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Erreur lors du chargement des retards.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error: any) {
    console.error("Erreur serveur GET /api/montants-attendus:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors du chargement des montants attendus.",
      },
      { status: 500 }
    );
  }
}
