import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

function getAdminSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function GET() {
  try {
    // ========================================================
    // 1. UTILISATEUR CONNECTE
    // ========================================================

    const supabaseAuth =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabaseAuth.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            authError?.message ||
            "Utilisateur non connecté.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 2. MEMBRE ASF-NTOL VALIDE
    // ========================================================

    const context =
      await getUserContext(user);

    if (
      !context?.success ||
      !context?.membreId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 3. CONSULTATION DES CAISSES
    //
    // Accessible à tout membre connecté.
    // Aucune restriction Bureau ici.
    // ========================================================

    const supabase =
      getAdminSupabase();

    const {
      data,
      error,
    } =
      await supabase
        .from("v_caisses_soldes")
        .select("*")
        .order(
          "rubrique_nom",
          { ascending: true }
        );

    if (error) {
      console.error(
        "Erreur GET /api/caisses:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Erreur lors du chargement des caisses.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error: any) {
    console.error(
      "Erreur serveur GET /api/caisses:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors du chargement des caisses.",
      },
      {
        status: 500,
      }
    );
  }
}