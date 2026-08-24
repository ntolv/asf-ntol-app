import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
  request: NextRequest
) {
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
    // 2. CONTEXTE UTILISATEUR
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
    // 3. AUTORISATION BUREAU
    // ========================================================

    if (
      !isAuthorizedRole(
        context.role?.code
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vous n'êtes pas autorisé à consulter les décaissements.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // 4. LECTURE DES DECAISSEMENTS
    // ========================================================

    const supabase =
      getAdminSupabase();

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const caisseId =
      searchParams.get(
        "caisse_id"
      );

    const rubriqueId =
      searchParams.get(
        "rubrique_id"
      );

    const membreId =
      searchParams.get(
        "membre_id"
      );

    const anneeParam =
      searchParams.get(
        "annee"
      );

    const moisParam =
      searchParams.get(
        "mois"
      );

    const limitParam =
      searchParams.get(
        "limit"
      );

    const annee =
      anneeParam
        ? Number(anneeParam)
        : null;

    const mois =
      moisParam
        ? Number(moisParam)
        : null;

    if (
      anneeParam &&
      (
        !Number.isInteger(annee) ||
        Number(annee) < 2000 ||
        Number(annee) > 2100
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Année invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      moisParam &&
      (
        !Number.isInteger(mois) ||
        Number(mois) < 1 ||
        Number(mois) > 12
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Mois invalide.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      moisParam &&
      !anneeParam
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Une année doit être sélectionnée avec le mois.",
        },
        {
          status: 400,
        }
      );
    }

    let query =
      supabase
        .from("v_decaissements")
        .select("*")
        .order(
          "date_decaissement",
          { ascending: false }
        );

    if (caisseId) {
      query =
        query.eq(
          "caisse_id",
          caisseId
        );
    }

    if (rubriqueId) {
      query =
        query.eq(
          "rubrique_id",
          rubriqueId
        );
    }

    if (membreId) {
      query =
        query.eq(
          "membre_id",
          membreId
        );
    }

    if (annee) {
      const debut =
        mois
          ? new Date(
              Date.UTC(
                annee,
                mois - 1,
                1
              )
            )
          : new Date(
              Date.UTC(
                annee,
                0,
                1
              )
            );

      const fin =
        mois
          ? new Date(
              Date.UTC(
                annee,
                mois,
                1
              )
            )
          : new Date(
              Date.UTC(
                annee + 1,
                0,
                1
              )
            );

      query =
        query
          .gte(
            "date_decaissement",
            debut.toISOString()
          )
          .lt(
            "date_decaissement",
            fin.toISOString()
          );
    }

    if (limitParam) {
      const parsedLimit =
        Number(
          limitParam
        );

      if (
        Number.isFinite(
          parsedLimit
        ) &&
        parsedLimit > 0
      ) {
        query =
          query.limit(
            parsedLimit
          );
      }
    }

    const {
      data,
      error,
    } =
      await query;

    if (error) {
      console.error(
        "Erreur GET /api/decaissements:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Erreur lors du chargement des décaissements.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: anneesRows,
      error: anneesError,
    } =
      await supabase
        .from("v_decaissements")
        .select(
          "date_decaissement"
        )
        .order(
          "date_decaissement",
          { ascending: false }
        );

    if (anneesError) {
      throw anneesError;
    }

    const annees =
      Array.from(
        new Set(
          (anneesRows ?? [])
            .map((row: any) => {
              const value =
                row?.date_decaissement;

              if (!value) {
                return null;
              }

              const date =
                new Date(value);

              if (
                Number.isNaN(
                  date.getTime()
                )
              ) {
                return null;
              }

              return String(
                date.getUTCFullYear()
              );
            })
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
        )
      ).sort(
        (a, b) =>
          Number(b) -
          Number(a)
      );

    return NextResponse.json({
      success: true,
      count: (data ?? []).length,
      annees,
      data: data ?? [],
    });
  } catch (error: any) {
    console.error(
      "Erreur serveur GET /api/decaissements:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors du chargement des décaissements.",
      },
      {
        status: 500,
      }
    );
  }
}