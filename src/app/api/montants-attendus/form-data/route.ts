import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getUserContext } from "@/lib/server/getUserContext";

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

export async function GET(request: NextRequest) {
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

    const supabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);

    const membreId = searchParams.get("membre_id") || "";
    const periodeReference = getCurrentPeriod();

    const { data: membres, error: membresError } = await supabase
      .from("v_membres")
      .select("id, nom_complet")
      .order("nom_complet", { ascending: true });

    if (membresError) {
      return NextResponse.json(
        { success: false, message: membresError.message },
        { status: 500 }
      );
    }

    let lignes: any[] = [];

    if (membreId) {
      const { data, error } = await supabase.rpc("fn_montants_attendus_membre_get", {
        p_membre_id: membreId,
        p_periode_reference: periodeReference,
      });

      if (error) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 }
        );
      }

      lignes = data ?? [];
    }

    return NextResponse.json({
      success: true,
      data: {
        membres: membres ?? [],
        membre_id: membreId,
        periode_reference: periodeReference,
        lignes,
      },
    });
  } catch (error: any) {
    console.error("Erreur GET /api/montants-attendus/form-data:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors du chargement du paramétrage des montants attendus.",
      },
      { status: 500 }
    );
  }
}
