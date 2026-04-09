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

    const caisseId = searchParams.get("caisse_id");
    const rubriqueId = searchParams.get("rubrique_id");
    const membreId = searchParams.get("membre_id");
    const limitParam = searchParams.get("limit");

    let query = supabase
      .from("v_decaissements")
      .select("*")
      .order("date_decaissement", { ascending: false });

    if (caisseId) {
      query = query.eq("caisse_id", caisseId);
    }

    if (rubriqueId) {
      query = query.eq("rubrique_id", rubriqueId);
    }

    if (membreId) {
      query = query.eq("membre_id", membreId);
    }

    if (limitParam) {
      const parsedLimit = Number(limitParam);
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        query = query.limit(parsedLimit);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur GET /api/decaissements:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error.message || "Erreur lors du chargement des décaissements.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error: any) {
    console.error("Erreur serveur GET /api/decaissements:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors du chargement des décaissements.",
      },
      { status: 500 }
    );
  }
}
