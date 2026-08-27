import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = body?.session_id;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "session_id requis",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ========================================================
    // CYCLE APPLICATION COURANT
    // ========================================================

    const {
      data: cycleRows,
      error: cycleError,
    } = await supabase.rpc(
      "fn_tontine_get_cycle_application_courant"
    );

    if (cycleError) {
      throw cycleError;
    }

    const cycleCourant = Array.isArray(cycleRows)
      ? cycleRows[0]
      : cycleRows;

    if (!cycleCourant?.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Aucun cycle Tontine APPLICATION en cours.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // VERIFIER LA SESSION
    // ========================================================

    const {
      data: session,
      error: sessionError,
    } = await supabase
      .from("tontine_sessions")
      .select(
        "id, cycle_id, statut_session, periode_reference"
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Session introuvable.",
        },
        { status: 404 }
      );
    }

    if (session.cycle_id !== cycleCourant.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cette session n'appartient pas au cycle Tontine en cours.",
        },
        { status: 400 }
      );
    }

    if (
      session.statut_session === "TERMINEE" ||
      session.statut_session === "CLOTUREE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Session déjà clôturée.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // CLOTURE + RECALCUL DYNAMIQUE
    // ========================================================

    const { data, error } = await supabase.rpc(
      "fn_tontine_close_session_et_recalculer",
      {
        p_session_id: sessionId,
      }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json(
      data ?? {
        success: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Erreur serveur lors de la clôture.",
      },
      { status: 500 }
    );
  }
}