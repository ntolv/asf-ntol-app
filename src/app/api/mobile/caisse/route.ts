import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    supabaseUrl,
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
    // 1. AUTHENTIFICATION
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
    // 2. MEMBRE CONNECTE
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
            "Contexte membre introuvable.",
        },
        {
          status: 401,
        }
      );
    }

    const membreId =
      context.membreId;

    // ========================================================
    // 3. LECTURE SERVEUR LIMITEE AU MEMBRE CONNECTE
    // ========================================================

    const supabase =
      getAdminClient();

    const [
      caissesResult,
      contributionsResult,
      decaissementsResult,
    ] =
      await Promise.all([
        supabase
          .from("v_caisses")
          .select("*")
          .eq(
            "membre_id",
            membreId
          )
          .order(
            "rubrique",
            { ascending: true }
          ),

        supabase
          .from("v_contributions")
          .select("*")
          .eq(
            "membre_id",
            membreId
          )
          .order(
            "date_paiement",
            { ascending: false }
          )
          .limit(5),

        supabase
          .from("v_decaissements")
          .select("*")
          .eq(
            "membre_id",
            membreId
          )
          .order(
            "date_decaissement",
            { ascending: false }
          )
          .limit(5),
      ]);

    if (caissesResult.error) {
      throw caissesResult.error;
    }

    if (contributionsResult.error) {
      throw contributionsResult.error;
    }

    if (decaissementsResult.error) {
      throw decaissementsResult.error;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          caisses:
            caissesResult.data ?? [],

          contributions:
            contributionsResult.data ?? [],

          decaissements:
            decaissementsResult.data ?? [],
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "Erreur GET /api/mobile/caisse:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Impossible de charger la situation de caisse.",
      },
      {
        status: 500,
      }
    );
  }
}