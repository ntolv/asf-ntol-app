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

export async function GET(request: NextRequest) {
  try {
    const cycleId =
      request.nextUrl.searchParams.get("cycle_id");

    if (!cycleId) {
      return NextResponse.json(
        {
          success: false,
          error: "cycle_id obligatoire.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ========================================================
    // CYCLE
    // ========================================================

    const {
      data: cycle,
      error: cycleError,
    } = await supabase
      .from("v_tontine_cycles_catalogue")
      .select("*")
      .eq("cycle_id", cycleId)
      .maybeSingle();

    if (cycleError) {
      throw cycleError;
    }

    if (!cycle) {
      return NextResponse.json(
        {
          success: false,
          error: "Cycle Tontine introuvable.",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // SESSIONS DU CYCLE
    // ========================================================

    const {
      data: sessions,
      error: sessionsError,
    } = await supabase
      .from("v_tontine_page_sessions")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("ordre_session", { ascending: true });

    if (sessionsError) {
      throw sessionsError;
    }

    // ========================================================
    // RESULTATS LOTS
    // ========================================================

    const {
      data: lots,
      error: lotsError,
    } = await supabase
      .from("v_tontine_resultats_lots")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("periode_reference", { ascending: true })
      .order("numero_lot", { ascending: true });

    if (lotsError) {
      throw lotsError;
    }

    // ========================================================
    // RESULTATS MEMBRES / CYCLE
    // ========================================================

    const {
      data: membres,
      error: membresError,
    } = await supabase
      .from("v_tontine_resultats_membres_cycles")
      .select("*")
      .eq("cycle_id", cycleId);

    if (membresError) {
      throw membresError;
    }

    // ========================================================
    // SUIVI STRUCTUREL DU CYCLE
    // ========================================================

    const {
      data: suivi,
      error: suiviError,
    } = await supabase
      .from("tontine_cycle_suivi")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("ordre_mois", { ascending: true });

    if (suiviError) {
      throw suiviError;
    }

    return NextResponse.json(
      {
        success: true,
        cycle,
        sessions: sessions ?? [],
        lots: lots ?? [],
        membres: membres ?? [],
        suivi: suivi ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Impossible de charger le suivi du cycle.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}