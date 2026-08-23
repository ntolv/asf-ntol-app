import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type CorrectionBody = {
  ligne_id?: string;

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

  confirmer_doublon?: boolean;
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

function nullableString(
  value: unknown
) {
  const text =
    String(
      value ?? ""
    ).trim();

  return text ||
    null;
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
            "Vous n'êtes pas autorisé à corriger un encaissement.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as CorrectionBody;

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
            "Le motif de la correction est obligatoire.",
        },
        {
          status: 400,
        }
      );
    }

    let nouveauMontant:
      | number
      | null =
      null;

    if (
      body.nouveau_montant !==
        undefined &&
      body.nouveau_montant !==
        null &&
      String(
        body.nouveau_montant
      ).trim() !== ""
    ) {
      nouveauMontant =
        Number(
          body.nouveau_montant
        );

      if (
        !Number.isFinite(
          nouveauMontant
        ) ||
        nouveauMontant <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Le montant corrigé doit être supérieur à zéro.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "fn_contribution_corriger_ligne",
        {
          p_ligne_id:
            ligneId,

          p_motif:
            motif,

          p_nouveau_montant:
            nouveauMontant,

          p_nouvelle_rubrique_id:
            nullableString(
              body.nouvelle_rubrique_id
            ),

          p_nouveau_membre_id:
            nullableString(
              body.nouveau_membre_id
            ),

          p_confirmer_doublon:
            body
              ?.confirmer_doublon ===
            true,
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
            confirmation_required?: boolean;
            code?: string;
            message?: string;
            nombre_encaissements_existants?: number;
            montant_deja_encaisse?: number;
            membre_id?: string;
            rubrique_id?: string;
            periode_reference?: string;
          }
        | null;

    if (
      result
        ?.confirmation_required ===
      true
    ) {
      return NextResponse.json(
        result,
        {
          status: 409,
        }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
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
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors de la correction de l'encaissement.",
      },
      {
        status: 500,
      }
    );
  }
}
