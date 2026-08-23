import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type AnnulationBody = {
  ligne_id?: string;
  motif?: string;
};

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
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

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
            "Vous n'êtes pas autorisé à annuler un encaissement.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as AnnulationBody;

    const ligneId =
      String(
        body?.ligne_id ??
        ""
      ).trim();

    const motif =
      String(
        body?.motif ??
        ""
      ).trim();

    if (!ligneId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La ligne d'encaissement est obligatoire.",
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

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "fn_contribution_annuler_ligne",
        {
          p_ligne_id:
            ligneId,

          p_motif:
            motif,
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
            ligne_id?: string;
            contribution_id?: string;
            nouveau_montant_contribution?: number;
            statut_contribution?: string;
          }
        | null;

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
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
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors de l'annulation de l'encaissement.",
      },
      {
        status: 500,
      }
    );
  }
}
