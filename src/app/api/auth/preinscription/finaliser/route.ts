import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type LookupRow = {
  nom_complet?: string | null;
  compte_active?: boolean | null;
  telephone?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const telephone = String(body?.telephone ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!telephone) {
      return NextResponse.json(
        { success: false, message: "Téléphone obligatoire" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email obligatoire" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1) Lookup membre préinscrit
    const { data: lookupData, error: lookupError } = await supabase.rpc(
      "fn_preinscription_lookup_telephone",
      { p_telephone: telephone }
    );

    if (lookupError) {
      throw lookupError;
    }

    const member = ((lookupData ?? []) as LookupRow[])[0] ?? null;

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Numéro non reconnu. Veuillez contacter l'administrateur." },
        { status: 404 }
      );
    }

    if (member.compte_active === true) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_ALREADY_ACTIVE",
          message: "Ce compte est déjà activé. Connecte-toi directement."
        },
        { status: 409 }
      );
    }

    // 2) Tenter de créer le compte Auth si nécessaire
    let authUserId: string | null = null;
    let userAlreadyExists = false;

    const createUserResult = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nom_complet: member.nom_complet ?? null,
        telephone: member.telephone ?? telephone,
      },
    });

    if (createUserResult.error) {
      const msg = String(createUserResult.error.message || "");

      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already been registered") ||
        msg.toLowerCase().includes("user already registered")
      ) {
        userAlreadyExists = true;
      } else {
        throw createUserResult.error;
      }
    } else {
      authUserId = createUserResult.data.user?.id ?? null;
    }

    // 3) Finalisation métier existante
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "fn_finaliser_preinscription",
      {
        p_telephone: telephone,
        p_email_connexion: email,
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    // 4) Réponse propre
    return NextResponse.json({
      success: true,
      message: userAlreadyExists
        ? "Compte déjà présent côté authentification. Finalisation métier effectuée. Connecte-toi."
        : "Préinscription finalisée avec succès. Connecte-toi.",
      auth_user_created: !userAlreadyExists,
      auth_user_id: authUserId,
      finalisation: rpcData ?? null,
      redirect_to: "/login",
      email,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Erreur lors de la finalisation de la préinscription",
      },
      { status: 500 }
    );
  }
}