import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type CorrectionBody = {
  decaissement_id?: string;
  motif?: string;

  nouveau_montant?:
    | number
    | string
    | null;

  nouvelle_rubrique_id?:
    | string
    | null;

  nouveau_membre_id?:
    | string
    | null;

  nouvelle_date?:
    | string
    | null;

  nouveau_motif_operation?:
    | string
    | null;
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

function nullableString(
  value: unknown
) {
  const text =
    String(
      value ?? ""
    ).trim();

  return text || null;
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
            "Vous n'êtes pas autorisé à corriger un décaissement.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as CorrectionBody;

    const decaissementId =
      String(
        body?.decaissement_id ??
        ""
      ).trim();

    const motifCorrection =
      String(
        body?.motif ??
        ""
      ).trim();

    const rubriqueId =
      String(
        body?.nouvelle_rubrique_id ??
        ""
      ).trim();

    const dateDecaissement =
      String(
        body?.nouvelle_date ??
        ""
      ).trim();

    const motifOperation =
      String(
        body?.nouveau_motif_operation ??
        ""
      ).trim();

    const montant =
      Number(
        body?.nouveau_montant
      );

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

    if (!motifCorrection) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le motif de la correction est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(montant) ||
      montant <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le montant doit être supérieur à zéro.",
        },
        {
          status: 400,
        }
      );
    }

    if (!rubriqueId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La rubrique est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        dateDecaissement
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La date du décaissement est invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (!motifOperation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Le motif du décaissement est obligatoire.",
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
        "fn_decaissement_corriger",
        {
          p_decaissement_id:
            decaissementId,

          p_motif:
            motifCorrection,

          p_nouveau_montant:
            montant,

          p_nouvelle_rubrique_id:
            rubriqueId,

          p_nouveau_membre_id:
            nullableString(
              body?.nouveau_membre_id
            ),

          p_nouvelle_date:
            dateDecaissement,

          p_nouveau_motif_operation:
            motifOperation,

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
            "Correction impossible.",
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
            "Correction impossible.",
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
      "Erreur POST /api/decaissements/corriger:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors de la correction du décaissement.",
      },
      {
        status: 500,
      }
    );
  }
}