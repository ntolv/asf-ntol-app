import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isBureauRole(
  role:
    | {
        code?: string | null;
        libelle?: string | null;
      }
    | null
    | undefined
) {
  const raw = normalizeText(
    `${role?.code ?? ""} ${role?.libelle ?? ""}`
  );

  return (
    raw.includes("admin") ||
    raw.includes("president") ||
    raw.includes("tresorier")
  );
}

function attachMembres<
  T extends {
    membre_id?: string | null;
  }
>(
  rows: T[],
  membresMap: Map<string, any>
) {
  return rows.map((row) => ({
    ...row,

    membres: row.membre_id
      ? membresMap.get(String(row.membre_id)) ?? null
      : null,
  }));
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message:
            userError?.message ||
            "Utilisateur non authentifié.",

          data: {
            aides: [],
            prets: [],
            is_bureau: false,
            scope: "MOI",
          },
        },
        { status: 401 }
      );
    }

    const context = await getUserContext(user);

    if (!context?.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            context?.message ||
            "Contexte utilisateur introuvable.",

          data: {
            aides: [],
            prets: [],
            is_bureau: false,
            scope: "MOI",
          },
        },
        { status: 401 }
      );
    }

    const bureau = isBureauRole(context.role);

    /*
     * Pour un utilisateur hors Bureau,
     * l'identifiant membre est indispensable :
     * il sert au filtrage serveur.
     */
    if (!bureau && !context.membreId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucun membre n'est associé à cet utilisateur.",

          data: {
            aides: [],
            prets: [],
            is_bureau: false,
            scope: "MOI",
          },
        },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * ========================================================
     * AIDES
     *
     * Bureau  => toutes
     * Membre  => seulement membre_id = membre connecté
     * ========================================================
     */

    let aidesQuery = supabaseAdmin
      .from("demandes_aides")
      .select("*");

    if (!bureau) {
      aidesQuery = aidesQuery.eq(
        "membre_id",
        context.membreId
      );
    }

    const {
      data: aides,
      error: aidesError,
    } = await aidesQuery.order(
      "created_at",
      { ascending: false }
    );

    if (aidesError) {
      throw aidesError;
    }

    /*
     * ========================================================
     * PRETS
     *
     * Bureau  => tous
     * Membre  => seulement membre_id = membre connecté
     * ========================================================
     */

    let pretsQuery = supabaseAdmin
      .from("demandes_prets")
      .select("*");

    if (!bureau) {
      pretsQuery = pretsQuery.eq(
        "membre_id",
        context.membreId
      );
    }

    const {
      data: prets,
      error: pretsError,
    } = await pretsQuery.order(
      "created_at",
      { ascending: false }
    );

    if (pretsError) {
      throw pretsError;
    }

    /*
     * ========================================================
     * INFORMATIONS MEMBRES
     * ========================================================
     */

    const membreIds = Array.from(
      new Set(
        [
          ...(aides ?? []),
          ...(prets ?? []),
        ]
          .map(
            (item: any) =>
              item?.membre_id
          )
          .filter(
            (value: any) =>
              !!value
          )
          .map(
            (value: any) =>
              String(value)
          )
      )
    );

    let membresMap =
      new Map<string, any>();

    if (membreIds.length > 0) {
      const {
        data: membres,
        error: membresError,
      } = await supabaseAdmin
        .from("membres")
        .select(
          "id, nom_complet, numero_membre, telephone, email"
        )
        .in("id", membreIds);

      if (membresError) {
        throw membresError;
      }

      membresMap = new Map(
        (membres ?? []).map(
          (membre: any) => [
            String(membre.id),
            membre,
          ]
        )
      );
    }

    return NextResponse.json(
      {
        success: true,

        message: bureau
          ? "Suivi global des prêts et aides chargé."
          : "Votre suivi des prêts et aides est chargé.",

        data: {
          aides: attachMembres(
            aides ?? [],
            membresMap
          ),

          prets: attachMembres(
            prets ?? [],
            membresMap
          ),

          is_bureau: bureau,

          scope: bureau
            ? "TOUS"
            : "MOI",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur API prêts / aides :",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Erreur lors du chargement des demandes prêts / aides.",

        data: {
          aides: [],
          prets: [],
          is_bureau: false,
          scope: "MOI",
        },
      },
      { status: 500 }
    );
  }
}
