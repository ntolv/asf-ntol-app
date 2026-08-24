import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type AnnulationBody = {
  decaissement_id?: string;
  motif?: string;
};

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

export async function POST(
  request: NextRequest
) {
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
            "Vous n'êtes pas autorisé à annuler un décaissement.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as AnnulationBody;

    const decaissementId =
      String(
        body?.decaissement_id ??
        ""
      ).trim();

    const motif =
      String(
        body?.motif ??
        ""
      ).trim();

    if (!decaissementId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le décaissement est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (!motif) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le motif de l'annulation est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getAdminSupabase();

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "fn_decaissement_annuler",
        {
          p_decaissement_id:
            decaissementId,

          p_motif:
            motif,

          p_auteur_auth_user_id:
            user.id,

          p_auteur_membre_id:
            context.membreId,

          p_auteur_role_code:
            context.role?.code ?? "",
        }
      );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Annulation impossible.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      data as
        | {
            success?: boolean;
            message?: string;
            code?: string;
            origine?: string;
            decaissement_id?: string;
          }
        | null;

    if (!result?.success) {
      return NextResponse.json(
        result ?? {
          success: false,
          message:
            "Annulation impossible.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      result,
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "Erreur POST /api/decaissements/annuler:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors de l'annulation du décaissement.",
      },
      {
        status: 500,
      }
    );
  }
}