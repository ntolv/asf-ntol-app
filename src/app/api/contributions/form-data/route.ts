import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

type MembreRow = {
  id: string;
  nom_complet: string | null;
  nom: string | null;
  prenom: string | null;
};

type RubriqueRow = {
  id: string;
  nom: string;
  actif: boolean | null;
};

function isBureauRole(
  role: { code?: string | null; libelle?: string | null } | null | undefined
) {
  const raw =
    `${role?.code ?? ""} ${role?.libelle ?? ""}`.toLowerCase();

  return (
    raw.includes("admin") ||
    raw.includes("président") ||
    raw.includes("president") ||
    raw.includes("trésorier") ||
    raw.includes("tresorier")
  );
}

function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function GET() {
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

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message:
            authError?.message ||
            "Utilisateur non authentifié.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // 2. CONTEXTE ASF-NTOL
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
    //
    // Le formulaire sert à créer des encaissements.
    // ========================================================

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Accès refusé. Encaissements réservés au Bureau.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // 4. DONNEES DU FORMULAIRE
    // ========================================================

    const supabase =
      getAdminClient();

    const [
      membresResult,
      rubriquesResult,
    ] =
      await Promise.all([
        supabase
          .from("membres")
          .select(
            "id, nom_complet, nom, prenom"
          )
          .order(
            "nom_complet",
            { ascending: true }
          ),

        supabase
          .from("rubriques")
          .select(
            "id, nom, actif"
          )
          .eq(
            "actif",
            true
          )
          .order(
            "nom",
            { ascending: true }
          ),
      ]);

    if (membresResult.error) {
      throw membresResult.error;
    }

    if (rubriquesResult.error) {
      throw rubriquesResult.error;
    }

    const membres =
      (
        (membresResult.data ?? []) as MembreRow[]
      ).map((membre) => ({
        id: membre.id,
        nom_complet:
          membre.nom_complet?.trim() ||
          `${membre.nom ?? ""} ${membre.prenom ?? ""}`.trim() ||
          "Membre sans nom",
      }));

    const rubriques =
      (
        (rubriquesResult.data ?? []) as RubriqueRow[]
      ).map((rubrique) => ({
        id: rubrique.id,
        nom: rubrique.nom,
      }));

    return NextResponse.json({
      success: true,
      membres,
      rubriques,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Impossible de charger les données du formulaire de contribution",
      },
      {
        status: 500,
      }
    );
  }
}