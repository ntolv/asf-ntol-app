import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body?.session_id;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "session_id obligatoire.",
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
    // VERIFIER QUE LA SESSION APPARTIENT AU CYCLE COURANT
    // ========================================================

    const {
      data: session,
      error: sessionError,
    } = await supabase
      .from("tontine_sessions")
      .select(
        "id, cycle_id, statut_session, statut_encheres, periode_reference"
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

    // ========================================================
    // ACTIVATION METIER
    // ========================================================

    const { data, error } = await supabase.rpc(
      "fn_tontine_activer_session_planifiee",
      {
        p_session_id: sessionId,
      }
    );

    if (error) {
      throw error;
    }

    const result = Array.isArray(data)
      ? data[0]
      : data;

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            result?.message ??
            "Activation de session impossible.",
          message:
            result?.message ??
            "Activation de session impossible.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      result,
      {
        status: 200,
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
          "Activation de session impossible.",
      },
      { status: 500 }
    );
  }
}