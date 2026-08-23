import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/server/supabaseServer";
import { getUserContext } from "@/lib/server/getUserContext";

export async function POST(req: Request) {
  try {
    const supabaseAuth =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié." },
        { status: 401 }
      );
    }

    const context =
      await getUserContext(user);

    if (!context?.success || !context.membreId) {
      return NextResponse.json(
        {
          error:
            context?.message ||
            "Contexte utilisateur introuvable.",
        },
        { status: 401 }
      );
    }

    const { session_id } =
      await req.json();

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id requis" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: sessionCheck,
      error: sessionCheckError,
    } = await supabase
      .from("tontine_sessions")
      .select("id, statut_session")
      .eq("id", session_id)
      .single();

    if (
      sessionCheckError ||
      !sessionCheck
    ) {
      return NextResponse.json(
        {
          error:
            sessionCheckError?.message ||
            "Session introuvable",
        },
        { status: 404 }
      );
    }

    if (
      sessionCheck.statut_session ===
      "CLOTUREE"
    ) {
      return NextResponse.json(
        {
          error:
            "Session déjà clôturée",
        },
        { status: 400 }
      );
    }

    /*
     * La fonction PostgreSQL contrôle elle-même
     * l'expiration réelle du chrono avant toute
     * attribution ou tout décaissement.
     */
    const { data, error } =
      await supabase.rpc(
        "fn_tontine_close_session_global",
        {
          p_session_id: session_id,
        }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      data ?? { success: true }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message ||
          "Erreur serveur",
      },
      { status: 500 }
    );
  }
}