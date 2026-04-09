import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getUserContext } from "@/lib/server/getUserContext";

type SaveBody = {
  membre_id?: string;
  lignes?: Array<{
    rubrique_id?: string;
    montant_attendu?: number | string;
  }>;
};

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function POST(request: NextRequest) {
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

    if (userError) {
      return NextResponse.json(
        {
          success: false,
          message: userError.message || "Erreur récupération utilisateur.",
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const userContext = await getUserContext(user);

    if (!userContext?.authUserId) {
      return NextResponse.json(
        {
          success: false,
          message: userContext?.message || "Utilisateur non authentifié.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SaveBody;

    const membreId = body?.membre_id?.trim();
    const lignes = Array.isArray(body?.lignes) ? body.lignes : [];
    const periodeReference = getCurrentPeriod();

    if (!membreId) {
      return NextResponse.json(
        { success: false, message: "membre_id est obligatoire." },
        { status: 400 }
      );
    }

    if (lignes.length === 0) {
      return NextResponse.json(
        { success: false, message: "Aucune ligne à enregistrer." },
        { status: 400 }
      );
    }

    const payloadLignes = lignes.map((ligne) => ({
      rubrique_id: ligne?.rubrique_id ?? "",
      montant_attendu:
        typeof ligne?.montant_attendu === "string"
          ? Number(ligne.montant_attendu)
          : Number(ligne?.montant_attendu ?? 0),
    }));

    const supabase = getAdminSupabase();

    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      "fn_montants_attendus_membre_upsert",
      {
        p_membre_id: membreId,
        p_periode_reference: periodeReference,
        p_lignes: payloadLignes,
      }
    );

    if (upsertError) {
      return NextResponse.json(
        { success: false, message: upsertError.message },
        { status: 500 }
      );
    }

    const { error: syncError } = await supabase.rpc(
      "fn_sync_attendus_contributions_membre",
      {
        p_membre_id: membreId,
        p_periode: periodeReference,
      }
    );

    if (syncError) {
      return NextResponse.json(
        { success: false, message: syncError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Montants attendus enregistrés avec succès.",
      data: {
        upsertResult: upsertResult ?? null,
        periode_reference: periodeReference,
      },
    });
  } catch (error: any) {
    console.error("Erreur POST /api/montants-attendus/save:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors de l'enregistrement des montants attendus.",
      },
      { status: 500 }
    );
  }
}
