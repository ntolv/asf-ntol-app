import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/server/supabaseAdmin";
import { getUserContext } from "@/lib/server/getUserContext";

const PAGE_SIZE = 50;

function isAuthorizedRole(
  roleCode: string | null | undefined
) {
  const code = String(roleCode ?? "")
    .trim()
    .toUpperCase();

  return [
    "ADMIN",
    "PRESIDENT",
    "TRESORIER",
  ].includes(code);
}

function cleanText(
  value: string | null,
  maxLength = 120
) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function cleanLikeText(
  value: string | null,
  maxLength = 120
) {
  return cleanText(value, maxLength)
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePositiveInteger(
  value: string | null,
  fallback: number
) {
  const parsed = Number.parseInt(
    String(value ?? ""),
    10
  );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * --------------------------------------------------------
     * AUTHENTIFICATION
     * --------------------------------------------------------
     */
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

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
            "Accès réservé au Président, au Trésorier et à l’Administrateur.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * PARAMETRES
     * --------------------------------------------------------
     */
    const searchParams =
      request.nextUrl.searchParams;

    const page =
      parsePositiveInteger(
        searchParams.get("page"),
        1
      );

    const anneeRaw =
      cleanText(
        searchParams.get("annee"),
        4
      );

    const moisRaw =
      cleanText(
        searchParams.get("mois"),
        2
      );

    const categorie =
      cleanText(
        searchParams.get("categorie"),
        50
      ).toUpperCase();

    const module =
      cleanText(
        searchParams.get("module"),
        80
      ).toUpperCase();

    const action =
      cleanText(
        searchParams.get("action"),
        80
      ).toUpperCase();

    const typeMouvement =
      cleanLikeText(
        searchParams.get("type_mouvement"),
        100
      );

    const auteur =
      cleanLikeText(
        searchParams.get("auteur"),
        120
      );

    const membre =
      cleanLikeText(
        searchParams.get("membre"),
        120
      );

    const rubrique =
      cleanLikeText(
        searchParams.get("rubrique"),
        120
      );

    const recherche =
      cleanLikeText(
        searchParams.get("q"),
        150
      );

    const annee =
      /^\d{4}$/.test(anneeRaw)
        ? Number(anneeRaw)
        : null;

    const moisNombre =
      /^\d{1,2}$/.test(moisRaw)
        ? Number(moisRaw)
        : null;

    const mois =
      moisNombre &&
      moisNombre >= 1 &&
      moisNombre <= 12
        ? moisNombre
        : null;

    /*
     * --------------------------------------------------------
     * REQUETE
     * --------------------------------------------------------
     */
    const admin =
      createSupabaseAdminClient();

    let query = admin
      .from("v_journal_general")
      .select("*", {
        count: "exact",
      })
      .order(
        "date_evenement",
        {
          ascending: false,
        }
      );

    if (annee !== null) {
      query =
        query.eq(
          "annee",
          annee
        );
    }

    if (mois !== null) {
      query =
        query.eq(
          "mois",
          mois
        );
    }

    if (categorie) {
      query =
        query.eq(
          "categorie",
          categorie
        );
    }

    if (module) {
      query =
        query.eq(
          "module",
          module
        );
    }

    if (action) {
      query =
        query.eq(
          "action",
          action
        );
    }

    if (typeMouvement) {
      query =
        query.ilike(
          "type_mouvement",
          `%${typeMouvement}%`
        );
    }

    if (auteur) {
      query =
        query.ilike(
          "auteur_nom",
          `%${auteur}%`
        );
    }

    if (membre) {
      query =
        query.ilike(
          "membre_nom",
          `%${membre}%`
        );
    }

    if (rubrique) {
      query =
        query.ilike(
          "rubrique_nom",
          `%${rubrique}%`
        );
    }

    if (recherche) {
      const pattern =
        `%${recherche}%`;

      query =
        query.or(
          [
            `membre_nom.ilike.${pattern}`,
            `membre_nom_avant.ilike.${pattern}`,
            `membre_nom_apres.ilike.${pattern}`,
            `rubrique_nom.ilike.${pattern}`,
            `rubrique_nom_avant.ilike.${pattern}`,
            `rubrique_nom_apres.ilike.${pattern}`,
            `auteur_nom.ilike.${pattern}`,
            `motif.ilike.${pattern}`,
            `reference.ilike.${pattern}`,
            `type_mouvement.ilike.${pattern}`,
            `action.ilike.${pattern}`,
            `module.ilike.${pattern}`,
          ].join(",")
        );
    }

    /*
     * --------------------------------------------------------
     * PAGINATION
     * --------------------------------------------------------
     */
    const from =
      (page - 1) *
      PAGE_SIZE;

    const to =
      from +
      PAGE_SIZE -
      1;

    const {
      data,
      error,
      count,
    } =
      await query.range(
        from,
        to
      );

    if (error) {
      throw error;
    }

    const total =
      Number(count ?? 0);

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total /
          PAGE_SIZE
        )
      );

    return NextResponse.json(
      {
        success: true,

        data:
          data ?? [],

        pagination: {
          page,
          page_size:
            PAGE_SIZE,
          total,
          total_pages:
            totalPages,
        },

        permissions: {
          can_view:
            true,
        },

        role_code:
          context.role?.code ??
          null,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "[ADMIN AUDIT] GET:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors du chargement du Journal général.",
      },
      {
        status: 500,
      }
    );
  }
}
