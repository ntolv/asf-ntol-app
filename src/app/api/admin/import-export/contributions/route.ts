import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";

type ImportBody = {
  year?: number;
  replace_existing?: boolean;
  rows?: unknown[];
  rubriques?: unknown[];
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: userError?.message || "Utilisateur non connecté",
        },
        { status: 401 }
      );
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
      "fn_is_current_user_admin"
    );

    if (adminCheckError) {
      throw adminCheckError;
    }

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "Accès réservé aux administrateurs",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ImportBody;

    const year = Number(body?.year);
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const rubriques = Array.isArray(body?.rubriques) ? body.rubriques : [];
    const replaceExisting = Boolean(body?.replace_existing);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        {
          success: false,
          message: "Année invalide",
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucun encaissement à importer",
        },
        { status: 400 }
      );
    }

    if (rubriques.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Aucune rubrique à importer",
        },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    const { data, error } = await adminClient.rpc(
      "fn_import_contributions_year",
      {
        p_year: year,
        p_rows: rows,
        p_rubriques: rubriques,
        p_replace_existing: replaceExisting,
      }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur pendant l'import des encaissements",
      },
      { status: 500 }
    );
  }
}