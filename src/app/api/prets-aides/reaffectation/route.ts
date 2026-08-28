import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

type RoleInfo =
  | {
      code?: string | null;
      libelle?: string | null;
    }
  | null
  | undefined;

type VentilationItem = {
  rubrique_id?: string;
  montant?: number;
};

type Payload = {
  type_operation?: string;
  operation_id?: string;
  ventilation?: VentilationItem[];
  confirmer_deficit?: boolean;
  preview_only?: boolean;
  motif?: string;
};

function normalizeRole(
  role: RoleInfo
) {
  const code =
    String(
      role?.code ?? ""
    )
      .trim()
      .toUpperCase();

  if (
    [
      "ADMIN",
      "PRESIDENT",
      "TRESORIER",
    ].includes(code)
  ) {
    return code;
  }

  const raw =
    `${role?.code ?? ""} ${role?.libelle ?? ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  if (raw.includes("admin")) {
    return "ADMIN";
  }

  if (raw.includes("president")) {
    return "PRESIDENT";
  }

  if (raw.includes("tresorier")) {
    return "TRESORIER";
  }

  return null;
}

export async function POST(
  request: Request
) {
  try {
    // ========================================================
    // AUTHENTIFICATION
    // ========================================================

    const cookieStore =
      await cookies();

    const supabaseAuth =
      createServerClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(
                name
              )?.value;
            },
            set() {},
            remove() {},
          },
        }
      );

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message:
            userError?.message ||
            "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const context =
      await getUserContext(user);

    if (
      !context?.success ||
      !context.membreId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    const roleCode =
      normalizeRole(
        context.role
      );

    if (!roleCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Réaffectation réservée au Bureau.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // PAYLOAD
    // ========================================================

    const body =
      (await request.json()) as Payload;

    const typeOperation =
      String(
        body?.type_operation ?? ""
      )
        .trim()
        .toUpperCase();

    const operationId =
      String(
        body?.operation_id ?? ""
      ).trim();

    const ventilation =
      Array.isArray(
        body?.ventilation
      )
        ? body.ventilation
        : [];

    if (
      !["PRET", "AIDE"].includes(
        typeOperation
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "type_operation doit être PRET ou AIDE.",
        },
        { status: 400 }
      );
    }

    if (!operationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "operation_id obligatoire.",
        },
        { status: 400 }
      );
    }

    if (
      ventilation.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La ventilation doit contenir au moins une rubrique.",
        },
        { status: 400 }
      );
    }

    for (
      const ligne of ventilation
    ) {
      const rubriqueId =
        String(
          ligne?.rubrique_id ?? ""
        ).trim();

      const montant =
        Number(
          ligne?.montant ?? 0
        );

      if (!rubriqueId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Chaque ligne doit contenir une rubrique.",
          },
          { status: 400 }
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
              "Chaque montant de ventilation doit être strictement positif.",
          },
          { status: 400 }
        );
      }
    }

    // ========================================================
    // CLIENT ADMIN
    // ========================================================

    const supabaseAdmin =
      createClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    // ========================================================
    // PREVISUALISATION
    // ========================================================

    if (body.preview_only) {
      const fonction =
        typeOperation === "PRET"
          ? "fn_previsualiser_reaffectation_pret"
          : "fn_previsualiser_reaffectation_aide";

      const args =
        typeOperation === "PRET"
          ? {
              p_pret_id:
                operationId,

              p_ventilation:
                ventilation,
            }
          : {
              p_aide_id:
                operationId,

              p_ventilation:
                ventilation,
            };

      const {
        data,
        error,
      } =
        await supabaseAdmin.rpc(
          fonction,
          args
        );

      if (error) {
        return NextResponse.json(
          {
            success: false,
            message:
              error.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }

    // ========================================================
    // VALIDATION / REAFFECTATION
    // ========================================================

    const fonction =
      typeOperation === "PRET"
        ? "fn_reaffecter_financement_pret"
        : "fn_reaffecter_financement_aide";

    const commonArgs = {
      p_ventilation:
        ventilation,

      p_confirmer_deficit:
        Boolean(
          body.confirmer_deficit
        ),

      p_motif:
        String(
          body.motif ??
          "Réaffectation depuis Suivi prêts et aides"
        ).trim(),

      p_auteur_auth_user_id:
        context.authUserId ??
        user.id,

      p_auteur_membre_id:
        context.membreId,

      p_auteur_role_code:
        roleCode,
    };

    const args =
      typeOperation === "PRET"
        ? {
            p_pret_id:
              operationId,

            ...commonArgs,
          }
        : {
            p_aide_id:
              operationId,

            ...commonArgs,
          };

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        fonction,
        args
      );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error.message,
        },
        { status: 400 }
      );
    }

    const result =
      data &&
      typeof data === "object"
        ? data
        : {
            success: true,
            data,
          };

    if (
      (result as any)
        ?.confirmation_deficit_requise
    ) {
      return NextResponse.json(
        result,
        { status: 409 }
      );
    }

    return NextResponse.json(
      result
    );
  } catch (error: any) {
    console.error(
      "Erreur POST /api/prets-aides/reaffectation :",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors de la réaffectation.",
      },
      { status: 500 }
    );
  }
}
