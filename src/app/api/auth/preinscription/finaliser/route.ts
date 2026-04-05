import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LookupRow = {
  nom_complet?: string | null;
  compte_active?: boolean | null;
  telephone?: string | null;
};

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

function normalizeMessage(error: any) {
  const message = String(error?.message || "");

  if (!message) {
    return "Erreur lors de la finalisation de la préinscription.";
  }

  if (message.toLowerCase().includes("already registered")) {
    return "Cet email est déjà utilisé. Connecte-toi directement ou utilise un autre email.";
  }

  return message;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const telephone =
      String(body?.telephone ?? "").trim() ||
      String(body?.telephoneReconnu ?? "").trim();

    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!telephone) {
      return NextResponse.json(
        { success: false, message: "Téléphone obligatoire." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email obligatoire." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

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
        {
          success: false,
          code: "PHONE_NOT_FOUND",
          message: "Numéro non reconnu. Veuillez contacter l'administrateur.",
        },
        { status: 404 }
      );
    }

    if (member.compte_active === true) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_ALREADY_ACTIVE",
          message: "Ce compte est déjà activé. Connecte-toi directement.",
        },
        { status: 409 }
      );
    }

    let authUserId: string | null = null;
    let authUserCreated = false;
    let authAlreadyExists = false;

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
      const createUserMessage = String(createUserResult.error.message || "").toLowerCase();

      if (
        createUserMessage.includes("already registered") ||
        createUserMessage.includes("already been registered") ||
        createUserMessage.includes("user already registered")
      ) {
        authAlreadyExists = true;
      } else {
        throw createUserResult.error;
      }
    } else {
      authUserCreated = true;
      authUserId = createUserResult.data.user?.id ?? null;
    }

    if (authAlreadyExists) {
      const listUsersResult = await supabase.auth.admin.listUsers();

      if (listUsersResult.error) {
        throw listUsersResult.error;
      }

      const existingUser = (listUsersResult.data.users || []).find(
        (u) => (u.email || "").toLowerCase() === email.toLowerCase()
      );

      authUserId = existingUser?.id ?? null;

      if (!authUserId) {
        return NextResponse.json(
          {
            success: false,
            message: "Utilisateur Auth existant introuvable pour finalisation.",
          },
          { status: 500 }
        );
      }
    }

    const finalisationRpc = await supabase.rpc("fn_finaliser_preinscription_admin", {
      p_telephone: telephone,
      p_email_connexion: email,
      p_auth_user_id: authUserId,
    });

    if (finalisationRpc.error) {
      throw finalisationRpc.error;
    }

    const finalisationRow = Array.isArray(finalisationRpc.data)
      ? finalisationRpc.data[0]
      : null;

    if (!finalisationRow?.success) {
      return NextResponse.json(
        {
          success: false,
          message: finalisationRow?.message || "La finalisation métier a échoué.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: authAlreadyExists
        ? "Le compte Auth existait déjà. La finalisation métier a été effectuée. Connecte-toi."
        : "Préinscription finalisée avec succès. Connecte-toi.",
      auth_user_created: authUserCreated,
      auth_user_already_exists: authAlreadyExists,
      auth_user_id: authUserId,
      finalisation: finalisationRow,
      redirect_to: "/login",
      email,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: normalizeMessage(error),
      },
      { status: 500 }
    );
  }
}