import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("v_caisses_soldes")
      .select("*")
      .order("rubrique_nom", { ascending: true });

    if (error) {
      console.error("Erreur GET /api/caisses:", error);
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Erreur lors du chargement des caisses.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error: any) {
    console.error("Erreur serveur GET /api/caisses:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Erreur serveur lors du chargement des caisses.",
      },
      { status: 500 }
    );
  }
}
