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
      "Variables Supabase service role manquantes."
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

function isAuthorizedRole(
  roleCode: string | null | undefined
) {
  const code =
    String(roleCode ?? "")
      .trim()
      .toUpperCase();

  return [
    "ADMIN",
    "PRESIDENT",
    "TRESORIER",
  ].includes(code);
}

export async function GET() {
  try {
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

    if (
      !isAuthorizedRole(
        context.role?.code
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cette page est réservée au Bureau.",
        },
        {
          status: 403,
        }
      );
    }

    const supabase =
      getAdminSupabase();

    const [
      membresResult,
      rubriquesResult,
    ] =
      await Promise.all([
        supabase
          .from("v_membres")
          .select(
            "id, nom_complet"
          )
          .order(
            "nom_complet",
            {
              ascending: true,
            }
          ),

        supabase
          .from("rubriques")
          .select(
            "id, nom"
          )
          .order(
            "nom",
            {
              ascending: true,
            }
          ),
      ]);

    if (
      membresResult.error
    ) {
      throw membresResult.error;
    }

    if (
      rubriquesResult.error
    ) {
      throw rubriquesResult.error;
    }

    return NextResponse.json(
      {
        success: true,

        membres:
          membresResult.data ??
          [],

        rubriques:
          rubriquesResult.data ??
          [],
      }
    );
  } catch (error: any) {
    console.error(
      "Erreur GET /api/decaissements/form-data:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors du chargement des filtres.",
      },
      {
        status: 500,
      }
    );
  }
}