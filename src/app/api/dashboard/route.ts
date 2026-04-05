import { NextResponse } from "next/server";
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

function getPeriodeCourante() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

    if (!userContext?.membreId) {
      return NextResponse.json(
        {
          success: false,
          message:
            userContext?.message ||
            "Membre introuvable pour l'utilisateur connecté.",
        },
        { status: 403 }
      );
    }

    const supabase = getAdminSupabase();
    const periodeCourante = getPeriodeCourante();
    const membreId = userContext.membreId;

    const [
      membreResult,
      bloc1Result,
      bloc2Result,
      bloc3Result,
      isAdminResult,
      contributionsResult,
      retardsResult,
      notificationsResult,
    ] = await Promise.all([
      supabase
        .from("v_membres")
        .select("nom_complet, email, telephone, statut_associatif, categorie")
        .eq("id", membreId)
        .maybeSingle(),

      supabase.rpc("fn_dashboard_bloc1_rubriques", {
        p_periode: periodeCourante,
      }),

      supabase.rpc("fn_dashboard_bloc2_membre_session", {
        p_periode: periodeCourante,
      }),

      supabase.rpc("fn_dashboard_bloc3_membre_situation", {
        p_periode: periodeCourante,
      }),

      supabase.rpc("fn_is_current_user_admin"),

      supabase
        .from("v_contributions")
        .select("*")
        .eq("membre_id", membreId)
        .order("periode", { ascending: false })
        .limit(5),

      supabase
        .from("v_retards")
        .select("*")
        .eq("membre_id", membreId)
        .order("periode", { ascending: false }),

      supabase
        .from("notifications")
        .select("id, titre, message, created_at, statut_notification")
        .eq("membre_id", membreId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (membreResult.error) throw membreResult.error;
    if (!membreResult.data) {
      return NextResponse.json(
        { success: false, message: "Membre non trouvé." },
        { status: 404 }
      );
    }

    if (bloc1Result.error) throw bloc1Result.error;
    if (bloc2Result.error) throw bloc2Result.error;
    if (bloc3Result.error) throw bloc3Result.error;
    if (isAdminResult.error) throw isAdminResult.error;
    if (contributionsResult.error) throw contributionsResult.error;
    if (retardsResult.error) throw retardsResult.error;
    if (notificationsResult.error) throw notificationsResult.error;

    return NextResponse.json({
      success: true,
      data: {
        periodeCourante,
        membre: membreResult.data,
        situationRubriques: bloc1Result.data ?? [],
        bloc2: (bloc2Result.data ?? [])[0] ?? null,
        bloc3: (bloc3Result.data ?? [])[0] ?? null,
        isCurrentUserAdmin: Boolean(isAdminResult.data),
        contributions: contributionsResult.data ?? [],
        retards: retardsResult.data ?? [],
        notifications: notificationsResult.data ?? [],
      },
    });
  } catch (error: any) {
    console.error("Erreur GET /api/dashboard:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Erreur serveur lors du chargement du dashboard.",
      },
      { status: 500 }
    );
  }
}
