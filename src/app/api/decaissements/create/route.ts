import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getUserContext } from "@/lib/server/getUserContext";

function isBureauRole(
  role:
    | {
        code?: string | null;
        libelle?: string | null;
      }
    | null
    | undefined
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

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // ============================================================
    // AUTHENTIFICATION
    // ============================================================

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
        },
        { status: 401 }
      );
    }

    // ============================================================
    // CONTEXTE UTILISATEUR
    // ============================================================

    const context = await getUserContext(user);

    if (!context?.success) {
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

    // ============================================================
    // SECURITE METIER
    // Décaissement réservé au Bureau
    // ============================================================

    if (!isBureauRole(context.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Accès refusé. Le décaissement est réservé au Président, au Trésorier et à l'Administrateur.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // DONNEES DU FORMULAIRE
    // ============================================================

    const body = await request.json();

    const rubrique_id =
      String(body?.rubrique_id || "").trim();

    const montant =
      Number(body?.montant || 0);

    const motif =
      String(body?.motif || "").trim() || null;

    const membre_id =
      body?.membre_id
        ? String(body.membre_id).trim()
        : null;

    const date_decaissement =
      String(body?.date_decaissement || "").trim();

    // ============================================================
    // VALIDATIONS
    // ============================================================

    if (!rubrique_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Rubrique obligatoire.",
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
          message: "Montant invalide.",
        },
        { status: 400 }
      );
    }

    if (!date_decaissement) {
      return NextResponse.json(
        {
          success: false,
          message: "Date du décaissement obligatoire.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // CLIENT ADMIN SUPABASE
    // Créé seulement APRES les contrôles d'accès
    // ============================================================

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

    // ============================================================
    // REGLE METIER :
    // 1 RUBRIQUE = 1 CAISSE
    //
    // Le navigateur fournit uniquement rubrique_id.
    // La caisse est déterminée côté serveur.
    // ============================================================

    const {
      data: caisse,
      error: caisseError,
    } = await supabaseAdmin
      .from("caisses")
      .select("id, rubrique_id, libelle")
      .eq("rubrique_id", rubrique_id)
      .maybeSingle();

    if (caisseError) {
      throw caisseError;
    }

    if (!caisse?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Aucune caisse associée à la rubrique sélectionnée.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // INSERT DECAISSEMENT
    // ============================================================

    const {
      data: decaissement,
      error: decaissementError,
    } = await supabaseAdmin
      .from("decaissements")
      .insert({
        caisse_id: caisse.id,
        rubrique_id,
        membre_id,
        montant,
        motif,
        date_decaissement: `${date_decaissement}T00:00:00.000Z`,
        created_by: context.authUserId,
      })
      .select()
      .single();

    if (decaissementError) {
      throw decaissementError;
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Décaissement enregistré avec succès.",
        data: decaissement,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Erreur POST /api/decaissements/create :",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur lors de la création du décaissement.",
      },
      { status: 500 }
    );
  }
}